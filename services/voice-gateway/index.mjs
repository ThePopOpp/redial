import { createServer } from 'node:http';
import { readGatewayConfig, gatewaySummary } from './config.mjs';
import { createStore } from './store.mjs';
import { twilioSignatureIsValid, signedUrl, formParams } from './twilio-signature.mjs';
import { chooseDestination, planInbound, planAfterScreen, memberAccepted, outcomeFromDial, normalizeSpeech, isE164 } from './routing.mjs';
import * as twiml from './twiml.mjs';

const MAX_BODY_BYTES = 32_000;

// This process holds the Twilio auth token and the service-role key, and it
// handles caller speech. Nothing it prints may contain a credential or what a
// caller said, so entries are built from field names and outcomes.
const log = {
  info: f => process.stdout.write(`${JSON.stringify({ level: 'info', at: new Date().toISOString(), ...f })}\n`),
  warn: f => process.stdout.write(`${JSON.stringify({ level: 'warn', at: new Date().toISOString(), ...f })}\n`),
  error: f => process.stderr.write(`${JSON.stringify({ level: 'error', at: new Date().toISOString(), ...f })}\n`),
};

function xml(response, body) {
  response.writeHead(200, { 'content-type': 'text/xml; charset=utf-8', 'cache-control': 'no-store' });
  response.end(body);
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('body too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function createGateway({ config, store }) {
  const url = path => new URL(path, config.publicOrigin).toString();

  return createServer(async (request, response) => {
    if (request.method === 'GET' && request.url === '/health/live') {
      response.writeHead(200, { 'content-type': 'application/json' });
      return response.end(JSON.stringify({ status: 'live' }));
    }
    if (request.method !== 'POST') {
      response.writeHead(404, { 'content-type': 'application/json' });
      return response.end(JSON.stringify({ error: 'not found' }));
    }

    let params;
    try {
      params = formParams(await readBody(request));
    } catch {
      response.writeHead(413, { 'content-type': 'application/json' });
      return response.end(JSON.stringify({ error: 'payload too large' }));
    }

    // Before anything else, and before any parameter is used. An unsigned
    // request is not a call; it is someone who found the URL.
    const valid = twilioSignatureIsValid({
      authToken: config.twilio.authToken,
      url: signedUrl(config.publicOrigin, request.url),
      params,
      signature: request.headers['x-twilio-signature'] ?? '',
    });
    if (!valid) {
      log.warn({ event: 'webhook.signature_rejected', path: new URL(request.url, 'http://x.invalid').pathname });
      response.writeHead(403, { 'content-type': 'application/json' });
      return response.end(JSON.stringify({ error: 'signature rejected' }));
    }

    const path = new URL(request.url, 'http://x.invalid').pathname;
    try {
      return xml(response, await handle({ path, params, config, store, url, query: new URL(request.url, 'http://x.invalid').searchParams }));
    } catch (error) {
      // A caller is on the line. Say something deterministic rather than letting
      // the provider play its own error, and never surface the reason.
      log.error({ event: 'call.failed', path, reason: error.message });
      return xml(response, twiml.failed());
    }
  });
}

async function handle({ path, params, config, store, url, query }) {
  const callSid = params.CallSid ?? '';
  const from = params.From ?? '';
  const to = params.To ?? '';

  if (path === '/twilio/voice') {
    if (!isE164(from) || !isE164(to)) return twiml.unroutable();
    const line = await store.resolveLine(to);
    if (!line) { log.warn({ event: 'call.unroutable' }); return twiml.unroutable(); }

    const plan = planInbound({ routing: line.routing, screening: null });
    await store.startScreening({
      workspaceId: line.number.workspace_id, lineId: line.number.line_id,
      callSid, from, to, mode: line.routing?.mode ?? 'voicemail',
    });
    log.info({ event: 'call.received', action: plan.action, mode: line.routing?.mode ?? 'none' });

    if (plan.action === 'unroutable') return twiml.unroutable();
    if (plan.action === 'assistant') {
      return twiml.connectAssistant({ sipUri: plan.sipUri, actionUrl: url('/twilio/after-dial'), recording: line.routing.recording_enabled });
    }
    if (plan.action === 'message') {
      return twiml.takeMessage({ actionUrl: url('/twilio/message'), maxSeconds: line.routing?.max_screen_seconds ?? 120 });
    }
    return twiml.screen({ actionUrl: url('/twilio/screen'), greeting: line.routing.greeting, seconds: 10 });
  }

  if (path === '/twilio/screen') {
    const line = await store.resolveLine(to);
    if (!line) return twiml.unroutable();
    const said = normalizeSpeech(query.get('silent') === '1' ? '' : params.SpeechResult);
    const confidence = params.Confidence !== undefined ? Number(params.Confidence) : null;
    await store.recordSpeech({ callSid, said, confidence });

    const destination = chooseDestination({
      endpoints: line.endpoints, redialNumber: to, callerNumber: from,
      bridging: config.bridging, environment: config.environment,
    });
    const plan = planAfterScreen({ said, confidence, destination });
    log.info({ event: 'call.screened', action: plan.action, reason: plan.reason ?? null, heard: Boolean(said) });

    if (plan.action === 'message') {
      await store.settle({ callSid, outcome: 'screening' });
      return twiml.takeMessage({ actionUrl: url('/twilio/message'), maxSeconds: line.routing?.max_screen_seconds ?? 120 });
    }
    await store.settle({ callSid, outcome: 'offered', incrementTransfer: true });
    return twiml.offer({
      to: plan.endpoint.e164,
      // The Redial number, never the caller's. Presenting the caller's number
      // here would be spoofing, and the member could not tell a screened call
      // from a direct one.
      callerId: to,
      whisperUrl: url(`/twilio/whisper?sid=${encodeURIComponent(callSid)}`),
      actionUrl: url('/twilio/after-dial'),
      ringSeconds: line.routing?.ring_seconds ?? 20,
      recording: line.routing?.recording_enabled ?? false,
    });
  }

  // Played to the member only. Twilio calls this on the outbound leg, so From
  // and To here are the gateway's own legs, not the caller's.
  if (path === '/twilio/whisper') {
    const screening = await store.screening(query.get('sid') ?? '');
    return twiml.whisper({
      caller: screening?.from_e164 ?? 'an unknown number',
      said: screening?.caller_said ?? '',
    });
  }

  if (path === '/twilio/after-dial') {
    const accepted = params.DigitsMatched !== undefined ? memberAccepted(params.DigitsMatched) : undefined;
    const outcome = outcomeFromDial(params.DialCallStatus, accepted);
    await store.settle({ callSid, outcome });
    log.info({ event: 'call.settled', outcome });
    if (outcome === 'connected') return twiml.goodbye('');
    const line = await store.resolveLine(to);
    if (line?.routing?.voicemail_enabled === false) return twiml.goodbye();
    return twiml.takeMessage({ actionUrl: url('/twilio/message'), maxSeconds: 120 });
  }

  if (path === '/twilio/message') {
    await store.settle({ callSid, outcome: 'message' });
    log.info({ event: 'call.message_left' });
    return twiml.goodbye();
  }

  return twiml.unroutable();
}

async function main() {
  const config = readGatewayConfig();
  const store = createStore(config);
  const server = createGateway({ config, store });
  log.info({ event: 'gateway.starting', ...gatewaySummary(config) });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(config.port, '0.0.0.0', resolve); });
  log.info({ event: 'gateway.listening', port: config.port });

  let stopping = false;
  const stop = signal => {
    if (stopping) return;
    stopping = true;
    log.info({ event: 'gateway.stopping', signal });
    // Stop accepting new calls but let calls in flight finish their turn: a
    // caller mid-sentence should not hear the line drop.
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 15_000).unref();
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch(error => { log.error({ event: 'gateway.failed_to_start', reason: error.message }); process.exit(1); });
}

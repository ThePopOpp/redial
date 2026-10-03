import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { readGatewayConfig, gatewaySummary } from './config.mjs';
import { createStore } from './store.mjs';
import { twilioSignatureIsValid, signedUrl, formParams } from './twilio-signature.mjs';
import { chooseDestination, planInbound, planAfterScreen, memberAccepted, outcomeFromDial, normalizeSpeech, isE164 } from './routing.mjs';
import { decideTurn } from './assistant.mjs';
import * as twiml from './twiml.mjs';
import * as capture from './capture.mjs';
import { recordingRetentionDeadline, transcriptExpiry } from '../shared/retention.mjs';

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

    // Recording audio. Not a Twilio webhook, so it is handled before the
    // signature check and carries its own authentication.
    //
    // It lives here rather than in the web application because reaching the
    // media needs the Twilio account credentials, and those must not sit in a
    // browser-facing container. The web application proves the member's own
    // right to the row through row-level security, then asks this; this asks
    // the database again before a byte moves, because a grant revoked after
    // the page rendered still has to stop the transfer.
    if (new URL(request.url, 'http://x.invalid').pathname === '/media/recording') {
      return serveRecording({ request, response, config, store });
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

// Streams a recording to the web application, which pipes it to the member.
// Nothing is cached and nothing is written to disk: the audio passes through.
async function serveRecording({ request, response, config, store }) {
  const refuse = (status, error) => {
    response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ error }));
  };
  if (!config.mediaAccessSecret) return refuse(503, 'media access is not configured');

  // Constant time, so a wrong secret cannot be found a byte at a time.
  const presented = Buffer.from(String(request.headers.authorization ?? '').replace(/^Bearer /, ''));
  const expected = Buffer.from(config.mediaAccessSecret);
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
    log.warn({ event: 'media.rejected', reason: 'bad_secret' });
    return refuse(403, 'not permitted');
  }

  let body;
  try { body = JSON.parse(await readBody(request)); } catch { return refuse(400, 'malformed request'); }
  const { recordingId, userId } = body ?? {};
  if (!isUuid(recordingId) || !isUuid(userId)) return refuse(400, 'malformed request');

  // The authorization decision, made in SQL against the same predicate that
  // governs the row, so it cannot drift from the policy.
  let permitted = false;
  try { permitted = await store.mayReadRecording({ userId, recordingId }); }
  catch (error) { log.error({ event: 'media.check_failed', reason: error.message }); return refuse(503, 'unavailable'); }
  if (!permitted) {
    // Logged as a refusal. An audit wants this entry more than the successes.
    await store.logRecordingAccess({ userId, recordingId, outcome: 'refused' }).catch(() => {});
    log.warn({ event: 'media.rejected', reason: 'not_permitted' });
    return refuse(404, 'not found');
  }

  const reference = await store.recordingReference(recordingId);
  if (!reference || reference.provider !== 'twilio') return refuse(404, 'not found');

  const { accountSid, authToken } = config.twilio;
  const media = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${reference.provider_recording_sid}.mp3`,
    {
      headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}` },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!media.ok || !media.body) {
    // The row says the audio should be there. If the provider disagrees, that
    // is worth an operator's attention rather than a generic 404.
    log.error({ event: 'media.provider_refused', status: media.status });
    await store.logRecordingAccess({ userId, recordingId, outcome: 'expired' }).catch(() => {});
    return refuse(502, 'the recording could not be retrieved');
  }

  await store.logRecordingAccess({ userId, recordingId, outcome: 'served' }).catch(() => {});
  log.info({ event: 'media.served' });
  response.writeHead(200, {
    'content-type': 'audio/mpeg',
    'cache-control': 'no-store, private',
    ...(media.headers.get('content-length') ? { 'content-length': media.headers.get('content-length') } : {}),
  });
  await pipeline(Readable.fromWeb(media.body), response);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = value => UUID.test(String(value ?? ''));

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
      return twiml.connectAssistant({ sipUri: plan.sipUri, actionUrl: url('/twilio/after-dial'),
        recording: line.routing.recording_enabled, recordingStatusUrl: url('/twilio/recording-status') });
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
    const rulePlan = planAfterScreen({ said, confidence, destination });

    // The assistant runs on top of the rule-based plan, never instead of it.
    // Every refusal path inside decideTurn returns rulePlan unchanged, so a
    // missing credential, a slow model or an unparseable reply all land on the
    // behaviour this gateway had before the assistant existed.
    const turnsUsed = Math.max(0, Number(query.get('turn') ?? 0) || 0);
    // Defensive on purpose. The assistant is an enhancement layered on the
    // rule-based plan, so nothing about resolving it may be able to end a call:
    // a store without the method, an unreachable database or a slow lookup all
    // mean "no assistant", not "sorry, something went wrong".
    let profile = null;
    try {
      profile = await store.assistantProfile?.({ workspaceId: line.number.workspace_id, lineId: line.number.line_id }) ?? null;
    } catch { profile = null; }
    const plan = await decideTurn({
      profile, said, confidence, destination, fallback: rulePlan, turnsUsed, config,
    });
    log.info({ event: 'call.screened', action: plan.action, reason: plan.reason ?? null,
      heard: Boolean(said), turn: turnsUsed,
      assistant: plan.assistant?.used ?? false, assistantWhy: plan.assistant?.why ?? null });

    if (plan.action === 'ask_again') {
      // State lives in the URL, not in the gateway. A follow-up question is one
      // more Gather pointed at this same handler with the turn advanced, so
      // nothing has to be remembered between webhooks.
      return twiml.askAgain({ actionUrl: url(`/twilio/screen?turn=${turnsUsed + 1}`), say: plan.say });
    }

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
      recordingStatusUrl: url('/twilio/recording-status'),
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

  // Twilio tells us the audio exists and where it lives. Nothing is downloaded
  // here: the reference, the consent it was captured under and the deadline it
  // must be gone by are what make the recording accountable.
  if (path === '/twilio/recording-status') {
    const screening = await store.screening(callSid);
    if (!screening) { log.warn({ event: 'recording.unknown_call' }); return twiml.empty(); }
    const consentId = await store.activeConsent({
      workspaceId: screening.workspace_id, lineId: screening.line_id, purpose: 'call_recording',
    });
    const callId = await store.projectedCallId({ workspaceId: screening.workspace_id, callSid });
    const refusal = capture.recordingRefusal({ params, consentId, callId });
    if (refusal) {
      // Loud on purpose. The provider has audio and this side has no row for
      // it, which is the exact state the consent model exists to prevent. A
      // retry of this callback will find the projected call and succeed, so
      // 'call_not_logged' is expected briefly and still worth seeing.
      log[refusal === 'not_completed' ? 'info' : 'error']({
        event: 'recording.not_recorded', reason: refusal,
        recordingPresentAtProvider: refusal !== 'not_completed' && refusal !== 'bad_recording_sid',
      });
      return twiml.empty();
    }
    await store.saveRecording({
      workspace_id: screening.workspace_id, line_id: screening.line_id, call_id: callId,
      provider: 'twilio', provider_recording_sid: params.RecordingSid,
      duration_seconds: capture.recordingDuration(params),
      channels: capture.recordingChannels(params),
      consent_event_id: consentId,
      retention_deadline: recordingRetentionDeadline(new Date(),
        await store.retentionDays({ workspaceId: screening.workspace_id, lineId: screening.line_id })),
    });
    log.info({ event: 'recording.recorded', seconds: capture.recordingDuration(params) });
    return twiml.empty();
  }

  // A written record of the call. Refused on the same terms as the audio: a
  // transcript is what both parties said, not a lesser artefact.
  if (path === '/twilio/transcription') {
    const screening = await store.screening(callSid);
    if (!screening) { log.warn({ event: 'transcription.unknown_call' }); return twiml.empty(); }
    const consentId = await store.activeConsent({
      workspaceId: screening.workspace_id, lineId: screening.line_id, purpose: 'call_transcription',
    });
    const callId = await store.projectedCallId({ workspaceId: screening.workspace_id, callSid });
    const refusal = capture.transcriptionRefusal({ params, consentId, callId });
    if (refusal) {
      log.info({ event: 'transcription.not_stored', reason: refusal });
      return twiml.empty();
    }
    const expiresAt = transcriptExpiry(new Date(),
      await store.retentionDays({ workspaceId: screening.workspace_id, lineId: screening.line_id }));
    const stored = await store.saveTranscriptSegments(
      capture.transcriptSegmentsFrom({ text: params.TranscriptionText }).map((body, index) => ({
        workspace_id: screening.workspace_id, line_id: screening.line_id, call_id: callId,
        sequence: index,
        // Not speaker-separated. Twilio posts one body per recording, and
        // attributing turns we cannot distinguish would be invention.
        speaker: 'Call',
        body, expires_at: expiresAt, consent_event_id: consentId,
      })),
    );
    log.info({ event: 'transcription.stored', segments: stored });
    return twiml.empty();
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

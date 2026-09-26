import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { readGatewayConfig, gatewaySummary } from '../services/voice-gateway/config.mjs';
import { twilioSignatureIsValid, signedUrl, formParams } from '../services/voice-gateway/twilio-signature.mjs';
import { chooseDestination, planInbound, planAfterScreen, memberAccepted, outcomeFromDial, normalizeSpeech, isE164 } from '../services/voice-gateway/routing.mjs';
import { escapeXml, whisper, offer, screen } from '../services/voice-gateway/twiml.mjs';
import { createGateway } from '../services/voice-gateway/index.mjs';

const AUTH_TOKEN = '0123456789abcdef0123456789abcdef';
const ORIGIN = 'https://voice.redial.si';
const REDIAL_NUMBER = '+16025550100';
const CALLER = '+16025550111';
const MOBILE = '+16025550122';

function gatewayEnvironment(overrides = {}) {
  return {
    SUPABASE_URL: 'https://jjdqeojubmwvxjfcljpk.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_example_value_for_tests_only_0123',
    TWILIO_ACCOUNT_SID: `AC${'a'.repeat(32)}`,
    TWILIO_AUTH_TOKEN: AUTH_TOKEN,
    REDIAL_GATEWAY_ORIGIN: ORIGIN,
    ...overrides,
  };
}

function sign(url, params) {
  const payload = Object.keys(params).sort().reduce((acc, k) => acc + k + String(params[k] ?? ''), url);
  return createHmac('sha1', AUTH_TOKEN).update(Buffer.from(payload, 'utf8')).digest('base64');
}

const endpoint = (over = {}) => ({
  kind: 'pstn', e164: MOBILE, ring_order: 1, verified_at: '2026-09-26T00:00:00Z',
  revoked_at: null, is_forwarding_source: false, ...over,
});

// ---------------------------------------------------------------- config
test('a complete gateway environment defaults to the safe posture', () => {
  const config = readGatewayConfig(gatewayEnvironment());
  assert.equal(config.environment, 'test', 'a gateway must not go live by omission');
  assert.equal(config.bridging, 'disabled', 'connecting a caller to a handset is an explicit decision');
});

test('a publishable key is refused where the service-role key belongs', () => {
  assert.throws(() => readGatewayConfig(gatewayEnvironment({ SUPABASE_SERVICE_ROLE_KEY: 'sb_publishable_x_0123456789' })), /SUPABASE_SERVICE_ROLE_KEY/);
});

test('every credential and the signed origin are required', () => {
  for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'REDIAL_GATEWAY_ORIGIN']) {
    assert.throws(() => readGatewayConfig(gatewayEnvironment({ [name]: '' })), new RegExp(name), `${name} must be required`);
  }
  for (const bad of ['http://voice.redial.si', 'https://voice.redial.si/hook', 'https://voice.redial.si?x=1']) {
    assert.throws(() => readGatewayConfig(gatewayEnvironment({ REDIAL_GATEWAY_ORIGIN: bad })), /REDIAL_GATEWAY_ORIGIN/);
  }
});

test('the startup summary carries no credential', () => {
  const config = readGatewayConfig(gatewayEnvironment());
  const summary = JSON.stringify(gatewaySummary(config));
  for (const secret of [config.twilio.authToken, config.supabase.serviceRoleKey]) assert.ok(!summary.includes(secret));
  assert.match(summary, /"recordingDefault":"off"/);
});

// ------------------------------------------------------------- signature
test('a genuine Twilio signature verifies over url plus sorted parameters', () => {
  const url = `${ORIGIN}/twilio/voice`;
  const params = { CallSid: `CA${'a'.repeat(32)}`, From: CALLER, To: REDIAL_NUMBER };
  assert.equal(twilioSignatureIsValid({ authToken: AUTH_TOKEN, url, params, signature: sign(url, params) }), true);
});

test('changing any signed input invalidates the signature', () => {
  const url = `${ORIGIN}/twilio/voice`;
  const params = { From: CALLER, To: REDIAL_NUMBER };
  const signature = sign(url, params);
  assert.equal(twilioSignatureIsValid({ authToken: AUTH_TOKEN, url: `${ORIGIN}/twilio/screen`, params, signature }), false);
  assert.equal(twilioSignatureIsValid({ authToken: AUTH_TOKEN, url, params: { ...params, To: MOBILE }, signature }), false);
  assert.equal(twilioSignatureIsValid({ authToken: AUTH_TOKEN, url, params: { ...params, Extra: 'x' }, signature }), false);
  assert.equal(twilioSignatureIsValid({ authToken: 'f'.repeat(32), url, params, signature }), false);
});

test('a missing or malformed signature is refused without throwing', () => {
  const url = `${ORIGIN}/twilio/voice`;
  for (const signature of ['', undefined, null, 'not base64 !!', 'c2hvcnQ=']) {
    assert.equal(twilioSignatureIsValid({ authToken: AUTH_TOKEN, url, params: {}, signature }), false);
  }
});

test('the signed url comes from configuration, not from forwarded headers', () => {
  // A caller controlling X-Forwarded-Host must not be able to choose the string
  // that gets verified.
  assert.equal(signedUrl(ORIGIN, '/twilio/screen?silent=1'), `${ORIGIN}/twilio/screen?silent=1`);
  assert.equal(signedUrl(ORIGIN, 'http://attacker.example/twilio/screen'), `${ORIGIN}/twilio/screen`);
});

test('form parameters parse as Twilio sends them', () => {
  assert.deepEqual(formParams('From=%2B16025550111&SpeechResult=Hi+there'), { From: '+16025550111', SpeechResult: 'Hi there' });
});

// --------------------------------------------------------------- routing
test('a call is never bridged unless the gateway is live and bridging is on', () => {
  const base = { endpoints: [endpoint()], redialNumber: REDIAL_NUMBER, callerNumber: CALLER };
  assert.equal(chooseDestination({ ...base, bridging: 'disabled', environment: 'live' }).ok, false);
  assert.equal(chooseDestination({ ...base, bridging: 'enabled', environment: 'test' }).ok, false);
  assert.equal(chooseDestination({ ...base, bridging: 'enabled', environment: 'live' }).ok, true);
});

test('an unverified destination is never rung', () => {
  const result = chooseDestination({
    endpoints: [endpoint({ verified_at: null })], redialNumber: REDIAL_NUMBER,
    callerNumber: CALLER, bridging: 'enabled', environment: 'live',
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'no_verified_destination');
});

test('the forwarding source, the Redial number and the caller are all refused as destinations', () => {
  const live = { redialNumber: REDIAL_NUMBER, callerNumber: CALLER, bridging: 'enabled', environment: 'live' };
  // Sending the call back to the handset that forwarded it rings forever and
  // bills both legs.
  const loop = chooseDestination({ ...live, endpoints: [endpoint({ e164: MOBILE, is_forwarding_source: true }), endpoint({ e164: MOBILE, ring_order: 2 })] });
  assert.equal(loop.ok, false);
  assert.equal(loop.reason, 'all_destinations_loop');
  assert.equal(chooseDestination({ ...live, endpoints: [endpoint({ e164: REDIAL_NUMBER })] }).ok, false);
  assert.equal(chooseDestination({ ...live, endpoints: [endpoint({ e164: CALLER })] }).ok, false, 'ringing the caller back is a loop and a harassment vector');
});

test('a revoked destination is skipped and ring order is respected', () => {
  const result = chooseDestination({
    endpoints: [endpoint({ e164: '+16025550133', ring_order: 1, revoked_at: '2026-09-01T00:00:00Z' }), endpoint({ e164: MOBILE, ring_order: 2 })],
    redialNumber: REDIAL_NUMBER, callerNumber: CALLER, bridging: 'enabled', environment: 'live',
  });
  assert.equal(result.ok, true);
  assert.equal(result.endpoint.e164, MOBILE);
});

test('an ai line with no assistant configured takes a message rather than connecting to nothing', () => {
  assert.deepEqual(planInbound({ routing: { mode: 'ai', ai_sip_uri: null } }), { action: 'message' });
  assert.equal(planInbound({ routing: { mode: 'ai', ai_sip_uri: 'sip:agent@sip.voice.x.ai;transport=tls' } }).action, 'assistant');
  assert.deepEqual(planInbound({ routing: null }), { action: 'unroutable' });
  assert.deepEqual(planInbound({ routing: { mode: 'voicemail' } }), { action: 'message' });
});

test('a caller who says nothing is still offered on', () => {
  const plan = planAfterScreen({ said: '', confidence: null, destination: { ok: true, endpoint: endpoint() } });
  assert.equal(plan.action, 'offer', 'silence is not evidence of a junk call');
  assert.equal(plan.said, '');
});

test('a low confidence transcript is flagged, not acted on', () => {
  const plan = planAfterScreen({ said: 'maybe roofing', confidence: 0.2, destination: { ok: true, endpoint: endpoint() } });
  assert.equal(plan.action, 'offer');
  assert.equal(plan.uncertain, true);
});

test('caller speech is bounded and stripped before it reaches TwiML', () => {
  assert.equal(normalizeSpeech('Hi <Hangup/> & "bye"'), 'Hi Hangup/ "bye"');
  assert.equal(normalizeSpeech('a'.repeat(400)).length, 300);
  assert.equal(normalizeSpeech(undefined), '');
  assert.equal(normalizeSpeech('line break\tnow'), 'line break now');
});

test('only the accept digit connects a call', () => {
  assert.equal(memberAccepted('1'), true);
  for (const digits of ['', '2', undefined, null, '11']) assert.equal(memberAccepted(digits), false);
});

test('dial results map to outcomes, and a decline overrides the provider status', () => {
  assert.equal(outcomeFromDial('completed', true), 'connected');
  assert.equal(outcomeFromDial('completed', false), 'declined', 'a machine answering is not the member accepting');
  assert.equal(outcomeFromDial('no-answer', undefined), 'no_answer');
  assert.equal(outcomeFromDial('busy', undefined), 'no_answer');
  assert.equal(outcomeFromDial('failed', undefined), 'failed');
  assert.equal(outcomeFromDial('nonsense', undefined), 'failed');
});

test('only E.164 is accepted from the provider', () => {
  assert.equal(isE164(REDIAL_NUMBER), true);
  for (const bad of ['6025550100', '+0625550100', 'client:alice', '', null]) assert.equal(isE164(bad), false);
});

// ------------------------------------------------------------------ twiml
test('everything interpolated into TwiML is escaped', () => {
  assert.equal(escapeXml(`<Hangup/>&"'`), '&lt;Hangup/&gt;&amp;&quot;&apos;');
  const document = whisper({ caller: CALLER, said: 'It is <urgent> & "loud"' });
  assert.ok(!/<urgent>/.test(document), 'a caller must not be able to inject TwiML through their speech');
  assert.match(document, /&lt;urgent&gt;/);
});

test('the whisper hangs up rather than falling through to the caller', () => {
  // Falling through here is what lets the destination voicemail answer on the
  // member's behalf and report the call as connected.
  const document = whisper({ caller: CALLER, said: 'roof quote' });
  assert.match(document, /<Hangup\/>/);
  assert.match(document, /Press 1 to accept/);
});

test('the offer presents the Redial number as caller id, never the caller', () => {
  const document = offer({ to: MOBILE, callerId: REDIAL_NUMBER, whisperUrl: `${ORIGIN}/w`, actionUrl: `${ORIGIN}/a`, ringSeconds: 20, recording: false });
  assert.match(document, new RegExp(`callerId="\\${REDIAL_NUMBER}"`));
  assert.ok(!document.includes(CALLER));
  assert.ok(!/record=/.test(document), 'recording is off unless the line enables it');
});

test('recording appears only when the line enables it', () => {
  assert.match(offer({ to: MOBILE, callerId: REDIAL_NUMBER, whisperUrl: 'u', actionUrl: 'a', recording: true }), /record="record-from-answer-dual"/);
});

test('a silent caller is redirected rather than dropped', () => {
  assert.match(screen({ actionUrl: `${ORIGIN}/twilio/screen`, greeting: '', seconds: 10 }), /silent=1/);
});

// ------------------------------------------------------- end to end http
async function callGateway(server, path, params, { signature } = {}) {
  const { port } = server.address();
  const body = new URLSearchParams(params).toString();
  const url = `${ORIGIN}${path}`;
  return fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': signature ?? sign(url, params) },
    body,
  });
}

function stubStore() {
  const calls = new Map();
  return {
    calls,
    async resolveLine(dialled) {
      if (dialled !== REDIAL_NUMBER) return null;
      return {
        number: { workspace_id: 'w', line_id: 'l', e164: REDIAL_NUMBER, status: 'active' },
        routing: { mode: 'simple', greeting: '', max_screen_seconds: 120, ring_seconds: 20, voicemail_enabled: true, recording_enabled: false, ai_sip_uri: null },
        endpoints: [endpoint()],
      };
    },
    async startScreening(row) { calls.set(row.callSid, { ...row, outcome: 'screening' }); return { id: 'x', transfer_attempts: 0 }; },
    async recordSpeech({ callSid, said }) { const c = calls.get(callSid) ?? {}; c.caller_said = said; calls.set(callSid, c); },
    async settle({ callSid, outcome }) { const c = calls.get(callSid) ?? {}; c.outcome = outcome; calls.set(callSid, c); },
    async screening(sid) { const c = calls.get(sid); return c ? { from_e164: c.from, caller_said: c.caller_said ?? '' } : null; },
  };
}

async function withGateway(overrides, run) {
  const config = readGatewayConfig(gatewayEnvironment(overrides));
  const store = stubStore();
  const server = createGateway({ config, store });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run(server, store); } finally { server.close(); await once(server, 'close'); }
}

test('an unsigned request is refused before any parameter is used', async () => {
  await withGateway({}, async server => {
    const response = await callGateway(server, '/twilio/voice', { CallSid: `CA${'a'.repeat(32)}`, From: CALLER, To: REDIAL_NUMBER }, { signature: 'forged' });
    assert.equal(response.status, 403);
    assert.match(await response.text(), /signature rejected/);
  });
});

test('a signed call to an unknown number learns nothing about what exists', async () => {
  await withGateway({}, async server => {
    const response = await callGateway(server, '/twilio/voice', { CallSid: `CA${'b'.repeat(32)}`, From: CALLER, To: '+16025559999' });
    const body = await response.text();
    assert.match(body, /not in service/);
    assert.ok(!body.includes('line'), 'the response must not hint at tenant mapping');
  });
});

test('a screened call in the default posture takes a message and never dials a handset', async () => {
  await withGateway({}, async (server, store) => {
    const CallSid = `CA${'c'.repeat(32)}`;
    const first = await (await callGateway(server, '/twilio/voice', { CallSid, From: CALLER, To: REDIAL_NUMBER })).text();
    assert.match(first, /<Gather input="speech"/);

    const second = await (await callGateway(server, '/twilio/screen', { CallSid, From: CALLER, To: REDIAL_NUMBER, SpeechResult: 'Jane about the roof', Confidence: '0.9' })).text();
    assert.match(second, /<Record /, 'bridging is off by default, so the caller leaves a message');
    assert.ok(!second.includes(MOBILE), 'no handset may be dialled in the default posture');
    assert.equal(store.calls.get(CallSid).caller_said, 'Jane about the roof');
  });
});

test('with bridging enabled and live, the call is offered to the verified handset', async () => {
  await withGateway({ REDIAL_GATEWAY_ENVIRONMENT: 'live', REDIAL_GATEWAY_BRIDGE_CALLS: 'enabled' }, async (server, store) => {
    const CallSid = `CA${'d'.repeat(32)}`;
    await callGateway(server, '/twilio/voice', { CallSid, From: CALLER, To: REDIAL_NUMBER });
    const body = await (await callGateway(server, '/twilio/screen', { CallSid, From: CALLER, To: REDIAL_NUMBER, SpeechResult: 'Jane about the roof', Confidence: '0.9' })).text();
    assert.match(body, /<Dial /);
    assert.match(body, new RegExp(`<Number url="[^"]+" method="POST">\\${MOBILE}</Number>`));
    assert.equal(store.calls.get(CallSid).outcome, 'offered');

    const whisperBody = await (await callGateway(server, `/twilio/whisper?sid=${encodeURIComponent(CallSid)}`, { CallSid })).text();
    assert.match(whisperBody, /Jane about the roof/);
    assert.match(whisperBody, /Press 1 to accept/);
  });
});

test('a declined offer falls back to a message and is recorded as declined', async () => {
  await withGateway({ REDIAL_GATEWAY_ENVIRONMENT: 'live', REDIAL_GATEWAY_BRIDGE_CALLS: 'enabled' }, async (server, store) => {
    const CallSid = `CA${'e'.repeat(32)}`;
    await callGateway(server, '/twilio/voice', { CallSid, From: CALLER, To: REDIAL_NUMBER });
    const body = await (await callGateway(server, '/twilio/after-dial', { CallSid, From: CALLER, To: REDIAL_NUMBER, DialCallStatus: 'completed', DigitsMatched: '' })).text();
    assert.equal(store.calls.get(CallSid).outcome, 'declined');
    assert.match(body, /<Record /);
  });
});

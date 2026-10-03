import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, buildPrompt, decideTurn, parseDecision } from '../services/voice-gateway/assistant.mjs';

// The rule-based plan the gateway computes before the assistant is consulted.
// Every refusal below must return this object unchanged apart from the
// explanatory `assistant` field, because it is what the caller would have got
// if the assistant did not exist.
const fallback = { action: 'offer', endpoint: { e164: '+16025550111' }, said: 'hello', uncertain: false };
const destination = { ok: true, endpoint: { e164: '+16025550111' } };
const premium = { screening_enabled: true, notice_enabled: true, greeting: 'Hi', model: 'xai', turns: 3, minute_limit: 300 };
const enabled = { assistant: 'enabled', xaiApiKey: 'test-key', xaiModel: 'grok-4', assistantTimeoutMs: 4000 };

const replyWith = payload => async () => ({
  ok: true,
  json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
});

test('a decision must name a permitted action and say something', () => {
  assert.equal(parseDecision(null, { turnsLeft: 1 }), null);
  assert.equal(parseDecision({ action: 'hang_up', say: 'Bye' }, { turnsLeft: 1 }), null);
  assert.equal(parseDecision({ action: 'connect' }, { turnsLeft: 1 }), null, 'a silent turn is unusable');
  assert.equal(parseDecision({ action: 'connect', say: '   ' }, { turnsLeft: 1 }), null);
  for (const action of ACTIONS) {
    const parsed = parseDecision({ action, say: 'One moment.' }, { turnsLeft: 2 });
    assert.equal(parsed.action, action);
  }
});

test('asking again is refused when no turns remain, however the model replies', () => {
  assert.equal(parseDecision({ action: 'ask_again', say: 'Who is calling?' }, { turnsLeft: 0 }), null);
  assert.ok(parseDecision({ action: 'ask_again', say: 'Who is calling?' }, { turnsLeft: 1 }));
});

test('what the model says is bounded before it can reach a TwiML document', () => {
  const parsed = parseDecision({ action: 'message', say: `${'a'.repeat(400)}<script>`, reason: 'x'.repeat(400) }, { turnsLeft: 1 });
  assert.ok(parsed.say.length <= 200);
  assert.ok(parsed.reason.length <= 120);
  assert.ok(!parsed.say.includes('<'), 'angle brackets are stripped before escaping ever has to save us');
});

test('the prompt marks connect unavailable when there is nowhere safe to send the call', () => {
  const prompt = buildPrompt({ greeting: 'Hi', said: 'Dave', confidence: 0.9, turnsLeft: 1, canConnect: false });
  assert.match(prompt, /connect \(UNAVAILABLE on this call\)/);
  assert.match(prompt, /ask_again(?! \(UNAVAILABLE)/);
});

test('every refusal falls back to the rule-based plan', async () => {
  const cases = [
    ['switched_off', { ...enabled, assistant: 'disabled' }, premium],
    ['line_disabled', enabled, { ...premium, screening_enabled: false }],
    ['plan_tier', enabled, { ...premium, model: 'rules' }],
    ['no_credential', { ...enabled, xaiApiKey: '' }, premium],
  ];
  for (const [why, config, profile] of cases) {
    const plan = await decideTurn({ profile, said: 'hello', confidence: 0.9, destination, fallback, config });
    assert.equal(plan.action, fallback.action, why);
    assert.equal(plan.assistant.used, false);
    assert.equal(plan.assistant.why, why);
  }
});

test('a provider failure degrades the call rather than failing it', async () => {
  const plan = await decideTurn({
    profile: premium, said: 'hello', confidence: 0.9, destination, fallback, config: enabled,
    deps: { fetchImpl: async () => { throw new Error('socket hang up'); } },
  });
  assert.equal(plan.action, 'offer');
  assert.equal(plan.assistant.used, false);
  assert.equal(plan.assistant.why, 'provider_error');
});

test('an unusable reply degrades the call rather than failing it', async () => {
  const plan = await decideTurn({
    profile: premium, said: 'hello', confidence: 0.9, destination, fallback, config: enabled,
    deps: { fetchImpl: replyWith({ action: 'teleport', say: 'Away we go' }) },
  });
  assert.equal(plan.action, 'offer');
  assert.equal(plan.assistant.why, 'unusable_reply');
});

test('the routing guards outrank the model: connect is refused with no safe destination', async () => {
  const blocked = { ok: false, reason: 'all_destinations_loop' };
  const plan = await decideTurn({
    profile: premium, said: 'hello', confidence: 0.9, destination: blocked,
    fallback: { action: 'message', reason: 'all_destinations_loop' }, config: enabled,
    deps: { fetchImpl: replyWith({ action: 'connect', say: 'Putting you through.' }) },
  });
  assert.equal(plan.action, 'message', 'the model cannot talk its way past the loop guard');
  assert.equal(plan.assistant.why, 'connect_refused');
});

test('a declined caller is still offered voicemail', async () => {
  const plan = await decideTurn({
    profile: premium, said: 'buy my product', confidence: 0.9, destination, fallback, config: enabled,
    deps: { fetchImpl: replyWith({ action: 'decline', say: 'They are not taking sales calls.', reason: 'sales' }) },
  });
  assert.equal(plan.action, 'message', 'the assistant is not a verdict and a hard hangup would lose real callers');
  assert.equal(plan.assistant.used, true);
  assert.equal(plan.assistant.reason, 'sales');
});

test('a connect decision carries the endpoint the guards chose, not one the model named', async () => {
  const plan = await decideTurn({
    profile: premium, said: 'it is Dave about the roof', confidence: 0.9, destination, fallback, config: enabled,
    deps: { fetchImpl: replyWith({ action: 'connect', say: 'Putting you through.', reason: 'expected' }) },
  });
  assert.equal(plan.action, 'offer');
  assert.equal(plan.endpoint.e164, '+16025550111');
  assert.equal(plan.assistant.used, true);
});

test('turns run out: the last turn cannot ask again', async () => {
  const single = { ...premium, turns: 1 };
  const plan = await decideTurn({
    profile: single, said: 'hello', confidence: 0.9, destination, fallback, config: enabled, turnsUsed: 0,
    deps: { fetchImpl: replyWith({ action: 'ask_again', say: 'Who is calling?' }) },
  });
  assert.equal(plan.action, 'offer', 'with one turn allowed there is no turn left to ask in');
  assert.equal(plan.assistant.why, 'unusable_reply');
});

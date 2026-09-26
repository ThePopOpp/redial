import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readWorkerConfig, workerSummary } from '../services/worker/config.mjs';
import { squareSignatureIsValid, readSquareSignature } from '../services/worker/square-signature.mjs';
import { decideWebhookOutcome, nextAttemptDelaySeconds, leaseIsExpired, supersedesRecordedState, MAX_ATTEMPTS } from '../services/worker/schedule.mjs';

const SIGNATURE_KEY = 'example-signature-key-0123456789';
const WEBHOOK_URL = 'https://worker.redial.si/webhooks/square';

// A complete, valid worker environment. Values are syntactically correct and
// deliberately not real credentials.
function workerEnvironment(overrides = {}) {
  return {
    SUPABASE_URL: 'https://jjdqeojubmwvxjfcljpk.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_example_value_for_tests_only_0123',
    SQUARE_ACCESS_TOKEN: 'EAAAExampleSandboxAccessTokenValue',
    SQUARE_WEBHOOK_SIGNATURE_KEY: SIGNATURE_KEY,
    SQUARE_WEBHOOK_URL: WEBHOOK_URL,
    SQUARE_ENVIRONMENT: 'sandbox',
    ...overrides,
  };
}

test('a complete sandbox worker environment is accepted', () => {
  const config = readWorkerConfig(workerEnvironment());
  assert.equal(config.square.environment, 'sandbox');
  assert.equal(config.providerCalls, 'disabled', 'outbound provider calls are off unless explicitly enabled');
  assert.equal(config.square.productionAuthorized, false);
});

test('a publishable key is refused where the service-role key belongs', () => {
  assert.throws(
    () => readWorkerConfig(workerEnvironment({ SUPABASE_SERVICE_ROLE_KEY: 'sb_publishable_example_value_0123456789' })),
    /SUPABASE_SERVICE_ROLE_KEY/,
    'a publishable key would read nothing rather than fail, so it must be rejected at startup',
  );
});

test('each provider secret is required rather than silently absent', () => {
  for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SQUARE_ACCESS_TOKEN', 'SQUARE_WEBHOOK_SIGNATURE_KEY', 'SQUARE_WEBHOOK_URL']) {
    assert.throws(() => readWorkerConfig(workerEnvironment({ [name]: '' })), new RegExp(name), `${name} must be required`);
  }
});

test('production Square credentials need separate written authorization', () => {
  assert.throws(
    () => readWorkerConfig(workerEnvironment({ SQUARE_ENVIRONMENT: 'production' })),
    /REDIAL_SQUARE_PRODUCTION_AUTHORIZED/,
    'a copied environment file must not be able to start charging real cards',
  );
  const authorized = readWorkerConfig(workerEnvironment({
    SQUARE_ENVIRONMENT: 'production', REDIAL_SQUARE_PRODUCTION_AUTHORIZED: 'yes',
  }));
  assert.equal(authorized.square.productionAuthorized, true);
});

test('the notification URL must be exact HTTPS, because the signature covers it', () => {
  for (const bad of ['http://worker.redial.si/webhooks/square', 'https://worker.redial.si/webhooks/square?x=1', 'https://worker.redial.si/webhooks/square#f', 'not-a-url']) {
    assert.throws(() => readWorkerConfig(workerEnvironment({ SQUARE_WEBHOOK_URL: bad })), /SQUARE_WEBHOOK_URL/, `${bad} must be refused`);
  }
});

test('the worker summary reports presence and never a credential', () => {
  const config = readWorkerConfig(workerEnvironment());
  const summary = JSON.stringify(workerSummary(config));
  assert.match(summary, /"squareCredentials":"configured"/);
  for (const secret of [config.square.accessToken, config.square.signatureKey, config.supabase.serviceRoleKey]) {
    assert.ok(!summary.includes(secret), 'the summary must not carry a secret value');
  }
  assert.match(summary, /"subscriptionCreation":"not implemented"/);
});

test('a genuine Square signature over the raw body verifies', () => {
  const rawBody = '{"type":"invoice.payment_made","event_id":"evt-1"}';
  const signature = createHmac('sha256', SIGNATURE_KEY).update(WEBHOOK_URL + rawBody).digest('base64');
  assert.equal(squareSignatureIsValid({ notificationUrl: WEBHOOK_URL, rawBody, signature, signatureKey: SIGNATURE_KEY }), true);
  assert.equal(squareSignatureIsValid({ notificationUrl: WEBHOOK_URL, rawBody: Buffer.from(rawBody), signature, signatureKey: SIGNATURE_KEY }), true);
});

test('a re-serialised body no longer verifies, which is why raw bytes are kept', () => {
  // Whitespace and key order are exactly what a JSON round trip discards, and a
  // provider is under no obligation to send compact bodies.
  const rawBody = '{ "type": "invoice.payment_made", "event_id": "evt-1" }';
  const signature = createHmac('sha256', SIGNATURE_KEY).update(WEBHOOK_URL + rawBody).digest('base64');
  const reserialised = JSON.stringify(JSON.parse(rawBody));
  assert.notEqual(reserialised, rawBody, 'this test is meaningless if the round trip is byte-identical');
  assert.equal(squareSignatureIsValid({ notificationUrl: WEBHOOK_URL, rawBody, signature, signatureKey: SIGNATURE_KEY }), true);
  assert.equal(squareSignatureIsValid({ notificationUrl: WEBHOOK_URL, rawBody: reserialised, signature, signatureKey: SIGNATURE_KEY }), false);
});

test('a different URL, body, or key all fail verification', () => {
  const rawBody = '{"event_id":"evt-1"}';
  const signature = createHmac('sha256', SIGNATURE_KEY).update(WEBHOOK_URL + rawBody).digest('base64');
  assert.equal(squareSignatureIsValid({ notificationUrl: 'https://worker.redial.si/webhooks/square2', rawBody, signature, signatureKey: SIGNATURE_KEY }), false);
  assert.equal(squareSignatureIsValid({ notificationUrl: WEBHOOK_URL, rawBody: '{"event_id":"evt-2"}', signature, signatureKey: SIGNATURE_KEY }), false);
  assert.equal(squareSignatureIsValid({ notificationUrl: WEBHOOK_URL, rawBody, signature, signatureKey: 'another-key-0123456789abcdef' }), false);
});

test('a missing or malformed signature is refused without throwing', () => {
  const base = { notificationUrl: WEBHOOK_URL, rawBody: '{}', signatureKey: SIGNATURE_KEY };
  for (const signature of ['', undefined, null, '!!!not base64!!!', 'c2hvcnQ=']) {
    assert.equal(squareSignatureIsValid({ ...base, signature }), false);
  }
  assert.equal(squareSignatureIsValid({ ...base, signature: 'abc', signatureKey: '' }), false);
  assert.equal(squareSignatureIsValid({ notificationUrl: WEBHOOK_URL, rawBody: 42, signature: 'abc', signatureKey: SIGNATURE_KEY }), false);
});

test('the signature header is read whatever its case', () => {
  assert.equal(readSquareSignature({ 'x-square-hmacsha256-signature': 'abc' }), 'abc');
  assert.equal(readSquareSignature({ 'X-Square-HmacSha256-Signature': 'abc' }), 'abc');
  assert.equal(readSquareSignature({}), '');
  assert.equal(readSquareSignature(undefined), '');
});

test('a signature failure is dead-lettered, never retried', () => {
  const outcome = decideWebhookOutcome({ attempts: 0, signatureVerified: false, error: null, now: new Date() });
  assert.equal(outcome.state, 'dead_letter');
  assert.equal(outcome.next_attempt_at, null, 'forged bytes will not become valid later');
  assert.match(outcome.dead_letter_reason, /Signature/);
});

test('a transient failure retries with a bounded, jittered delay', () => {
  const now = new Date('2026-09-26T00:00:00.000Z');
  const outcome = decideWebhookOutcome({ attempts: 1, signatureVerified: true, error: 'provider timeout', now, random: () => 1 });
  assert.equal(outcome.state, 'received');
  assert.ok(new Date(outcome.next_attempt_at).getTime() > now.getTime(), 'a retry must be scheduled in the future');
  assert.equal(outcome.dead_letter_reason, null);
  for (const attempts of [1, 3, 5, 8, 50]) {
    const delay = nextAttemptDelaySeconds(attempts, () => 1);
    assert.ok(delay >= 1 && delay <= 3600, `delay ${delay} must stay within bounds`);
  }
  assert.ok(nextAttemptDelaySeconds(8, () => 0) < nextAttemptDelaySeconds(8, () => 1), 'jitter must actually vary the delay');
});

test('a repeatedly failing event dead-letters with a reason instead of looping', () => {
  const outcome = decideWebhookOutcome({ attempts: MAX_ATTEMPTS - 1, signatureVerified: true, error: 'still failing', now: new Date() });
  assert.equal(outcome.state, 'dead_letter');
  assert.match(outcome.dead_letter_reason, /Failed after/);
  assert.ok(outcome.dead_letter_reason.length <= 500, 'the reason must fit the column');
});

test('a long failure reason is truncated to fit the column', () => {
  const outcome = decideWebhookOutcome({ attempts: MAX_ATTEMPTS, signatureVerified: true, error: 'x'.repeat(900), now: new Date() });
  assert.ok(outcome.dead_letter_reason.length <= 500);
});

test('success marks the event processed with a timestamp', () => {
  const now = new Date('2026-09-26T12:00:00.000Z');
  const outcome = decideWebhookOutcome({ attempts: 0, signatureVerified: true, error: null, now });
  assert.equal(outcome.state, 'processed');
  assert.equal(outcome.processed_at, now.toISOString());
});

test('a missing or past lease counts as expired so work is never stranded', () => {
  const now = new Date('2026-09-26T00:00:00.000Z');
  assert.equal(leaseIsExpired(null, now), true);
  assert.equal(leaseIsExpired({}, now), true);
  assert.equal(leaseIsExpired({ lease_expires_at: '2025-01-01T00:00:00.000Z' }, now), true);
  assert.equal(leaseIsExpired({ lease_expires_at: '2027-01-01T00:00:00.000Z' }, now), false);
});

test('an older provider notification never supersedes a newer recorded state', () => {
  assert.equal(supersedesRecordedState({ eventTime: '2026-09-26T10:00:00Z', recordedTime: '2026-09-26T09:00:00Z' }), true);
  assert.equal(supersedesRecordedState({ eventTime: '2026-09-26T08:00:00Z', recordedTime: '2026-09-26T09:00:00Z' }), false,
    'a delayed unpaid event must not revoke a period a later event settled');
  assert.equal(supersedesRecordedState({ eventTime: null, recordedTime: '2026-09-26T09:00:00Z' }), false,
    'an event with no provider timestamp is treated as too old to trust');
  assert.equal(supersedesRecordedState({ eventTime: '2026-09-26T08:00:00Z', recordedTime: null }), true);
});

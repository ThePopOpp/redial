import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLaunchConfig } from '../scripts/check-launch-config.mjs';

const valid = { REDIAL_SITE_URL: 'https://redial.example.org', SUPABASE_URL: 'https://project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_long_test_key' };
test('configuration cannot claim production readiness from credentials', () => {
  const results = checkLaunchConfig(valid);
  // Asserted by name rather than by counting passes. The gates are the point:
  // a complete, valid environment must still report the things configuration
  // alone cannot establish, and a later check being added should not look like
  // this test passing for a new reason.
  assert.equal(results.find(r => r.key === 'LIVE_CALL_IMPLEMENTATION').status, 'blocked');
  assert.equal(results.find(r => r.key === 'RECORDING_CONSENT_AND_DELETION').status, 'blocked',
    'recording needs a per-line consent record, which no environment variable can provide');
  // Everything a valid environment genuinely does settle.
  for (const key of ['REDIAL_SITE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'WEB_SECRET_ISOLATION']) {
    assert.equal(results.find(r => r.key === key).status, 'pass', key);
  }
  assert.ok(results.some(r => r.status === 'blocked'), 'readiness is never claimed from configuration');
});

test('recording playback is configured in full or not at all', () => {
  // A half-configured pair would render a play control that fails on click.
  const key = 'RECORDING_PLAYBACK';
  assert.equal(checkLaunchConfig(valid).find(r => r.key === key).status, 'pass', 'absent is a valid posture');
  const secret = 'x'.repeat(32);
  assert.equal(checkLaunchConfig({ ...valid, REDIAL_MEDIA_ACCESS_SECRET: secret }).find(r => r.key === key).status, 'blocked', 'secret without a gateway');
  assert.equal(checkLaunchConfig({ ...valid, REDIAL_VOICE_GATEWAY_URL: 'https://voice.redial.si' }).find(r => r.key === key).status, 'blocked', 'gateway without a secret');
  assert.equal(checkLaunchConfig({ ...valid, REDIAL_VOICE_GATEWAY_URL: 'https://voice.redial.si', REDIAL_MEDIA_ACCESS_SECRET: 'short' }).find(r => r.key === key).status, 'blocked', 'a weak secret is refused');
  assert.equal(checkLaunchConfig({ ...valid, REDIAL_VOICE_GATEWAY_URL: 'http://voice.redial.si', REDIAL_MEDIA_ACCESS_SECRET: secret }).find(r => r.key === key).status, 'blocked', 'plaintext transport for call audio is refused');
  assert.equal(checkLaunchConfig({ ...valid, REDIAL_VOICE_GATEWAY_URL: 'https://voice.redial.si', REDIAL_MEDIA_ACCESS_SECRET: secret }).find(r => r.key === key).status, 'pass');
});

test('the media access secret is never echoed back', () => {
  const secret = 'media-secret-must-not-be-printed-0123';
  const results = checkLaunchConfig({ ...valid, REDIAL_MEDIA_ACCESS_SECRET: secret, REDIAL_VOICE_GATEWAY_URL: 'https://voice.redial.si' });
  assert.ok(!JSON.stringify(results).includes(secret));
});
test('provider and privileged keys are rejected without echoing values', () => {
  const secret = 'private-secret-must-not-be-printed';
  const results = checkLaunchConfig({ ...valid, TWILIO_AUTH_TOKEN: secret, NEXT_PUBLIC_RESEND_API_KEY: secret });
  assert.equal(results.find(r => r.key === 'WEB_SECRET_ISOLATION').status, 'blocked');
  assert.ok(!JSON.stringify(results).includes(secret));
  const serviceKey = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
  assert.equal(checkLaunchConfig({ ...valid, SUPABASE_PUBLISHABLE_KEY: `header.${serviceKey}.sig` }).find(r => r.key === 'SUPABASE_PUBLISHABLE_KEY').status, 'blocked');
});
test('rejects local, credentialed, insecure and path-based app origins for staging', () => {
  for (const REDIAL_SITE_URL of ['http://redial.example.org', 'https://127.0.0.1', 'https://user:secret@redial.example.org', 'https://redial.example.org/path', 'https://app.example.invalid', 'https://redial.example.org?x=1']) {
    assert.equal(checkLaunchConfig({ ...valid, REDIAL_SITE_URL }).find(r => r.key === 'REDIAL_SITE_URL').status, 'blocked');
  }
});
test('every secret the worker owns is refused in the web environment', () => {
  // These names are the contract between services/worker and the web tier. If
  // one is ever dropped from check-launch-config, a Coolify copy-paste puts a
  // provider secret in a browser-facing container and nothing complains.
  const secret = 'worker-owned-value-must-never-reach-the-web-tier';
  for (const name of ['SQUARE_ACCESS_TOKEN', 'SQUARE_WEBHOOK_SIGNATURE_KEY', 'SQUARE_REFRESH_TOKEN',
    'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'XAI_API_KEY', 'RESEND_API_KEY']) {
    const results = checkLaunchConfig({ ...valid, [name]: secret });
    assert.equal(results.find(r => r.key === 'WEB_SECRET_ISOLATION').status, 'blocked', `${name} must be refused in the web tier`);
    assert.ok(!JSON.stringify(results).includes(secret), `${name} must not be echoed`);
  }
});

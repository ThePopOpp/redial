import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLaunchConfig } from '../scripts/check-launch-config.mjs';

const valid = { REDIAL_SITE_URL: 'https://redial.example.org', SUPABASE_URL: 'https://project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_long_test_key' };
test('configuration cannot claim production readiness from credentials', () => {
  const results = checkLaunchConfig(valid);
  assert.equal(results.filter(r => r.status === 'pass').length, 4);
  assert.equal(results.find(r => r.key === 'LIVE_CALL_IMPLEMENTATION').status, 'blocked');
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

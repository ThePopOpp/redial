import test from 'node:test';
import assert from 'node:assert/strict';
import { readRuntime, configurationSummary } from '../config/runtime.mjs';
import { checkAccess } from '../config/access.mjs';

const development = { REDIAL_DEPLOYMENT: 'development', REDIAL_SITE_URL: 'https://dev.redial.si',
  REDIAL_DEV_USERNAME: 'reviewer', REDIAL_DEV_PASSWORD: 'test-only-password-with-32-characters' };
const config = readRuntime(development);
const authorization = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
const request = (headers = {}, method = 'GET') => new Request('http://internal:3000/api/onboarding', {
  method, headers: { host: 'dev.redial.si', authorization, ...headers },
});

test('hosted configuration fails closed without HTTPS, a unique password, or a supported mode', () => {
  for (const override of [
    { REDIAL_SITE_URL: 'http://dev.redial.si' }, { REDIAL_SITE_URL: 'https://user:secret@dev.redial.si' },
    { REDIAL_SITE_URL: 'https://dev.redial.si/path' }, { REDIAL_DEV_PASSWORD: '' },
    { REDIAL_DEV_PASSWORD: 'replace-this-password-with-a-secret' }, { REDIAL_DEV_USERNAME: 'user:name' },
    { REDIAL_DEPLOYMENT: 'production' }, { REDIAL_DEPLOYMENT: 'devlopment' },
  ]) assert.throws(() => readRuntime({ ...development, ...override }), /Invalid environment/);
});

test('provider configuration is paired and rejects server secrets, malformed accounts, and insecure SMTP', () => {
  for (const override of [
    { SUPABASE_URL: 'https://example.supabase.co' },
    { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_secret_never-in-client' },
    { TWILIO_ACCOUNT_SID: `AC${'0'.repeat(32)}` },
    { REDIAL_EMAIL_PROVIDER: 'resend' },
    { REDIAL_EMAIL_PROVIDER: 'smtp', EMAIL_FROM: 'hello@redial.si', SMTP_HOST: 'smtp.hostinger.com',
      SMTP_PORT: '587', SMTP_SECURE: 'true', SMTP_USER: 'hello@redial.si', SMTP_PASSWORD: 'test-only' },
  ]) assert.throws(() => readRuntime({ ...development, ...override }), /Invalid environment/);
});

test('SMTP port 587 requires STARTTLS configuration and hosted cookies are secure', () => {
  const runtime = readRuntime({ ...development, REDIAL_EMAIL_PROVIDER: 'smtp', EMAIL_FROM: 'hello@redial.si',
    SMTP_HOST: 'smtp.hostinger.com', SMTP_PORT: '587', SMTP_SECURE: 'false', SMTP_USER: 'hello@redial.si', SMTP_PASSWORD: 'test-only' });
  assert.equal(runtime.email.smtp.secure, false);
  assert.equal(runtime.secureCookies, true);
  assert.equal(readRuntime({}).secureCookies, false);
});

test('errors and configuration summaries omit credentials', () => {
  const secret = 'private-value-that-must-never-be-logged';
  try { readRuntime({ ...development, SUPABASE_URL: secret, SUPABASE_PUBLISHABLE_KEY: secret }); assert.fail(); }
  catch (error) { assert.ok(!error.message.includes(secret)); }
  const summary = JSON.stringify(configurationSummary(config));
  assert.ok(!summary.includes(config.password));
  assert.match(summary, /not implemented/);
});

test('development preview requires Basic authentication even for reads', () => {
  assert.equal(checkAccess(request(), config), null);
  for (const header of ['', 'Bearer bad', 'Basic !!!', `Basic ${Buffer.from('reviewer:wrong').toString('base64')}`]) {
    assert.equal(checkAccess(request({ authorization: header }), config)?.status, 401);
  }
});

test('spoofed forwarding headers do not grant access to a different hostname', () => {
  assert.equal(checkAccess(request({ host: 'attacker.example', 'x-forwarded-host': 'dev.redial.si' }), config)?.code, 'HOST');
  assert.equal(checkAccess(request({ host: '127.0.0.1:3000', 'x-forwarded-host': 'dev.redial.si' }), config)?.status, 403);
});

test('hosted writes require exact configured HTTPS origin in addition to authentication', () => {
  assert.equal(checkAccess(request({ origin: 'https://dev.redial.si' }, 'POST'), config, true), null);
  for (const origin of ['', 'http://dev.redial.si', 'https://dev.redial.si.evil.test', 'https://redial.si']) {
    assert.equal(checkAccess(request({ origin }, 'POST'), config, true)?.code, 'ORIGIN');
  }
  assert.equal(checkAccess(request({ 'sec-fetch-site': 'cross-site' }), config)?.code, 'ORIGIN');
});

test('local APIs retain loopback restriction and exact origin checks', () => {
  const local = readRuntime({});
  assert.equal(checkAccess(request({ host: '127.0.0.1:4317', origin: 'http://127.0.0.1:4317' }, 'POST'), local, true), null);
  assert.equal(checkAccess(request({ host: 'dev.redial.si' }), local)?.code, 'LOCAL_ONLY');
  assert.equal(checkAccess(request({ host: 'localhost:4317', origin: 'https://elsewhere.test' }, 'POST'), local, true)?.code, 'ORIGIN');
});

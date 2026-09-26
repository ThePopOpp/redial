import test from 'node:test';
import assert from 'node:assert/strict';
import { readRuntime, configurationSummary } from '../config/runtime.mjs';
import { checkAccess } from '../config/access.mjs';
import { checkEmailProviders } from '../config/email-checks.mjs';

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

const dualEmail = { ...development, REDIAL_EMAIL_PROVIDER: 'resend', REDIAL_EMAIL_FALLBACK_PROVIDER: 'smtp',
  RESEND_API_KEY: 're_test_only_not_a_credential', EMAIL_FROM: 'hello@example.test',
  SMTP_HOST: 'smtp.hostinger.com', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: 'hello@example.test', SMTP_PASSWORD: 'test-only-mailbox-password' };

test('Resend primary requires complete, secure SMTP configuration when fallback is selected', () => {
  const runtime = readRuntime(dualEmail);
  assert.equal(runtime.email.provider, 'resend');
  assert.equal(runtime.email.fallbackProvider, 'smtp');
  assert.equal(runtime.email.smtp.secure, true);
  assert.equal(configurationSummary(runtime).emailFallback, 'smtp');
  for (const override of [{ SMTP_PASSWORD: '' }, { SMTP_USER: '' }, { SMTP_HOST: '' }, { SMTP_SECURE: 'false' },
    { RESEND_API_KEY: '' }, { REDIAL_EMAIL_PROVIDER: 'smtp' }, { REDIAL_EMAIL_PROVIDER: 'disabled' },
    { REDIAL_EMAIL_FALLBACK_PROVIDER: 'resend' }]) {
    assert.throws(() => readRuntime({ ...dualEmail, ...override }), /Invalid environment/);
  }
});

test('email inspection checks both providers without sending and enforces SMTP TLS', async () => {
  let smtpVerified = false, closed = false;
  const results = await checkEmailProviders(readRuntime(dualEmail).email, {
    fetchImpl: async () => new Response(JSON.stringify({ data: [{ name: 'example.test', status: 'verified' }] })),
    createTransport: options => {
      assert.equal(options.host, 'smtp.hostinger.com'); assert.equal(options.port, 465);
      assert.equal(options.secure, true); assert.equal(options.requireTLS, true);
      assert.equal(options.tls.minVersion, 'TLSv1.2'); assert.notEqual(options.tls.rejectUnauthorized, false);
      return { verify: async () => { smtpVerified = true; }, close: () => { closed = true; } };
    },
  });
  assert.deepEqual(results.map(({ provider, role, status }) => ({ provider, role, status })), [
    { provider: 'resend', role: 'primary', status: 'verified' }, { provider: 'smtp', role: 'fallback', status: 'verified' },
  ]);
  assert.ok(smtpVerified && closed);
});

test('fallback diagnostics still run after Resend failure, without claiming delivery failover', async () => {
  const secret = 'never-log-provider-error-credentials';
  for (const response of [() => new Response('', { status: 403 }), () => { throw new Error(secret); }]) {
    let closed = false;
    const results = await checkEmailProviders(readRuntime(dualEmail).email, {
      fetchImpl: async () => response(),
      createTransport: () => ({ verify: async () => { throw new Error(secret); }, close: () => { closed = true; } }),
    });
    assert.equal(results.length, 2); assert.equal(results[1].status, 'failed');
    assert.ok(closed); assert.ok(!JSON.stringify(results).includes(secret));
    assert.notEqual(results[0].status, 'verified');
  }
});

test('disabled email and primary-only Resend do not contact SMTP', async () => {
  const unexpected = () => { assert.fail('No SMTP/network check should occur.'); };
  const disabled = await checkEmailProviders(readRuntime({}).email, { fetchImpl: unexpected, createTransport: unexpected });
  assert.equal(disabled[0].status, 'disabled');
  const primary = readRuntime({ ...dualEmail, REDIAL_EMAIL_FALLBACK_PROVIDER: 'disabled' }).email;
  const results = await checkEmailProviders(primary, { fetchImpl: async () => new Response('', { status: 403 }), createTransport: unexpected });
  assert.equal(results.length, 1); assert.equal(results[0].status, 'unverified');
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

// The container entrypoint and the runtime validator must agree on which
// deployment modes exist. They drifted once: `public` was added to the
// validator while the entrypoint still demanded `development`, so the
// container refused to start and the hosted site silently kept the old build.
test('the container entrypoint accepts every hosted mode and refuses the loopback one', async () => {
  const { spawnSync } = await import('node:child_process');
  const { tmpdir } = await import('node:os');
  const base = { ...process.env, REDIAL_SITE_URL: 'https://redial.example.org', REDIAL_DATA_DIR: tmpdir() };
  delete base.REDIAL_DEV_USERNAME; delete base.REDIAL_DEV_PASSWORD;
  const run = env => spawnSync(process.execPath, ['scripts/start-container.mjs'], { env: { ...base, ...env }, encoding: 'utf8' });

  const local = run({ REDIAL_DEPLOYMENT: 'local' });
  assert.match(local.stderr, /requires REDIAL_DEPLOYMENT/, 'loopback mode must be refused in a container');

  const preview = run({ REDIAL_DEPLOYMENT: 'development', REDIAL_DEV_USERNAME: 'redial-review', REDIAL_DEV_PASSWORD: 'a-unique-preview-password-value' });
  assert.doesNotMatch(preview.stderr, /requires REDIAL_DEPLOYMENT/, 'the password-gated preview must start');

  const site = run({ REDIAL_DEPLOYMENT: 'public' });
  assert.doesNotMatch(site.stderr, /requires REDIAL_DEPLOYMENT/, 'the public site must start');

  // A leftover preview password in public mode is a configuration error, not
  // something to ignore, because it would look like protection it is not giving.
  const stale = run({ REDIAL_DEPLOYMENT: 'public', REDIAL_DEV_USERNAME: 'redial-review', REDIAL_DEV_PASSWORD: 'a-unique-preview-password-value' });
  assert.match(stale.stderr, /must be unset when REDIAL_DEPLOYMENT=public/, 'a stale preview password must fail startup');
});

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { request as httpRequest } from 'node:http';

// Own only uniquely named test resources. No provider keys or existing volumes.
const suffix = randomBytes(6).toString('hex');
const name = `redial-smoke-${suffix}`, volume = `${name}-data`;
const directory = mkdtempSync(path.join(tmpdir(), 'redial-smoke-'));
const envFile = path.join(directory, 'runtime.env');
const password = randomBytes(32).toString('base64url');
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
writeFileSync(envFile, `REDIAL_DEPLOYMENT=development\nREDIAL_SITE_URL=https://dev.redial.si\nREDIAL_DEV_USERNAME=smoke-test\nREDIAL_DEV_PASSWORD=${password}\n`, { mode: 0o600 });
let started = false, volumeCreated = false;
try {
  docker('volume', 'create', volume); volumeCreated = true;
  docker('run', '--detach', '--name', name, '--publish', '127.0.0.1::3000', '--env-file', envFile,
    '--mount', `type=volume,src=${volume},dst=/app/.redial`, process.env.REDIAL_TEST_IMAGE || 'redial:development'); started = true;
  const address = () => `http://127.0.0.1:${docker('inspect', '--format', '{{(index (index .NetworkSettings.Ports "3000/tcp") 0).HostPort}}', name)}`;
  let base = address();
  const headers = { host: 'dev.redial.si', authorization: `Basic ${Buffer.from(`smoke-test:${password}`).toString('base64')}` };
  // Raw HTTP preserves the exact Host header used by a TLS reverse proxy.
  const get = (pathname, options = {}) => new Promise((resolve, reject) => {
    const outgoing = httpRequest(base + pathname, { method: options.method || 'GET', headers: options.headers,
      signal: AbortSignal.timeout(15000) }, incoming => {
      const chunks = [];
      incoming.on('data', chunk => chunks.push(chunk));
      incoming.on('error', reject);
      incoming.on('end', () => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(incoming.headers)) {
          for (const item of Array.isArray(value) ? value : [value]) if (item !== undefined) headers.append(key, item);
        }
        resolve(new Response(Buffer.concat(chunks), { status: incoming.statusCode, headers }));
      });
    });
    outgoing.on('error', reject); outgoing.end(options.body);
  });
  async function ready() {
    for (let attempt = 0; attempt < 60; attempt++) {
      try { if ((await get('/api/health/live')).ok) return; } catch { /* Wait for this test container only. */ }
      await setTimeout(500);
    }
    throw new Error('Test container did not become live.');
  }
  await ready();
  assert.deepEqual(await (await get('/api/health/live')).json(), { status: 'ok' });
  assert.equal((await get('/', { headers: { host: 'dev.redial.si' } })).status, 401);
  assert.equal((await get('/api/health/ready', { headers: { host: 'dev.redial.si' } })).status, 401);
  assert.equal((await get('/api/onboarding', { headers: { ...headers, authorization: 'Basic invalid' } })).status, 401);
  assert.equal((await get('/', { headers: { ...headers, host: 'elsewhere.test', 'x-forwarded-host': 'dev.redial.si' } })).status, 403);
  assert.equal((await get('/', { headers })).status, 200);
  assert.equal((await get('/api/health/ready', { headers })).status, 200);
  assert.equal((await get('/app', { headers })).status, 307);
  assert.equal((await get('/ops', { headers })).status, 307);
  assert.equal((await get('/api/demo/session', { method: 'POST', headers })).status, 403);
  assert.equal((await get('/api/demo/session', { method: 'POST', headers: { ...headers, origin: 'https://elsewhere.test' } })).status, 403);
  const session = await get('/api/demo/session', { method: 'POST', headers: { ...headers, origin: 'https://dev.redial.si' } });
  assert.equal(session.status, 201);
  const sessionCookie = session.headers.get('set-cookie');
  assert.match(sessionCookie, /Secure/i); assert.match(sessionCookie, /HttpOnly/i); assert.match(sessionCookie, /SameSite=strict/i);
  // Save an actual completed fixture so both member/admin projections and a
  // persisted volume are exercised without submitting anyone's personal data.
  const draft = { fullName: 'Container Test', email: 'container@example.test', phone: '+16025550149', lineType: 'personal',
    carrier: 'Mint Mobile', connection: 'conditional', connectionReviewed: true, checksReviewed: true,
    provider: 'redial', providerName: '', voice: 'Warm', screening: 'unknown', greeting: 'Hello, this is an AI development example.',
    step: 7, complete: true, acknowledgeLocal: true };
  const savedResponse = await get('/api/onboarding', { method: 'POST', headers: { ...headers, origin: 'https://dev.redial.si', 'content-type': 'application/json' }, body: JSON.stringify({ version: 0, draft }) });
  assert.equal(savedResponse.status, 201, `Onboarding fixture rejected: ${savedResponse.status}`);
  const cookie = savedResponse.headers.get('set-cookie'); assert.match(cookie, /Secure/i);
  const saved = await savedResponse.json();
  const sessionHeaders = { ...headers, cookie: cookie.split(';')[0] };
  const member = await (await get('/api/onboarding/account', { headers: sessionHeaders })).json();
  const admin = await (await get('/api/onboarding/management', { headers: sessionHeaders })).json();
  assert.deepEqual(member, admin);
  assert.equal(member.account.submission.profile.fullName, draft.fullName);
  assert.equal(docker('exec', name, 'id', '-u'), '1000');
  assert.equal(docker('exec', name, 'node', '-e', "const fs=require('fs');process.stdout.write(String(fs.existsSync('/app/.env.coolify.local')))"), 'false');
  docker('restart', name); base = address(); await ready();
  const restored = await (await get('/api/onboarding', { headers: sessionHeaders })).json();
  assert.equal(restored.saved.id, saved.saved.id);
  assert.equal(restored.saved.submission.profile.fullName, draft.fullName);
  const deleted = await get('/api/onboarding', { method: 'DELETE', headers: { ...sessionHeaders, origin: 'https://dev.redial.si' } });
  assert.equal(deleted.status, 200); assert.match(deleted.headers.get('set-cookie'), /Secure/i);
  console.log('Container checks passed: authentication, host/origin restrictions, readiness, secure cookies, closed live accounts, non-root process, persistent onboarding, deletion.');
} finally {
  if (started) docker('rm', '--force', name);
  if (volumeCreated) docker('volume', 'rm', volume);
  rmSync(envFile, { force: true });
  rmdirSync(directory);
}

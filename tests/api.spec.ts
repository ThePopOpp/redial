import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const origin = 'http://127.0.0.1:3210';

test('review API isolates sessions, rejects cross-origin changes, and never becomes real auth', async ({ request, playwright }) => {
  expect((await request.get('/api/demo/session')).status()).toBe(401);
  expect((await request.post('/api/demo/session')).status()).toBe(403);
  expect((await request.post('/api/demo/session', { headers: { origin: 'https://example.com' } })).status()).toBe(403);
  const response = await request.post('/api/demo/session', { headers: { origin } });
  expect(response.status()).toBe(201);
  expect(response.headers()['set-cookie']).toContain('HttpOnly');
  expect(response.headers()['set-cookie']).toContain('SameSite=strict');
  const { state } = await response.json();
  const mutation = await request.post('/api/demo/commands', { headers: { origin, 'Idempotency-Key': randomUUID() }, data: { version: state.version, command: { type: 'call.delete', id: 'delivery-example' } } });
  expect(mutation.status()).toBe(200);
  const separate = await playwright.request.newContext({ baseURL: origin });
  const other = await separate.post('/api/demo/session', { headers: { origin } });
  expect((await other.json()).state.calls).toHaveLength(5);
  await separate.dispose();
  expect((await request.get('/app', { maxRedirects: 0 })).status()).toBe(307);
  expect((await request.get('/ops', { maxRedirects: 0 })).status()).toBe(307);
});
test('review commands are strict, version checked and idempotent', async ({ request }) => {
  const opened = await request.post('/api/demo/session', { headers: { origin } });
  const { state } = await opened.json(); const key = randomUUID();
  const headers = { origin, 'Idempotency-Key': key };
  const data = { version: state.version, command: { type: 'task.create', title: 'Exactly once', owner: 'Review' } };
  const first = await request.post('/api/demo/commands', { headers, data }); expect(first.status()).toBe(200);
  const replay = await request.post('/api/demo/commands', { headers, data }); expect(replay.status()).toBe(200);
  const replayData = await replay.json(); expect(replayData.replayed).toBe(true); expect(replayData.state.tasks.filter((item: { title: string }) => item.title === 'Exactly once')).toHaveLength(1);
  expect((await request.post('/api/demo/commands', { headers, data: { ...data, command: { ...data.command, title: 'Different' } } })).status()).toBe(409);
  expect((await request.post('/api/demo/commands', { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data })).status()).toBe(409);
  expect((await request.post('/api/demo/commands', { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data: { version: replayData.state.version, command: { type: 'task.create', title: 'X', owner: 'Y', role: 'admin' } } })).status()).toBe(400);
  expect((await request.post('/api/demo/commands', { headers: { ...headers, origin: 'null' }, data })).status()).toBe(403);
});
test('simultaneous state changes serialize with one stale loser', async ({ request }) => {
  const opened = await request.post('/api/demo/session', { headers: { origin } });
  const { state } = await opened.json();
  const responses = await Promise.all(['First', 'Second'].map(title => request.post('/api/demo/commands', { headers: { origin, 'Idempotency-Key': randomUUID() }, data: { version: state.version, command: { type: 'task.create', title, owner: 'Review' } } })));
  expect(responses.map(response => response.status()).sort()).toEqual([200, 409]);
  const latest = await (await request.get('/api/demo/session')).json();
  expect(latest.state.tasks.length).toBe(state.tasks.length + 1);
});

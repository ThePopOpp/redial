import 'server-only';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { makeReviewState } from './seed';
import { applyReviewCommand, requestSchema, ReviewError } from './commands';
import type { ReviewState } from './model';
import { runtime } from '@/lib/runtime';
import { checkAccess } from '../../../config/access.mjs';

const directory = () => path.join(runtime().dataDir, 'reviews');
const cookieName = 'redial_local_review';
const lifetime = 8 * 60 * 60 * 1000;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
type RecordFile = { expiresAt: number; state: ReviewState; keys: { key: string; hash: string; version: number }[] };
const globalStore = globalThis as typeof globalThis & { redialReviewLocks?: Map<string, Promise<unknown>> };
const locks = globalStore.redialReviewLocks ??= new Map();

export function checkLocalRequest(request: Request, mutation = false) {
  const denied = checkAccess(request, runtime(), mutation);
  if (denied) throw new ReviewError(denied.status, denied.code, denied.message);
}
function location(id: string) { return path.join(directory(), `${id}.json`); }
async function read(id: string): Promise<RecordFile> {
  try {
    const record = JSON.parse(await readFile(location(id), 'utf8')) as RecordFile;
    if (record.expiresAt <= Date.now()) throw new ReviewError(401, 'EXPIRED', 'Your local review expired. Reload to start a new one.');
    return record;
  } catch (error) {
    if (error instanceof ReviewError) throw error;
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new ReviewError(401, 'EXPIRED', 'Your local review is no longer available. Reload to start a new one.');
    throw error;
  }
}
async function save(id: string, record: RecordFile) {
  await mkdir(directory(), { recursive: true });
  const temporary = path.join(directory(), `${id}.${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(record), { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, location(id));
}
async function serial<T>(id: string, operation: () => Promise<T>): Promise<T> {
  const prior = locks.get(id) ?? Promise.resolve();
  const next = prior.catch(() => undefined).then(operation);
  locks.set(id, next);
  try { return await next; } finally { if (locks.get(id) === next) locks.delete(id); }
}
async function sessionId() {
  const id = (await cookies()).get(cookieName)?.value;
  if (!id || !uuidPattern.test(id)) throw new ReviewError(401, 'NO_SESSION', 'Start a local review first.');
  return id;
}
export function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store', 'Vary': 'Cookie' } }); }
export function failure(error: unknown) {
  if (error instanceof ReviewError) return json({ error: error.message, code: error.code }, error.status);
  console.error('Local review storage failure', error instanceof Error ? error.message : 'Unknown error');
  return json({ error: 'Local storage is unavailable. Your change was not confirmed.', code: 'STORAGE' }, 500);
}
export async function openReview() {
  try { const id = await sessionId(); return json({ state: (await read(id)).state }); }
  catch (error) { if (!(error instanceof ReviewError) || error.status !== 401) throw error; }
  await mkdir(directory(), { recursive: true });
  // Bounded, local-only cleanup of expired fixture files; filenames never come from input.
  for (const name of (await readdir(directory())).filter(name => uuidPattern.test(name.replace(/\.json$/, ''))).slice(0, 200)) {
    try { const record = JSON.parse(await readFile(path.join(directory(), name), 'utf8')) as RecordFile; if (record.expiresAt <= Date.now()) await unlink(path.join(directory(), name)); } catch { /* Other active requests may have removed an expired file. */ }
  }
  const id = randomUUID();
  const record = { expiresAt: Date.now() + lifetime, state: makeReviewState(), keys: [] };
  await save(id, record);
  const response = json({ state: record.state }, 201);
  response.cookies.set(cookieName, id, { httpOnly: true, sameSite: 'strict', secure: runtime().secureCookies, path: '/api/demo', maxAge: lifetime / 1000 });
  return response;
}
export async function getReview() { return json({ state: (await read(await sessionId())).state }); }
export async function mutateReview(request: Request) {
  const id = await sessionId();
  const key = request.headers.get('idempotency-key');
  if (!key || !uuidPattern.test(key)) throw new ReviewError(400, 'IDEMPOTENCY_KEY', 'A valid action identifier is required.');
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ReviewError(415, 'CONTENT_TYPE', 'Send JSON for a local change.');
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 16384) throw new ReviewError(413, 'TOO_LARGE', 'This local change is too large.');
  let body: unknown;
  try { body = JSON.parse(raw); } catch { throw new ReviewError(400, 'JSON', 'The change is not valid JSON.'); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) throw new ReviewError(400, 'VALIDATION', parsed.error.issues.map(issue => issue.message).join(' '));
  const hash = createHash('sha256').update(JSON.stringify(parsed.data)).digest('hex');
  return serial(id, async () => {
    const record = await read(id);
    const prior = record.keys.find(item => item.key === key);
    if (prior) {
      if (prior.hash !== hash) throw new ReviewError(409, 'KEY_REUSE', 'This action identifier was already used for a different change.');
      return json({ state: record.state, replayed: true, appliedVersion: prior.version });
    }
    if (parsed.data.version !== record.state.version) return json({ error: 'This review changed in another tab. The latest version is loaded; review and retry your action.', code: 'STALE_VERSION', state: record.state }, 409);
    record.state = applyReviewCommand(record.state, parsed.data.command);
    record.keys.unshift({ key, hash, version: record.state.version }); record.keys = record.keys.slice(0, 100);
    await save(id, record);
    return json({ state: record.state });
  });
}

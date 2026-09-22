import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import { cookies } from 'next/headers';
import { json } from '@/lib/review/store';
import { ReviewError } from '@/lib/review/commands';
import { onboardingRequestSchema, setupManagementSchema, validateDraft, type SavedOnboarding, type SetupAccount } from './onboarding';

const root = path.join(process.cwd(), '.redial', 'onboarding');
const cookie = 'redial_setup_draft';
const pattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const local = globalThis as typeof globalThis & { redialSetupLocks?: Map<string, Promise<unknown>>; redialSetupExpiry?: Map<string, ReturnType<typeof setTimeout>> };
const locks = local.redialSetupLocks ??= new Map();
const expirations = local.redialSetupExpiry ??= new Map();

function cancelExpiry(id: string) { const timer = expirations.get(id); if (timer) clearTimeout(timer); expirations.delete(id); }
function expireAt(id: string, expiry: number | null) {
  if (expiry === null) { cancelExpiry(id); return; }
  if (expirations.has(id)) return;
  const timer = setTimeout(() => { expirations.delete(id); void serial(id, () => read(id)).catch(() => console.error('A local setup expiration could not be completed.')); }, Math.max(1, expiry - Date.now() + 5));
  timer.unref(); expirations.set(id, timer);
}
async function serial<T>(id: string, operation: () => Promise<T>): Promise<T> {
  const prior = locks.get(id) ?? Promise.resolve();
  const next = prior.catch(() => undefined).then(operation); locks.set(id, next);
  try { return await next; } finally { if (locks.get(id) === next) locks.delete(id); }
}
async function currentId() { const id = (await cookies()).get(cookie)?.value; return id && pattern.test(id) ? id : null; }
async function read(id: string): Promise<SavedOnboarding | null> {
  try {
    const record = JSON.parse(await readFile(path.join(root, `${id}.json`), 'utf8')) as SavedOnboarding;
    if (record.expiresAt !== null && record.expiresAt <= Date.now()) { await unlink(path.join(root, `${id}.json`)); cancelExpiry(id); return null; }
    return record;
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
async function restoreExpirations() {
  try { for (const filename of await readdir(root)) { const id = filename.replace(/\.json$/, ''); if (!filename.endsWith('.json') || !pattern.test(id) || expirations.has(id)) continue; await serial(id, async () => { const saved = await read(id); if (saved) expireAt(id, saved.expiresAt); }); } }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}
async function write(saved: SavedOnboarding) {
  await mkdir(root, { recursive: true });
  const temporary = path.join(root, `${saved.id}.${randomUUID()}.tmp`);
  try { await writeFile(temporary, JSON.stringify(saved), { encoding: 'utf8', mode: 0o600 }); await rename(temporary, path.join(root, `${saved.id}.json`)); }
  finally { await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }); }
  expireAt(saved.id, saved.expiresAt);
}
function withCookie(saved: SavedOnboarding, status = 200) {
  const response = json({ saved }, status);
  response.cookies.set(cookie, saved.id, { httpOnly: true, sameSite: 'strict', secure: false, path: '/api/onboarding', maxAge: saved.expiresAt === null ? 365 * 24 * 3600 : Math.max(1, Math.floor((saved.expiresAt - Date.now()) / 1000)) });
  return response;
}
async function body(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ReviewError(415, 'JSON_REQUIRED', 'Send JSON to save your setup.');
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 8192) throw new ReviewError(413, 'TOO_LARGE', 'This setup request is too large.');
  try { return JSON.parse(raw) as unknown; } catch { throw new ReviewError(400, 'JSON', 'The setup request is not valid JSON.'); }
}
function stale() { return new ReviewError(409, 'STALE_DRAFT', 'This setup changed in another tab or expired. Reload the latest saved version before continuing.'); }
function account(record: SavedOnboarding | null): SetupAccount {
  if (!record?.submission) throw new ReviewError(404, 'NO_SUBMISSION', 'Complete the setup form in this browser to see your account.');
  return { id: record.id, version: record.version, submission: record.submission };
}
export async function getOnboarding() { await restoreExpirations(); const id = await currentId(); return json({ saved: id ? await serial(id, () => read(id)) : null }); }
export async function saveOnboarding(request: Request) {
  const parsed = onboardingRequestSchema.safeParse(await body(request));
  if (!parsed.success) throw new ReviewError(400, 'VALIDATION', 'Check the setup fields and try again.');
  const errors = validateDraft(parsed.data.draft);
  if (Object.keys(errors).length) return json({ error: 'Please complete the required setup fields.', fields: errors }, 400);
  const existingId = await currentId(), id = existingId ?? randomUUID();
  return serial(id, async () => {
    const existing = existingId ? await read(existingId) : null;
    if (parsed.data.version !== (existing?.version ?? 0)) throw stale();
    const now = new Date().toISOString(), draft = parsed.data.draft;
    let submission = existing?.submission;
    if (draft.complete && JSON.stringify(submission?.profile) !== JSON.stringify(draft)) {
      submission = { accountId: submission?.accountId ?? randomUUID(), submittedAt: submission?.submittedAt ?? now, updatedAt: now, profile: draft, status: 'pending_review', note: '', history: [...(submission?.history ?? []), { at: now, action: submission ? 'Updated setup submitted for review' : 'Setup submitted to member and admin views' }].slice(-50) };
    }
    // Both management views read this atomic record. Draft edits leave the last
    // submitted profile intact until the user finishes the form again.
    const saved: SavedOnboarding = { id, version: (existing?.version ?? 0) + 1, updatedAt: now, expiresAt: submission ? null : existing?.expiresAt ?? Date.now() + 8 * 3600_000, draft, ...(submission ? { submission } : {}) };
    await write(saved); return withCookie(saved, existing ? 200 : 201);
  });
}
export async function getSetupAccount() {
  const id = await currentId();
  return json({ account: account(id ? await serial(id, () => read(id)) : null) });
}
export async function manageSetup(request: Request) {
  const parsed = setupManagementSchema.safeParse(await body(request));
  if (!parsed.success) throw new ReviewError(400, 'VALIDATION', 'Choose a review status and keep your note under 1,000 characters.');
  const id = await currentId();
  if (!id) throw new ReviewError(404, 'NO_SUBMISSION', 'Complete the setup form in this browser first.');
  return serial(id, async () => {
    const saved = await read(id); account(saved);
    if (!saved?.submission) throw new ReviewError(404, 'NO_SUBMISSION', 'This setup is unavailable.');
    if (saved.version !== parsed.data.version) throw stale();
    const { status, note } = parsed.data;
    if (status === saved.submission.status && note === saved.submission.note) return json({ account: account(saved) });
    const now = new Date().toISOString();
    saved.version++; saved.updatedAt = now;
    saved.submission = { ...saved.submission, status, note, updatedAt: now, history: [...saved.submission.history, { at: now, action: `Review updated: ${status.replaceAll('_', ' ')}` }].slice(-50) };
    await write(saved); return json({ account: account(saved) });
  });
}
export async function deleteOnboarding() {
  const id = await currentId();
  if (id) await serial(id, async () => { try { await unlink(path.join(root, `${id}.json`)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } cancelExpiry(id); });
  const response = json({ deleted: true }); response.cookies.set(cookie, '', { path: '/api/onboarding', maxAge: 0, httpOnly: true, sameSite: 'strict' }); return response;
}

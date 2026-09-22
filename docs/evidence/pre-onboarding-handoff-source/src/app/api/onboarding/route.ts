import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import { cookies } from 'next/headers';
import { checkLocalRequest, failure, json } from '@/lib/review/store';
import { onboardingRequestSchema, validateDraft, type OnboardingDraft } from '@/lib/landing/onboarding';
import { ReviewError } from '@/lib/review/commands';

export const runtime = 'nodejs';
const root = path.join(process.cwd(), '.redial', 'onboarding');
const cookie = 'redial_setup_draft';
const pattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
type Saved = { id: string; version: number; expiresAt: number; updatedAt: string; draft: OnboardingDraft };
const local = globalThis as typeof globalThis & { redialSetupLocks?: Map<string, Promise<unknown>>; redialSetupExpiry?: Map<string, ReturnType<typeof setTimeout>> };
const locks = local.redialSetupLocks ??= new Map();
const expirations = local.redialSetupExpiry ??= new Map();
function expireAt(id: string, expiry: number) {
  if (expirations.has(id)) return;
  const timer = setTimeout(() => { expirations.delete(id); void (locks.get(id) ?? Promise.resolve()).catch(() => undefined).then(() => read(id)).catch(() => { console.error('A local setup expiration could not be completed.'); }); }, Math.max(1, expiry - Date.now() + 5));
  timer.unref(); expirations.set(id, timer);
}
async function restoreExpirations() {
  try { for (const filename of await readdir(root)) { const id = filename.replace(/\.json$/, ''); if (!filename.endsWith('.json') || !pattern.test(id) || expirations.has(id)) continue; const saved = await read(id); if (saved) expireAt(id, saved.expiresAt); } }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}
async function currentId() { const id = (await cookies()).get(cookie)?.value; return id && pattern.test(id) ? id : null; }
async function read(id: string): Promise<Saved | null> {
  try { const record = JSON.parse(await readFile(path.join(root, `${id}.json`), 'utf8')) as Saved; if (record.expiresAt <= Date.now()) { await unlink(path.join(root, `${id}.json`)); return null; } return record; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
export async function GET(request: Request) {
  try { checkLocalRequest(request); await restoreExpirations(); const id = await currentId(); return json({ saved: id ? await read(id) : null }); } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    checkLocalRequest(request, true);
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ReviewError(415, 'JSON_REQUIRED', 'Send JSON to save your setup.');
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 8192) throw new ReviewError(413, 'TOO_LARGE', 'This setup draft is too large.');
    let body: unknown; try { body = JSON.parse(raw); } catch { throw new ReviewError(400, 'JSON', 'The setup draft is not valid JSON.'); }
    const parsed = onboardingRequestSchema.safeParse(body);
    if (!parsed.success) throw new ReviewError(400, 'VALIDATION', 'Check the setup fields and try again.');
    const errors = validateDraft(parsed.data.draft);
    if (Object.keys(errors).length) return json({ error: 'Please complete the required setup fields.', fields: errors }, 400);
    const existingId = await currentId(); const id = existingId ?? randomUUID();
    const previous = locks.get(id) ?? Promise.resolve();
    const operation = previous.catch(() => undefined).then(async () => {
      const existing = existingId ? await read(existingId) : null;
      if (parsed.data.version !== (existing?.version ?? 0)) throw new ReviewError(409, 'STALE_DRAFT', 'This draft changed in another tab or expired. Reload to load the latest saved version before continuing.');
      const saved: Saved = { id, version: (existing?.version ?? 0) + 1, updatedAt: new Date().toISOString(), expiresAt: existing?.expiresAt ?? Date.now() + 8 * 3600_000, draft: parsed.data.draft };
      await mkdir(root, { recursive: true });
      const temporary = path.join(root, `${id}.${randomUUID()}.tmp`);
      await writeFile(temporary, JSON.stringify(saved), { encoding: 'utf8', mode: 0o600 });
      await rename(temporary, path.join(root, `${id}.json`));
      expireAt(id, saved.expiresAt);
      const response = json({ saved }, existing ? 200 : 201);
      response.cookies.set(cookie, id, { httpOnly: true, sameSite: 'strict', secure: false, path: '/api/onboarding', maxAge: Math.max(1, Math.floor((saved.expiresAt - Date.now()) / 1000)) });
      return response;
    });
    locks.set(id, operation);
    try { return await operation; } finally { if (locks.get(id) === operation) locks.delete(id); }
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    checkLocalRequest(request, true); const id = await currentId();
    if (id) { const previous = locks.get(id) ?? Promise.resolve(); const operation = previous.catch(() => undefined).then(async () => { try { await unlink(path.join(root, `${id}.json`)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } }); locks.set(id, operation); try { await operation; } finally { if (locks.get(id) === operation) locks.delete(id); } }
    const response = json({ deleted: true }); response.cookies.set(cookie, '', { path: '/api/onboarding', maxAge: 0, httpOnly: true, sameSite: 'strict' }); return response;
  } catch (error) { return failure(error); }
}

import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { readRuntime } from '../../../../../config/runtime.mjs';
import { checkAccess } from '../../../../../config/access.mjs';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  let probe: string | undefined;
  try {
    const config = readRuntime();
    const denied = checkAccess(request, config);
    if (denied) return NextResponse.json({ error: denied.message }, { status: denied.status, headers: { 'Cache-Control': 'no-store' } });
    await mkdir(config.dataDir, { recursive: true });
    probe = path.join(config.dataDir, `.readiness-${randomUUID()}`);
    await writeFile(probe, 'ok', { flag: 'wx', mode: 0o600 });
    await unlink(probe); probe = undefined;
    return NextResponse.json({ status: 'ready', scope: 'development preview' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  } finally { if (probe) await unlink(probe).catch(() => undefined); }
}

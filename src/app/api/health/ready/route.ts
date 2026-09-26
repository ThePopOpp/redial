import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { readRuntime } from '../../../../../config/runtime.mjs';
import { checkAccess } from '../../../../../config/access.mjs';
import { supabaseConfig } from '@/lib/supabase/config';

// Readiness covers the two things a replacement container can get wrong: a data
// volume it cannot write, and a Supabase project it cannot reach. Neither check
// asserts that migrations or RLS policies are correct.
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

    const supabase = supabaseConfig();
    let auth = 'not_configured';
    if (supabase) {
      const result = await fetch(`${supabase.url}/auth/v1/health`, { headers: { apikey: supabase.key }, signal: AbortSignal.timeout(5000), cache: 'no-store' });
      auth = result.ok ? 'reachable' : 'unavailable';
    }
    const ready = auth !== 'unavailable';
    return NextResponse.json({ status: ready ? 'ready' : 'unavailable', storage: 'writable', auth,
      databasePermissions: 'require_authenticated_verification', scope: 'development preview' },
      { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  } finally { if (probe) await unlink(probe).catch(() => undefined); }
}

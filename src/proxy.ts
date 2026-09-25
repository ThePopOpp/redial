import { NextResponse, type NextRequest } from 'next/server';
import { readRuntime } from '../config/runtime.mjs';
import { checkAccess } from '../config/access.mjs';

export function proxy(request: NextRequest) {
  // Public liveness is deliberately content-free, including when config fails.
  if (request.nextUrl.pathname === '/api/health/live') return NextResponse.next();
  try {
    const runtime = readRuntime();
    // Preserve the existing local page behavior; local APIs also check access.
    if (runtime.deployment === 'local') return NextResponse.next();
    const denied = checkAccess(request, runtime, !['GET', 'HEAD', 'OPTIONS'].includes(request.method));
    if (denied) return NextResponse.json({ error: denied.message, code: denied.code }, { status: denied.status,
      headers: { 'Cache-Control': 'no-store', ...(denied.status === 401 ? { 'WWW-Authenticate': 'Basic realm="Redial development", charset="UTF-8"' } : {}) } });
    return NextResponse.next();
  } catch {
    return NextResponse.json({ error: 'Development configuration is unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export const config = { matcher: '/:path*' };

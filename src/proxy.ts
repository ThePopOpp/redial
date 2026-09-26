import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { readRuntime } from '../config/runtime.mjs';
import { checkAccess } from '../config/access.mjs';
import { supabaseConfig } from '@/lib/supabase/config';

// Paths that carry an authenticated Supabase session. Kept narrow on purpose:
// the access gate below runs everywhere, but refreshing a session costs a
// network round trip, so the marketing site and static assets skip it.
const publicPaths = /^\/legal(?:\/|$)/;
const sessionPaths = /^\/(?:app|ops|auth|account|api\/v1)(?:\/|$)|^\/(?:sign-in|staff-sign-in)$/;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Public liveness is deliberately content-free, including when config fails.
  if (pathname === '/api/health/live') return NextResponse.next();
  // Legal documents stay reachable without the development password: A2P 10DLC
  // campaign vetting fetches the Privacy Policy and Terms URLs directly, and a
  // 401 there fails the campaign. They contain no customer data.
  if (publicPaths.test(pathname)) return NextResponse.next();

  let runtime;
  try {
    runtime = readRuntime();
  } catch {
    // Fail closed: an unparseable environment must not serve the application.
    return NextResponse.json({ error: 'Configuration is unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  // The perimeter runs before any session work, so a rejected request never
  // costs a Supabase round trip and a failed password never refreshes a cookie.
  // Local development keeps the loopback-only behavior of the preview APIs,
  // which check access themselves.
  if (runtime.deployment !== 'local') {
    const denied = checkAccess(request, runtime, !['GET', 'HEAD', 'OPTIONS'].includes(request.method));
    if (denied) return NextResponse.json({ error: denied.message, code: denied.code }, { status: denied.status,
      headers: { 'Cache-Control': 'no-store', ...(denied.status === 401 ? { 'WWW-Authenticate': 'Basic realm="Redial development", charset="UTF-8"' } : {}) } });
  }

  let response = NextResponse.next({ request });
  if (sessionPaths.test(pathname)) {
    const config = supabaseConfig();
    if (config) {
      const db = createServerClient(config.url, config.key, { cookieOptions: { httpOnly: true, sameSite: 'lax', secure: runtime.secureCookies }, cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: values => {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      } });
      // Refresh only. Every protected page/action independently verifies the user
      // and queries current membership; this proxy is not an authorization grant.
      // That remains true even though the matcher now covers the whole site: the
      // access gate above is a perimeter, not an identity.
      await db.auth.getUser();
    }
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Pragma', 'no-cache');
  }
  return response;
}

export const config = { matcher: '/:path*' };

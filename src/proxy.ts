import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = supabaseConfig();
  if (config) {
    const db = createServerClient(config.url, config.key, { cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.APP_BASE_URL?.startsWith('https://') ?? false }, cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: values => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    } });
    // Refresh only. Every protected page/action independently verifies the user
    // and queries current membership; this proxy is not an authorization grant.
    await db.auth.getUser();
  }
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Pragma', 'no-cache');
  return response;
}
export const config = { matcher: ['/app/:path*', '/ops/:path*', '/auth/:path*', '/sign-in', '/staff-sign-in', '/account/:path*', '/api/v1/:path*'] };

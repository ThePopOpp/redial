import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/supabase/server';
import { appOrigin } from '@/lib/supabase/config';

export async function GET(request: Request) {
  const url = new URL(request.url), code = url.searchParams.get('code');
  const db = await serverSupabase();
  if (db && code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(url.searchParams.get('recovery') === '1' ? '/account/password' : '/app', appOrigin()), { headers: { 'Cache-Control': 'private, no-store' } });
  }
  return NextResponse.redirect(new URL('/sign-in?notice=expired', appOrigin()));
}

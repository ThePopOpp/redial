import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/supabase/server';
import { appOrigin } from '@/lib/supabase/config';

export async function GET(request: Request) {
  const url = new URL(request.url), code = url.searchParams.get('code');
  const recovery = url.searchParams.get('recovery') === '1';
  const db = await serverSupabase();
  if (db && code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(recovery ? '/account/password' : '/app', appOrigin()), { headers: { 'Cache-Control': 'private, no-store' } });
  }
  // A recovery link is single use, so the common failure is a second click on an
  // already-spent link rather than a bad session. Sending that to sign-in tells
  // someone to sign in with the password they came here to replace; the place to
  // land is the form that issues a new link.
  return NextResponse.redirect(new URL(recovery ? '/forgot-password?notice=used' : '/sign-in?notice=expired', appOrigin()));
}

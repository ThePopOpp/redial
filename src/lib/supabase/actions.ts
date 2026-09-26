'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { serverSupabase } from './server';
import { appOrigin } from './config';
import { legalVersion } from '@/lib/legal';
import { contactReturnPath } from '@/lib/dashboard/contact-import';

export async function authAction(form: FormData) {
  const origin = (await headers()).get('origin');
  if (origin !== appOrigin()) redirect('/sign-in?notice=origin');
  const input = z.object({
    action: z.enum(['signin', 'signup', 'reset', 'password', 'signout']),
    email: z.email().optional(),
    password: z.string().min(12).max(128).optional(),
    name: z.string().trim().min(1).max(100).optional(),
  }).safeParse({
    action: form.get('action'),
    ...(form.get('email') ? { email: form.get('email') } : {}),
    ...(form.get('password') ? { password: form.get('password') } : {}),
    ...(form.get('name') ? { name: form.get('name') } : {}),
  });
  const signingUp = form.get('action') === 'signup';
  if (!input.success) redirect(signingUp ? '/register?notice=invalid' : '/sign-in?notice=invalid');
  const db = await serverSupabase();
  if (!db) redirect('/sign-in');
  const { action, email, password, name } = input.data;
  if (action === 'signout') { await db.auth.signOut(); redirect('/sign-in'); }
  if (action === 'reset' && email) {
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${appOrigin()}/auth/callback?recovery=1` });
    // Supabase refuses a second recovery request within its send window. Saying
    // "check your inbox" then is worse than saying nothing: the person waits for
    // a message that was never sent. The wording describes the request, not the
    // account, so it still does not confirm whether an address is registered.
    redirect(error?.code === 'over_email_send_rate_limit' ? '/forgot-password?notice=slow' : '/forgot-password?notice=email');
  }
  if (action === 'password' && password) {
    const { data, error: identityError } = await db.auth.getUser();
    if (identityError || !data.user) redirect('/sign-in');
    const { error } = await db.auth.updateUser({ password });
    redirect(error ? '/account/password?notice=failed' : '/app?notice=password');
  }
  if (!email || !password) redirect(signingUp ? '/register?notice=invalid' : '/sign-in?notice=invalid');
  if (action === 'signup') {
    // Acceptance is required, not implied by using the form.
    if (form.get('terms') !== 'accepted' || !name) redirect('/register?notice=terms');
    // Recorded against the account so a later change to the documents stays
    // distinguishable from the version this person agreed to. User metadata is
    // editable by the account holder, so this is a record of what we presented,
    // not tamper-proof evidence; durable consent moves to consent_events with
    // the messaging schema.
    const { error } = await db.auth.signUp({ email, password, options: {
      emailRedirectTo: `${appOrigin()}/auth/callback`,
      data: { name, terms_version: legalVersion, terms_accepted_at: new Date().toISOString() },
    } });
    redirect(error ? '/register?notice=failed' : '/register?notice=email');
  }
  const { error } = await db.auth.signInWithPassword({ email, password });
  const next = contactReturnPath(form.get('next'));
  if (error) redirect(`/sign-in?notice=failed&next=${encodeURIComponent(next)}`);
  redirect(form.get('staff') === '1' ? '/ops' : next);
}

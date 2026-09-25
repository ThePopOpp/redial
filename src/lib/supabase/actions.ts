'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { serverSupabase } from './server';
import { appOrigin } from './config';
import { contactReturnPath } from '@/lib/dashboard/contact-import';

export async function authAction(form: FormData) {
  const origin = (await headers()).get('origin');
  if (origin !== appOrigin()) redirect('/sign-in?notice=origin');
  const input = z.object({ action: z.enum(['signin', 'signup', 'reset', 'password', 'signout']), email: z.email().optional(), password: z.string().min(12).max(128).optional() }).safeParse({ action: form.get('action'), ...(form.get('email') ? { email: form.get('email') } : {}), ...(form.get('password') ? { password: form.get('password') } : {}) });
  if (!input.success) redirect('/sign-in?notice=invalid');
  const db = await serverSupabase();
  if (!db) redirect('/sign-in');
  const { action, email, password } = input.data;
  if (action === 'signout') { await db.auth.signOut(); redirect('/sign-in'); }
  if (action === 'reset' && email) {
    await db.auth.resetPasswordForEmail(email, { redirectTo: `${appOrigin()}/auth/callback?recovery=1` });
    redirect('/sign-in?notice=email');
  }
  if (action === 'password' && password) {
    const { data, error: identityError } = await db.auth.getUser();
    if (identityError || !data.user) redirect('/sign-in');
    const { error } = await db.auth.updateUser({ password });
    redirect(error ? '/account/password?notice=failed' : '/app?notice=password');
  }
  if (!email || !password) redirect('/sign-in?notice=invalid');
  if (action === 'signup') {
    const { error } = await db.auth.signUp({ email, password, options: { emailRedirectTo: `${appOrigin()}/auth/callback` } });
    redirect(error ? '/sign-in?notice=failed' : '/sign-in?notice=email');
  }
  const { error } = await db.auth.signInWithPassword({ email, password });
  const next = contactReturnPath(form.get('next'));
  if (error) redirect(`/sign-in?notice=failed&next=${encodeURIComponent(next)}`);
  redirect(form.get('staff') === '1' ? '/ops' : next);
}

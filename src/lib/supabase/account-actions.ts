'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { serverSupabase, verifiedAccount } from './server';
import { appOrigin } from './config';

// Account-level settings: the person, not the workspace. Line rules, contacts
// and notification preferences stay with the workspace they belong to.
export async function accountAction(form: FormData) {
  if ((await headers()).get('origin') !== appOrigin()) redirect('/account?notice=origin');
  const account = await verifiedAccount();
  if (!account) redirect('/sign-in');
  const action = form.get('action');

  if (action === 'signout_all') {
    const db = await serverSupabase();
    // Global scope ends every session on every device, including this one.
    await db?.auth.signOut({ scope: 'global' });
    redirect('/sign-in?notice=email');
  }

  if (action === 'profile') {
    const name = z.string().trim().min(1).max(100).safeParse(form.get('name'));
    if (!name.success) redirect('/account?notice=failed');
    const { error } = await account.db.auth.updateUser({ data: { name: name.data } });
    revalidatePath('/account');
    redirect(error ? '/account?notice=failed' : '/account?notice=saved');
  }

  if (action === 'password') {
    const password = z.string().min(12).max(128).safeParse(form.get('password'));
    if (!password.success) redirect('/account?notice=failed');
    const { error } = await account.db.auth.updateUser({ password: password.data });
    redirect(error ? '/account?notice=failed' : '/account?notice=password');
  }

  redirect('/account?notice=failed');
}

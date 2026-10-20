export const dynamic = 'force-dynamic';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AccessUnavailable } from '@/components/access-unavailable';
import { supabaseConfig } from '@/lib/supabase/config';
import { AuthShell } from '@/components/auth/auth-shell';
import { RegisterForm } from '@/components/auth/forms';
import { CheckInbox } from '@/components/auth/check-inbox';

export const metadata: Metadata = { title: 'Create your account', robots: { index: false, follow: false } };

export default async function Register({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!supabaseConfig()) return <AccessUnavailable audience="member" />;
  const { notice } = await searchParams;
  // A sent confirmation is a finished state, not a message above an empty
  // form. Leaving the form in place made a successful sign-up look rejected.
  const sent = notice === 'email';
  return <AuthShell
    title={sent ? 'One link away.' : 'A quieter day starts here.'}
    description={sent
      ? 'Your account is created the moment you follow the link we sent.'
      : 'Create an account to set up screening, decide which calls reach you, and read the messages your assistant takes.'}
    notice={sent ? undefined : notice}
    alternate={sent ? undefined : <>Already have an account? <Link href="/sign-in">Sign in</Link></>}
  >{sent ? <CheckInbox /> : <RegisterForm />}</AuthShell>;
}

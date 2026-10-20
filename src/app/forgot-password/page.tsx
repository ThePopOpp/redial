export const dynamic = 'force-dynamic';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AccessUnavailable } from '@/components/access-unavailable';
import { supabaseConfig } from '@/lib/supabase/config';
import { AuthShell } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/auth/forms';
import { CheckInbox } from '@/components/auth/check-inbox';

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false, follow: false } };

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!supabaseConfig()) return <AccessUnavailable audience="member" />;
  const { notice } = await searchParams;
  const sent = notice === 'email';
  return <AuthShell
    title={sent ? 'One link away.' : 'Let’s get you back in.'}
    description={sent
      ? 'Follow the link to choose a new password. Your current one keeps working until you do.'
      : 'Enter the email address on your account and we will send you a link to choose a new password.'}
    notice={sent ? undefined : notice}
    alternate={sent ? undefined : <>Remembered it? <Link href="/sign-in">Back to sign in</Link></>}
  >{sent ? <CheckInbox action="reset" /> : <ForgotPasswordForm />}</AuthShell>;
}

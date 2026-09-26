export const dynamic = 'force-dynamic';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AccessUnavailable } from '@/components/access-unavailable';
import { supabaseConfig } from '@/lib/supabase/config';
import { AuthShell } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/auth/forms';

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false, follow: false } };

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!supabaseConfig()) return <AccessUnavailable audience="member" />;
  return <AuthShell
    title="Let’s get you back in."
    description="Enter the email address on your account and we will send you a link to choose a new password."
    notice={(await searchParams).notice}
    alternate={<>Remembered it? <Link href="/sign-in">Back to sign in</Link></>}
  ><ForgotPasswordForm /></AuthShell>;
}

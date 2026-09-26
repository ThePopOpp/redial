export const dynamic = 'force-dynamic';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AccessUnavailable } from '@/components/access-unavailable';
import { supabaseConfig } from '@/lib/supabase/config';
import { AuthShell } from '@/components/auth/auth-shell';
import { RegisterForm } from '@/components/auth/forms';

export const metadata: Metadata = { title: 'Create your account', robots: { index: false, follow: false } };

export default async function Register({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!supabaseConfig()) return <AccessUnavailable audience="member" />;
  return <AuthShell
    title="A quieter day starts here."
    description="Create an account to set up screening, decide which calls reach you, and read the messages your assistant takes."
    notice={(await searchParams).notice}
    alternate={<>Already have an account? <Link href="/sign-in">Sign in</Link></>}
  ><RegisterForm /></AuthShell>;
}

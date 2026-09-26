export const dynamic = 'force-dynamic';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AccessUnavailable } from '@/components/access-unavailable';
import { supabaseConfig } from '@/lib/supabase/config';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignInForm } from '@/components/auth/forms';

export const metadata: Metadata = { title: 'Member sign-in', robots: { index: false, follow: false } };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ notice?: string; next?: string }> }) {
  const query = await searchParams;
  if (!supabaseConfig()) return <AccessUnavailable audience="member" />;
  return <AuthShell
    title="Welcome back."
    description="Sign in to review your calls, adjust your screening rules and manage your membership."
    notice={query.notice}
    alternate={<>Don’t have an account? <Link href="/register">Create one</Link></>}
  ><SignInForm next={query.next} /></AuthShell>;
}

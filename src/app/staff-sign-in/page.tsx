export const dynamic = 'force-dynamic';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AccessUnavailable } from '@/components/access-unavailable';
import { supabaseConfig } from '@/lib/supabase/config';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignInForm } from '@/components/auth/forms';

export const metadata: Metadata = { title: 'Staff sign-in', robots: { index: false, follow: false } };

export default async function StaffSignIn({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!supabaseConfig()) return <AccessUnavailable audience="staff" />;
  return <AuthShell
    title="Staff sign-in"
    description="Operations requires an assigned staff role and an authenticator code. Managing a household membership does not grant staff access."
    notice={(await searchParams).notice}
    alternate={<>Looking for your own workspace? <Link href="/sign-in">Member sign-in</Link></>}
  ><SignInForm staff next="/ops" /></AuthShell>;
}

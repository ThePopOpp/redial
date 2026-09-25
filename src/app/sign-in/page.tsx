export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { AccessUnavailable } from '@/components/access-unavailable';
import { supabaseConfig } from '@/lib/supabase/config';
import { AccountSignIn } from '@/components/account-sign-in';
export const metadata: Metadata = { title: 'Member sign-in', robots: { index: false, follow: false } };
export default async function SignIn({ searchParams }: { searchParams: Promise<{ notice?: string; next?: string }> }) { const query=await searchParams; return supabaseConfig() ? <AccountSignIn notice={query.notice} next={query.next} /> : <AccessUnavailable audience="member" />; }

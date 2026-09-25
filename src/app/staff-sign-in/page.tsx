export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { AccessUnavailable } from '@/components/access-unavailable';
import { AccountSignIn } from '@/components/account-sign-in';
import { supabaseConfig } from '@/lib/supabase/config';
export const metadata: Metadata = { title: 'Staff sign-in', robots: { index: false, follow: false } };
export default async function StaffSignIn({searchParams}:{searchParams:Promise<{notice?:string}>}) { return supabaseConfig() ? <AccountSignIn staff notice={(await searchParams).notice}/> : <AccessUnavailable audience="staff" />; }

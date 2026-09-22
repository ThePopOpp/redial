import type { Metadata } from 'next';
import { AccessUnavailable } from '@/components/access-unavailable';
export const metadata: Metadata = { title: 'Member sign-in', robots: { index: false, follow: false } };
export default function SignIn() { return <AccessUnavailable audience="member" />; }

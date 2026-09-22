import type { Metadata } from 'next';
import { AccessUnavailable } from '@/components/access-unavailable';
export const metadata: Metadata = { title: 'Staff sign-in', robots: { index: false, follow: false } };
export default function StaffSignIn() { return <AccessUnavailable audience="staff" />; }

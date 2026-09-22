import { redirect } from 'next/navigation';

// Fail-closed placeholder, not an authentication implementation.
// Replace only with server-verified identity AND current workspace membership.
export default function MemberBoundary(): never { redirect('/sign-in'); }

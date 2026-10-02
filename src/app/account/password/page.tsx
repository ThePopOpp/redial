export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { verifiedAccount } from '@/lib/supabase/server';
import { authAction } from '@/lib/supabase/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export default async function Password({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (!await verifiedAccount()) redirect('/sign-in');
  const { notice } = await searchParams;
  // A throttled attempt has to say so. Reusing the failure wording would send
  // someone looking for a fault in a password that was never submitted.
  return <main id="main" className="access-content"><h1>Choose a new password</h1>{notice && <p role="alert">{notice === 'slow' ? 'You tried this very recently. Wait a minute, then try again.' : 'The password could not be updated. Try again.'}</p>}<form action={authAction} className="review-form"><label htmlFor="new-password">New password</label><Input id="new-password" name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /><Button name="action" value="password">Update password</Button></form></main>;
}

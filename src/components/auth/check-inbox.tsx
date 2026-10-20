import Link from 'next/link';
import { MailCheck } from 'lucide-react';

// What a finished sign-up looks like.
//
// Before this, submitting the form redirected back to the same form with a
// quiet line of grey text above it. The empty fields were still there, so the
// page read as a rejection — which is exactly how the owner read it, twice.
// Replacing the form is the whole point: there is nothing left to type, and
// leaving somewhere to type invites someone to type again.
//
// The wording still does not confirm whether an account exists at that address.
// Supabase answers a sign-up for an address already in use the same way it
// answers a new one, precisely so the form cannot be used to find out who has
// an account, and saying "we have sent you a link" would give away what that
// is protecting.
export function CheckInbox({ action = 'confirmation' }: { action?: 'confirmation' | 'reset' }) {
  const reset = action === 'reset';
  return <div className="auth-sent">
    <span className="auth-sent-mark" aria-hidden="true"><MailCheck size={22} /></span>
    <h2>Check your inbox</h2>
    <p>
      {reset
        ? 'If that address has an account, a link to choose a new password is on its way.'
        : 'If that address can be used, a link to confirm it is on its way. Follow it to finish setting up your account.'}
    </p>
    <ul>
      <li>The link works once and expires on its own.</li>
      <li>It can take a minute. Check spam if it has not arrived.</li>
      {!reset && <li>Until you follow it, the account is not finished and you will not be able to sign in.</li>}
    </ul>
    <p className="auth-sent-foot">
      Wrong address, or nothing arrived?{' '}
      <Link href={reset ? '/forgot-password' : '/register'}>Try again</Link>
      {' '}&middot;{' '}
      <Link href="/sign-in">Back to sign in</Link>
    </p>
  </div>;
}

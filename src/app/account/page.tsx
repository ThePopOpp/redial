import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { verifiedAccount } from '@/lib/supabase/server';
import { accountAction } from '@/lib/supabase/account-actions';
import { legalVersion } from '@/lib/legal';
import { Card, Badge, date } from '@/components/review/ui';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = { title: 'Your account', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const notices: Record<string, string> = {
  saved: 'Your account details have been saved.',
  password: 'Your password has been updated.',
  failed: 'That change could not be saved. Check the details and try again.',
  origin: 'Open this page from the configured Redial domain.',
};

export default async function Account({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const account = await verifiedAccount();
  if (!account) redirect('/sign-in');
  const notice = (await searchParams).notice;
  const meta = account.user.user_metadata ?? {};
  const acceptedVersion = typeof meta.terms_version === 'string' ? meta.terms_version : null;
  return <div className="site-wrap">
    <header className="site-header"><Brand /><nav aria-label="Account"><Link href="/app">Your workspace</Link></nav><ThemeToggle /></header>
    <main id="main" tabIndex={-1}>
      <header className="page-heading"><p className="eyebrow">Your account</p><h1>Account settings</h1>
        <p>Your name, sign-in details and password. Screening rules, contacts and notification preferences belong to each line and live in <Link href="/app/settings">your workspace settings</Link>.</p>
      </header>
      {notice && notices[notice] && <p role={notice === 'failed' || notice === 'origin' ? 'alert' : 'status'}>{notices[notice]}</p>}
      <div className="workspace-grid">
        <Card title="Your details">
          <form action={accountAction} className="review-form">
            <label htmlFor="account-name">Display name</label>
            <Input id="account-name" name="name" defaultValue={typeof meta.name === 'string' ? meta.name : ''} maxLength={100} required />
            <Button name="action" value="profile">Save name</Button>
          </form>
          <div className="record-meta">
            <span>Email</span><strong>{account.user.email}</strong>
            <span>Confirmed</span><strong>{account.user.email_confirmed_at ? date(account.user.email_confirmed_at) : 'Not confirmed'}</strong>
            <span>Account created</span><strong>{date(account.user.created_at)}</strong>
          </div>
          <p className="small-label">Changing the email address on an account is not yet supported. It is the identity your calls and membership are attached to, so it needs a verified change flow on both addresses.</p>
        </Card>

        <Card title="Password">
          <form action={accountAction} className="review-form">
            <label htmlFor="account-password">New password</label>
            <Input id="account-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
            <p className="small-label">At least 12 characters. A longer passphrase is stronger than a short, complicated one.</p>
            <Button name="action" value="password">Update password</Button>
          </form>
          <p className="small-label">Forgotten it instead? <Link href="/forgot-password">Send yourself a reset link</Link>.</p>
        </Card>

        <Card title="Sessions">
          <p>Signing out everywhere ends every signed-in session on every device, including this one. Use it if you think someone else has access to your account.</p>
          <form action={accountAction}>
            <Button name="action" value="signout_all" variant="outline">Sign out everywhere</Button>
          </form>
        </Card>

        <Card title="Agreements">
          {acceptedVersion
            ? <><Badge>Accepted version {acceptedVersion}</Badge>
                {typeof meta.terms_accepted_at === 'string' && <p>Accepted {date(meta.terms_accepted_at)}.</p>}
                {acceptedVersion !== legalVersion && <p>The current published version is {legalVersion}. We will ask you to review the change before it applies to you.</p>}</>
            : <p>This account predates recorded acceptance. The published <Link href="/legal/terms">Terms</Link> and <Link href="/legal/privacy">Privacy Policy</Link> apply.</p>}
          <p className="small-label"><Link href="/legal/terms">Terms of Service</Link> · <Link href="/legal/privacy">Privacy Policy</Link></p>
        </Card>

        <Card title="Membership and receipts">
          <p>Your plan, payment history and receipts live with your workspace membership.</p>
          <Link href="/app/billing">Open membership</Link>
          <p className="small-label">Paid membership needs the billing schema and the payments service. Nothing can be purchased yet, and no card details are held by Redial at any point.</p>
        </Card>

        <Card title="Your data">
          <p>You can export or delete the records in a workspace from that workspace. Closing an account and removing everything attached to it is a separate flow that has to reverse call routing safely first, so it is handled by <Link href="/app/help">a support request</Link> for now.</p>
        </Card>
      </div>
    </main>
  </div>;
}

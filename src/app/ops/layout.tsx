import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { staffAccount } from '@/lib/supabase/staff';
import { StaffMfa } from '@/components/dashboard/mfa';
import { OpsNavigation } from '@/components/ops/navigation';
import { visibleSections } from '@/lib/ops/sections';
import { authAction } from '@/lib/supabase/actions';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = { title: { default: 'Operations', template: '%s · Operations' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const account = await staffAccount();
  if (!account) redirect('/staff-sign-in');
  if (!account.mfa) {
    const { data } = await account.db.auth.mfa.listFactors();
    return <main id="main" className="access-content"><StaffMfa factor={data?.totp.find(f => f.status === 'verified')?.id} /></main>;
  }
  return <div className="ops-shell">
    <header className="ops-header">
      <Brand />
      <p className="eyebrow">Operations · {account.role} · MFA verified</p>
      <OpsNavigation sections={visibleSections(account.capabilities)} />
      <div className="ops-header-actions">
        <Link href="/app" className="ops-header-link">Your workspace</Link>
        <ThemeToggle />
        <form action={authAction}><Button name="action" value="signout" variant="outline">Sign out</Button></form>
      </div>
    </header>
    <main id="main" tabIndex={-1} className="ops-main">{children}</main>
  </div>;
}

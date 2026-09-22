import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';

export function AccessUnavailable({ audience }: { audience: 'member' | 'staff' }) {
  const staff = audience === 'staff';
  return <div className="access-shell">
    <aside className="access-identity"><div className="access-brand"><Brand /><ThemeToggle /></div><p className="eyebrow">{staff ? 'Private operations' : 'Member workspace'}</p><p>{staff ? 'A separate space for running Redial.' : 'Your calls. Your rules. Your private space.'}</p></aside>
    <main id="main" tabIndex={-1} className="access-content">
      <p className="status-label">Access unavailable · Local preview</p>
      <h1>{staff ? 'Staff sign-in' : 'Member sign-in'}</h1>
      <p>Sign-in is not available in this preview. No account information is collected.</p>
      <p>{staff ? 'Staff access will require a separate platform role and multi-factor authentication. Managing a household membership does not grant staff access.' : 'Your private workspace will require a verified account and membership. The public demo contains illustrative content only.'}</p>
      <div className="actions"><Button asChild><Link href="/demo/calls">Explore the demo</Link></Button><Button asChild variant="outline"><Link href="/">Return home</Link></Button></div>
    </main>
  </div>;
}

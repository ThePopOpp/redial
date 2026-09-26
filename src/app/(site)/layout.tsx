import Link from 'next/link';
import { Brand } from '@/components/brand';
import { Navigation } from '@/components/navigation';
import { publicNavigation } from '@/lib/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="site-wrap">
    <header className="site-header"><Brand /><Navigation items={publicNavigation} label="Public navigation" /><ThemeToggle /></header>
    <main id="main" tabIndex={-1}>{children}</main>
    <footer className="site-footer"><Brand /><p>A little more intention on the line.</p><nav aria-label="Footer"><Link href="/demo/calls">Demo</Link><Link href="/legal/privacy">Privacy</Link><Link href="/legal/terms">Terms</Link><Link href="/ops">Staff access</Link></nav></footer>
  </div>;
}

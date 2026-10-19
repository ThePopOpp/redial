'use client';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { ChevronsLeft, Globe, Menu, UserCog, X } from 'lucide-react';
import { navEntries, navGroups } from '@/lib/dashboard/navigation-model';
import { Brand } from '@/components/brand';

const COLLAPSE_KEY = 'redial-sidebar-collapsed';

// localStorage read as an external store rather than copied into state inside
// an effect. The server snapshot is always "expanded", so the markup React
// produces on the server and the first client render agree; the stored
// preference is applied on the subscription that follows, with no mismatch and
// no state update in an effect.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => { listeners.delete(onChange); window.removeEventListener('storage', onChange); };
}

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}

function writeCollapsed(next: boolean) {
  try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* private mode */ }
  for (const listener of listeners) listener();
}

export function DashboardSidebar({ workspace, line, view, email, signOut }: {
  workspace: string; line: string; view: string; email: string; signOut: React.ReactNode;
}) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [open, setOpen] = useState(false);

  const href = (next: string) => `/app/${next}?workspace=${workspace}&line=${line}`;

  return <>
    <button type="button" className="app-drawer-toggle" aria-expanded={open}
      aria-controls="workspace-navigation" onClick={() => setOpen(!open)}>
      {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      {open ? 'Close' : 'Menu'}
    </button>

    <aside className="app-sidebar" data-collapsed={collapsed} data-open={open}>
      <div className="app-sidebar-head">
        <Brand />
        <button type="button" className="app-collapse" onClick={() => writeCollapsed(!collapsed)}
          aria-pressed={collapsed} data-tip={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
          <ChevronsLeft size={16} aria-hidden="true" />
          <span className="sr-only">{collapsed ? 'Expand navigation' : 'Collapse navigation'}</span>
        </button>
      </div>

      <nav id="workspace-navigation" aria-label="Workspace navigation"
        onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
        {navGroups.map(group => <div className="app-nav-group" key={group}>
          {/* Hidden rather than removed when collapsed: the grouping still has
              to reach a screen reader, which is not looking at the icons. */}
          <p className="app-nav-caption">{group}</p>
          {navEntries.filter(entry => entry.group === group).map(entry => <Link key={entry.view}
            href={href(entry.view)}
            aria-current={entry.view === view ? 'page' : undefined}
            data-tip={entry.label}
            onClick={() => setOpen(false)}>
            <entry.icon size={17} strokeWidth={1.7} aria-hidden="true" />
            <span>{entry.label}</span>
          </Link>)}
        </div>)}
      </nav>

      <div className="app-sidebar-foot">
        <Link href="/" data-tip="Back to website" onClick={() => setOpen(false)}>
          <Globe size={16} strokeWidth={1.7} aria-hidden="true" /><span>Back to website</span>
        </Link>
        <Link href="/account" data-tip="Account settings" onClick={() => setOpen(false)}>
          <UserCog size={16} strokeWidth={1.7} aria-hidden="true" /><span>Account settings</span>
        </Link>
        {/* A server action, rendered on the server and passed through: the
            sidebar is a client component and cannot own one. */}
        <div className="app-signout" data-tip="Sign out">{signOut}</div>
        <p title={email}>{email}</p>
      </div>
    </aside>
  </>;
}

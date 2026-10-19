'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronRight, Search } from 'lucide-react';
import { navEntries } from '@/lib/dashboard/navigation-model';
import { ThemeToggle } from '@/components/theme-toggle';

export type Alert = { label: string; detail: string; href: string };

// Initials rather than a photograph. An avatar URL would have to come from user
// metadata, which is editable by the person it describes, and rendering an
// arbitrary remote image on every authenticated page is a tracking pixel some
// of the time and a broken image the rest.
function initials(email: string) {
  const name = email.split('@')[0] ?? '';
  const parts = name.split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
  return letters.toUpperCase() || '?';
}

export function DashboardTopbar({ workspaceName, viewLabel, workspace, line, email, alerts, query }: {
  workspaceName: string; viewLabel: string;
  workspace: string; line: string; email: string;
  alerts: readonly Alert[]; query: string;
}) {
  const router = useRouter();
  const [term, setTerm] = useState(query);
  const [openPanel, setOpenPanel] = useState<'search' | 'alerts' | null>(null);
  const holder = useRef<HTMLDivElement>(null);

  // One listener for both panels. Clicking anywhere outside closes whichever is
  // open, which is what a reader expects from a header popover.
  useEffect(() => {
    if (!openPanel) return;
    const away = (event: MouseEvent) => {
      if (!holder.current?.contains(event.target as Node)) setOpenPanel(null);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpenPanel(null); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', escape); };
  }, [openPanel]);

  // Destinations that match what has been typed. The call inbox is offered as a
  // search rather than a destination, because that is the one place a free-text
  // term means something to the database.
  const matches = term.trim()
    ? navEntries.filter(entry => entry.label.toLowerCase().includes(term.trim().toLowerCase())).slice(0, 6)
    : [];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = term.trim();
    setOpenPanel(null);
    router.push(value
      ? `/app/calls?workspace=${workspace}&line=${line}&q=${encodeURIComponent(value)}`
      : `/app/calls?workspace=${workspace}&line=${line}`);
  }

  return <header className="app-topbar">
    <nav className="app-crumbs" aria-label="Breadcrumb">
      <ol>
        <li><Link href={`/app/overview?workspace=${workspace}&line=${line}`}>{workspaceName}</Link></li>
        <li aria-hidden="true"><ChevronRight size={14} /></li>
        <li><span aria-current="page">{viewLabel}</span></li>
      </ol>
    </nav>

    <div className="app-topbar-actions" ref={holder}>
      <form className="app-search" role="search" onSubmit={submit}>
        <Search size={15} aria-hidden="true" />
        <input
          type="search" name="q" value={term} autoComplete="off"
          placeholder="Search calls and pages…" aria-label="Search calls and pages"
          onChange={event => { setTerm(event.target.value); setOpenPanel('search'); }}
          onFocus={() => setOpenPanel('search')}
        />
        {openPanel === 'search' && term.trim() && <div className="app-popover app-search-results">
          <p className="app-popover-caption">Search call inbox</p>
          <button type="submit" className="app-search-go">
            <Search size={14} aria-hidden="true" />Calls matching &ldquo;{term.trim()}&rdquo;
          </button>
          {matches.length > 0 && <>
            <p className="app-popover-caption">Go to</p>
            {matches.map(entry => <Link key={entry.view} onClick={() => setOpenPanel(null)}
              href={`/app/${entry.view}?workspace=${workspace}&line=${line}`}>
              <entry.icon size={14} aria-hidden="true" />{entry.label}
            </Link>)}
          </>}
        </div>}
      </form>

      <div className="app-bell-holder">
        <button type="button" className="app-icon-button" aria-expanded={openPanel === 'alerts'}
          onClick={() => setOpenPanel(openPanel === 'alerts' ? null : 'alerts')}>
          <Bell size={17} aria-hidden="true" />
          {alerts.length > 0 && <span className="app-badge">{alerts.length > 9 ? '9+' : alerts.length}</span>}
          <span className="sr-only">{alerts.length ? `${alerts.length} items need attention` : 'Nothing needs attention'}</span>
        </button>
        {openPanel === 'alerts' && <div className="app-popover app-alerts">
          <p className="app-popover-caption">Needs attention</p>
          {alerts.length === 0
            ? <p className="app-popover-empty">Nothing is waiting on you.</p>
            : alerts.map(alert => <Link key={alert.href + alert.label} href={alert.href} onClick={() => setOpenPanel(null)}>
                <strong>{alert.label}</strong><span>{alert.detail}</span>
              </Link>)}
        </div>}
      </div>

      <ThemeToggle />

      <Link className="app-user" href="/account" title={email}>
        <span className="app-avatar" aria-hidden="true">{initials(email)}</span>
        <span className="app-user-email">{email}</span>
      </Link>
    </div>
  </header>;
}

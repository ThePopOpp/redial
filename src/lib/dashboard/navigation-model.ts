import { AudioLines, BookUser, CalendarClock, ClipboardList, CreditCard, Headphones, House, Inbox, Network, Phone, Plug, Settings, ShieldCheck, Sparkles, Users, type LucideIcon } from 'lucide-react';
import { views, labels } from './model';

// Navigation presentation, kept beside the router's own `views` rather than
// replacing it. `views` is still the authority: a path not in it is a 404, and
// this file only decides how the fifteen it already allows are grouped, which
// icon each carries and what a breadcrumb calls them.
//
// A grouped list is the point. Fifteen flat entries is a wall, and the reader
// has to scan all of it to find the two they use; four short groups can be
// taken in at a glance.
export type NavGroup = 'Your space' | 'Records' | 'Your line' | 'Account';

const presentation: Record<string, { icon: LucideIcon; group: NavGroup }> = {
  overview: { icon: House, group: 'Your space' },
  calls: { icon: Inbox, group: 'Your space' },
  live: { icon: AudioLines, group: 'Your space' },
  screening: { icon: ShieldCheck, group: 'Your space' },
  agent: { icon: Sparkles, group: 'Your space' },
  directory: { icon: Network, group: 'Your space' },
  contacts: { icon: BookUser, group: 'Records' },
  callbacks: { icon: CalendarClock, group: 'Records' },
  numbers: { icon: Phone, group: 'Your line' },
  connections: { icon: Plug, group: 'Your line' },
  people: { icon: Users, group: 'Account' },
  billing: { icon: CreditCard, group: 'Account' },
  settings: { icon: Settings, group: 'Account' },
  help: { icon: Headphones, group: 'Account' },
  audit: { icon: ClipboardList, group: 'Account' },
};

export type NavEntry = { view: string; label: string; icon: LucideIcon; group: NavGroup };

// Derived from `views` rather than written out again, so a view added to the
// router without a home here fails the build instead of quietly disappearing
// from the sidebar.
export const navEntries: readonly NavEntry[] = views.map((view, index) => {
  const item = presentation[view];
  if (!item) throw new Error(`Navigation presentation missing for view "${view}"`);
  return { view, label: labels[index], icon: item.icon, group: item.group };
});

export const navGroups: readonly NavGroup[] = ['Your space', 'Records', 'Your line', 'Account'];

export function labelFor(view: string) {
  return navEntries.find(entry => entry.view === view)?.label ?? 'Overview';
}

import Link from 'next/link';
import { requireStaff } from '@/lib/supabase/staff';
import { visibleSections, sectionHref } from '@/lib/ops/sections';
import { Card, Stat, Empty, date } from '@/components/review/ui';

type Overview = { workspaces: number; workspaces_7d: number; members: number; lines: number; lines_ready: number;
  open_tickets: number; calls_30d: number; staff_active: number; as_of: string } | null;

export default async function OpsOverview() {
  const account = await requireStaff();
  const { data, error } = await account.db.rpc('staff_platform_overview');
  const overview = data as Overview;
  const sections = visibleSections(account.capabilities).filter(section => section.slug);
  return <>
    <header className="workspace-heading"><div><p className="eyebrow">Operations</p><h1>What the platform looks like today.</h1></div></header>
    {error ? <p role="alert">Platform figures are unavailable. Check the database connection.</p>
      : !overview ? <Empty title="No platform visibility">Your staff role does not include customer access.</Empty>
      : <>
        <div className="ops-stats">
          <Stat label="Workspaces" value={String(overview.workspaces)} detail="Every workspace ever created, personal and business." />
          <Stat label="New this week" value={String(overview.workspaces_7d)} detail="Workspaces created in the last 7 days." />
          <Stat label="Active members" value={String(overview.members)} detail="Memberships with active status; invited and revoked are excluded." />
          <Stat label="Lines" value={`${overview.lines_ready} / ${overview.lines}`} detail="Lines reporting ready, out of all lines created." />
          <Stat label="Calls (30 days)" value={String(overview.calls_30d)} detail="Call records in the last 30 days. Nothing writes these until the voice gateway exists." />
          <Stat label="Open tickets" value={String(overview.open_tickets)} detail="Support requests recorded across all workspaces." />
          <Stat label="Active staff" value={String(overview.staff_active)} detail="Accounts holding an active platform role." />
        </div>
        <p className="ops-freshness">Counted live from the database at {date(overview.as_of)}. Every figure is a direct count, not an estimate.</p>
      </>}
    <div className="workspace-grid">
      {sections.map(section => <Card key={section.slug} title={section.label}>
        <p>{section.description}</p><Link href={sectionHref(section.slug)}>Open {section.label.toLowerCase()}</Link>
      </Card>)}
    </div>
    <Card title="Not yet connected">
      <p>Revenue, refunds, provider diagnostics and reminder sending need the billing schema and the worker service. They are absent from this console rather than shown as empty panels, so nothing here can be mistaken for a working figure.</p>
    </Card>
  </>;
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/supabase/staff';
import { Card, Badge, Empty, date, human } from '@/components/review/ui';

export const metadata = { title: 'Customer' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Overview = {
  workspace: { id: string; name: string; type: string; created_at: string } | null;
  people: { user_id: string; email: string; role: string; status: string }[];
  lines: { id: string; name: string; status: string; owner_id: string }[];
  setup_drafts: number;
  subscription: { plan: string; status: string; current_period_end: string | null } | null;
  call_counts: { total: number; last_30d: number; last_call_at: string | null };
  tickets: { id: string; subject: string; created_at: string }[];
  recent_activity: { action: string; created_at: string }[];
};

export default async function Customer({ params }: { params: Promise<{ workspace: string }> }) {
  const account = await requireStaff('customer_read');
  const { workspace } = await params;
  if (!uuid.test(workspace)) notFound();
  const { data, error } = await account.db.rpc('staff_customer_overview', { w: workspace });
  const view = data as Overview | null;
  if (error) return <p role="alert">This customer record is unavailable. Check the database connection.</p>;
  if (!view?.workspace) notFound();
  return <>
    <header className="workspace-heading">
      <div><p className="eyebrow"><Link href="/ops/customers">Customers</Link> · {view.workspace.type}</p><h1>{view.workspace.name}</h1></div>
      <Badge>Opened {date(new Date().toISOString())}</Badge>
    </header>
    <div className="ops-stats">
      <div className="stat"><span>People</span><strong>{view.people.length}</strong></div>
      <div className="stat"><span>Lines</span><strong>{view.lines.length}</strong></div>
      <div className="stat"><span>Calls total</span><strong>{view.call_counts?.total ?? 0}</strong></div>
      <div className="stat"><span>Calls 30d</span><strong>{view.call_counts?.last_30d ?? 0}</strong></div>
    </div>
    <div className="workspace-grid">
      <Card title="People and access">
        {view.people.length ? view.people.map(person => <div className="record-row" key={person.user_id}>
          <div className="grow"><strong>{person.email}</strong><p>{human(person.role)}</p></div><Badge>{human(person.status)}</Badge>
        </div>) : <Empty title="No members">This workspace has no active members.</Empty>}
      </Card>
      <Card title="Lines">
        {view.lines.length ? view.lines.map(line => <div className="record-row" key={line.id}>
          <div className="grow"><strong>{line.name}</strong></div><Badge>{human(line.status)}</Badge>
        </div>) : <Empty title="No lines">No line has been created yet.</Empty>}
        <p className="ops-cell-note">{view.setup_drafts} saved carrier setup draft{view.setup_drafts === 1 ? '' : 's'}. The draft contents, including the member&rsquo;s own phone number, are not part of staff access.</p>
      </Card>
      <Card title="Membership">
        {view.subscription
          ? <><h2>{view.subscription.plan}</h2><Badge>{human(view.subscription.status)}</Badge>
              {view.subscription.current_period_end && <p>Period ends {date(view.subscription.current_period_end)}</p>}</>
          : <Empty title="No membership">This workspace has no subscription record. Paid membership requires the billing schema and the worker service.</Empty>}
      </Card>
      <Card title="Support requests">
        {view.tickets.length ? view.tickets.map(ticket => <div className="record-row" key={ticket.id}>
          <div className="grow"><strong>{ticket.subject}</strong><p>{date(ticket.created_at)}</p></div>
        </div>) : <Empty title="No requests">This customer has not opened a support request.</Empty>}
        <Link href="/ops/support">Open the support inbox</Link>
      </Card>
    </div>
    <Card title="Recent activity">
      {view.recent_activity.length ? <ul className="plain-list">{view.recent_activity.map((entry, i) => <li key={i}>{human(entry.action)} · {date(entry.created_at)}</li>)}</ul>
        : <Empty title="No recorded activity">Workspace actions appear here as they happen.</Empty>}
    </Card>
    <Card title="Call content is not shown here">
      <p>Summaries, transcripts and recordings belong to the line owner and the people they have granted access to. Staff do not receive them by default, and this page carries counts only. A support grant flow, with the customer&rsquo;s authorisation and an expiry, is separate work.</p>
    </Card>
  </>;
}

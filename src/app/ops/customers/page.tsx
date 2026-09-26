import Link from 'next/link';
import { requireStaff } from '@/lib/supabase/staff';
import { Card, Badge, Empty, date } from '@/components/review/ui';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Customers' };
type Row = { workspace_id: string; name: string; type: string; owner_email: string; members: number; lines: number;
  calls_30d: number; open_tickets: number; plan: string; status: string; created_at: string };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const account = await requireStaff('customer_read');
  const query = await searchParams;
  const q = (query.q ?? '').slice(0, 100);
  const page = Math.max(1, Number(query.page) || 1);
  const limit = 25;
  const { data, error } = await account.db.rpc('staff_customer_search', { q, lim: limit, off: (page - 1) * limit });
  const rows = (data ?? []) as Row[];
  return <>
    <header className="workspace-heading"><div><p className="eyebrow">Operations</p><h1>Customers</h1></div></header>
    <form className="ops-search" action="/ops/customers">
      <label htmlFor="customer-search">Search by workspace name or owner email</label>
      <div className="ops-search-row">
        <Input id="customer-search" name="q" defaultValue={q} placeholder="acme, alex@example.com" maxLength={100} />
        <Button>Search</Button>
      </div>
    </form>
    {error ? <p role="alert">Customer data is unavailable. Check the database connection.</p>
      : !rows.length ? <Empty title={q ? 'No matching workspaces' : 'No workspaces yet'}>{q ? 'Try a different name or email address.' : 'Workspaces appear here as people register.'}</Empty>
      : <div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th>Workspace</th><th>Owner</th><th>People</th><th>Lines</th><th>Calls 30d</th><th>Tickets</th><th>Membership</th><th>Created</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.workspace_id}>
            <td><Link href={`/ops/customers/${row.workspace_id}`}>{row.name}</Link><span className="ops-cell-note">{row.type}</span></td>
            <td>{row.owner_email}</td><td>{row.members}</td><td>{row.lines}</td><td>{row.calls_30d}</td><td>{row.open_tickets}</td>
            <td><Badge>{row.plan === 'none' ? 'No membership' : `${row.plan} · ${row.status}`}</Badge></td>
            <td>{date(row.created_at)}</td>
          </tr>)}</tbody>
        </table></div>}
    <nav className="ops-pagination" aria-label="Pagination">
      {page > 1 && <Link href={`/ops/customers?q=${encodeURIComponent(q)}&page=${page - 1}`}>Previous</Link>}
      <span>Page {page}</span>
      {rows.length === limit && <Link href={`/ops/customers?q=${encodeURIComponent(q)}&page=${page + 1}`}>Next</Link>}
    </nav>
    <Card title="What staff can see here"><p>This view carries account and configuration facts only. Call summaries, transcripts and recordings are never part of a staff projection, and opening a customer record is written to the activity log.</p></Card>
  </>;
}

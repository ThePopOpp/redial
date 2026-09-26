import { requireStaff } from '@/lib/supabase/staff';
import { Card, Empty, date, human } from '@/components/review/ui';

export const metadata = { title: 'Activity' };
type Entry = { action: string; actor_email: string | null; workspace_id: string | null; resource_id: string | null; created_at: string };

export default async function Audit() {
  const account = await requireStaff('audit_read');
  const { data, error } = await account.db.rpc('staff_audit_log', { lim: 200 });
  const rows = (data ?? []) as Entry[];
  return <>
    <header className="workspace-heading"><div><p className="eyebrow">Operations</p><h1>Activity</h1></div></header>
    {error ? <p role="alert">The activity log is unavailable. Check the database connection.</p>
      : !rows.length ? <Empty title="Nothing recorded yet">Workspace and staff actions appear here as they happen.</Empty>
      : <div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th>Action</th><th>Actor</th><th>Workspace</th><th>When</th></tr></thead>
          <tbody>{rows.map((entry, i) => <tr key={i}>
            <td>{human(entry.action)}</td><td>{entry.actor_email ?? 'System'}</td>
            <td className="ops-mono">{entry.workspace_id ? entry.workspace_id.slice(0, 8) : 'Platform'}</td><td>{date(entry.created_at)}</td>
          </tr>)}</tbody>
        </table></div>}
    <Card title="What is recorded"><p>Record changes, membership and permission changes, staff role changes and staff views of a customer record. The log holds identifiers and action names, never record contents or call material.</p></Card>
  </>;
}

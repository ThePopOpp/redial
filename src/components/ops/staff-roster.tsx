import { promoteStaff } from '@/lib/ops/actions';
import { Card, Badge, Empty, date } from '@/components/review/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const roles = ['owner', 'admin', 'support', 'finance', 'growth', 'analyst'];
export type StaffRow = { user_id: string; email: string; role: string; active: boolean; note: string | null; created_at: string };

export function StaffRoster({ rows, selfId }: { rows: StaffRow[]; selfId: string }) {
  return <>
    <Card title="Platform staff">
      {rows.length ? rows.map(row => <div className="record-row" key={row.user_id}>
        <div className="grow">
          <strong>{row.email}</strong>
          <p>{row.note || 'No note'} · added {date(row.created_at)}</p>
        </div>
        <Badge>{row.role}</Badge>
        <Badge>{row.active ? 'Active' : 'Inactive'}</Badge>
        {row.user_id === selfId
          ? <p className="ops-cell-note">This is you. Staff cannot change their own role.</p>
          : <form action={promoteStaff} className="ops-inline-form">
              <input type="hidden" name="target" value={row.user_id} />
              <label className="sr-only" htmlFor={`role-${row.user_id}`}>Role for {row.email}</label>
              <Select id={`role-${row.user_id}`} name="role" defaultValue={row.role} options={roles} />
              <label className="ops-check"><input type="checkbox" name="active" value="1" defaultChecked={row.active} /> Active</label>
              <Button variant="outline">Save</Button>
            </form>}
      </div>) : <Empty title="No staff yet">The first owner is created with a privileged database session.</Empty>}
    </Card>
    <Card title="Grant a platform role">
      <p>The person must already have a confirmed Redial account. Adding a role here does not create an account and does not send an email.</p>
      <form action={promoteStaff} className="review-form">
        <label htmlFor="new-staff">Account user ID</label>
        <Input id="new-staff" name="target" placeholder="00000000-0000-0000-0000-000000000000" required maxLength={36} />
        <label htmlFor="new-role">Role</label>
        <Select id="new-role" name="role" defaultValue="support" options={roles} />
        <label htmlFor="new-note">Note</label>
        <Input id="new-note" name="note" maxLength={500} placeholder="Why this person has access" />
        <label className="ops-check"><input type="checkbox" name="active" value="1" defaultChecked /> Active immediately</label>
        <Button>Grant role</Button>
      </form>
    </Card>
    <Card title="What each role grants">
      <ul className="plain-list">
        <li><strong>Owner</strong> — everything, including staff administration and refund approval. At least one active owner must always remain.</li>
        <li><strong>Admin</strong> — customers, support, billing and jobs, but not staff administration.</li>
        <li><strong>Support</strong> — support requests and customer records. No billing.</li>
        <li><strong>Finance</strong> — billing and customer records. No support request content.</li>
        <li><strong>Growth</strong> — customer records and reminder drafting.</li>
        <li><strong>Analyst</strong> — read-only customers, billing and activity.</li>
      </ul>
      <p>No role grants call summaries, transcripts or recordings. Multi-factor authentication is required for every staff action.</p>
    </Card>
  </>;
}

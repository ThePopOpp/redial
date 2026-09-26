import { requireStaff } from '@/lib/supabase/staff';
import { StaffRoster, type StaffRow } from '@/components/ops/staff-roster';

export const metadata = { title: 'Staff & access' };

export default async function Staff({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const account = await requireStaff('staff_admin');
  const notice = (await searchParams).notice;
  const { data, error } = await account.db.rpc('staff_directory');
  return <>
    <header className="workspace-heading"><div><p className="eyebrow">Operations</p><h1>Staff &amp; access</h1></div></header>
    {notice && <p role={notice === 'saved' ? 'status' : 'alert'}>{notice === 'saved'
      ? 'Staff access updated.'
      : 'That change was refused. A role cannot be changed by the person who holds it, the account must be confirmed, and the last active owner cannot be removed.'}</p>}
    {error ? <p role="alert">The staff roster is unavailable. Check the database connection.</p>
      : <StaffRoster rows={(data ?? []) as StaffRow[]} selfId={account.user.id} />}
  </>;
}

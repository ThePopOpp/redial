import { requireStaff } from '@/lib/supabase/staff';
import { supportReply } from '@/lib/dashboard/staff-actions';
import { Card, Empty, date } from '@/components/review/ui';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export const metadata = { title: 'Support' };

export default async function Support({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const account = await requireStaff('support_read');
  const notice = (await searchParams).notice;
  const [tickets, replies] = await Promise.all([
    account.db.from('workspace_records').select('id,workspace_id,body,created_at').eq('kind', 'ticket').order('created_at', { ascending: false }).limit(100),
    account.db.from('support_messages').select('ticket_id,body,created_at').order('created_at').limit(500),
  ]);
  return <>
    <header className="workspace-heading"><div><p className="eyebrow">Operations</p><h1>Support inbox</h1></div></header>
    {notice && <p role="status">{notice === 'saved' ? 'Reply saved to the member inbox.' : 'The reply could not be saved.'}</p>}
    {tickets.error || replies.error ? <p role="alert">Support data is unavailable. Retry after checking the database connection.</p>
      : tickets.data?.length ? tickets.data.map(ticket => <Card key={ticket.id} title={String(ticket.body.subject)}>
          <p>{String(ticket.body.body)}</p>
          <p className="small-label">Workspace {ticket.workspace_id} · {date(ticket.created_at)}</p>
          {replies.data?.filter(reply => reply.ticket_id === ticket.id).map((reply, i) => <p key={i}><strong>Staff response:</strong> {reply.body}</p>)}
          {account.can('support_write') && <form action={supportReply} className="review-form">
            <input type="hidden" name="workspace_id" value={ticket.workspace_id} />
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <label htmlFor={`reply-${ticket.id}`}>Reply</label>
            <Textarea id={`reply-${ticket.id}`} name="body" required maxLength={4000} />
            <Button>Save reply</Button>
          </form>}
        </Card>)
      : <Empty title="No support requests">Member requests appear here. Call transcripts and audio are not part of staff support access.</Empty>}
  </>;
}

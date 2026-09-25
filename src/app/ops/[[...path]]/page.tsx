import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { staffAccount } from '@/lib/supabase/staff';
import { StaffMfa } from '@/components/dashboard/mfa';
import { supportReply } from '@/lib/dashboard/staff-actions';
import { authAction } from '@/lib/supabase/actions';
import { Card } from '@/components/review/ui';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
export const dynamic='force-dynamic';
export default async function Operations({params,searchParams}:{params:Promise<{path?:string[]}>;searchParams:Promise<{notice?:string}>}) {
  const account=await staffAccount(); if(!account) redirect('/staff-sign-in');
  const path=(await params).path || [];
  if(path.length>1 || (path.length===1 && path[0]!=='support')) notFound();
  if(!account.mfa) { const {data}=await account.db.auth.mfa.listFactors(); return <main id="main" className="access-content"><StaffMfa factor={data?.totp.find(f=>f.status==='verified')?.id}/></main>; }
  const support=['support','admin'].includes(account.role);
  const tickets=support ? await account.db.from('workspace_records').select('id,workspace_id,body,created_at').eq('kind','ticket').order('created_at',{ascending:false}).limit(100) : null;
  const replies=support ? await account.db.from('support_messages').select('ticket_id,body,created_at').order('created_at').limit(500) : null;
  return <main id="main" className="review-content"><header className="workspace-heading"><div><p className="eyebrow">Operations · {account.role} · MFA verified</p><h1>Support inbox</h1></div><form action={authAction}><Button name="action" value="signout" variant="outline">Sign out</Button></form></header><Link href="/app">Your member workspace</Link>{(await searchParams).notice && <p role="status">{(await searchParams).notice==='saved'?'Reply saved to the member inbox.':'The reply could not be saved.'}</p>}{tickets?.error || replies?.error ? <p role="alert">Support data is unavailable. Retry after checking the database connection.</p> : !support ? <p>Your staff role does not include support content access.</p> : tickets?.data?.length ? tickets.data.map(ticket=><Card key={ticket.id} title={String(ticket.body.subject)}><p>{String(ticket.body.body)}</p><p className="small-label">Workspace {ticket.workspace_id} · {ticket.created_at}</p>{replies?.data?.filter(reply=>reply.ticket_id===ticket.id).map((reply,i)=><p key={i}><strong>Staff response:</strong> {reply.body}</p>)}<form action={supportReply} className="review-form"><input type="hidden" name="workspace_id" value={ticket.workspace_id}/><input type="hidden" name="ticket_id" value={ticket.id}/><label htmlFor={`reply-${ticket.id}`}>Reply</label><Textarea id={`reply-${ticket.id}`} name="body" required maxLength={4000}/><Button>Save reply</Button></form></Card>) : <Card title="No support requests"><p>Member requests will appear here. Call transcripts and audio are not part of staff support access.</p></Card>}</main>;
}

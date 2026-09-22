'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, House, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { Brand } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { reviewStatusOptions, normalizePhone, type SetupAccount, type SetupReviewStatus } from '@/lib/landing/onboarding';

export function SetupWorkspace({ management = false }: { management?: boolean }) {
  const [account, setAccount] = useState<SetupAccount | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<SetupReviewStatus>('pending_review'), [note, setNote] = useState('');
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [confirmDelete, setConfirmDelete] = useState(false);
  const [dirty, setDirty] = useState(false), dirtyRef = useRef(false), lock = useRef(false);
  const endpoint = management ? '/api/onboarding/management' : '/api/onboarding/account';
  const accept = useCallback((next: SetupAccount | null) => { setAccount(next); setStatus(next?.submission.status ?? 'pending_review'); setNote(next?.submission.note ?? ''); dirtyRef.current = false; setDirty(false); }, []);
  const load = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const data = await response.json();
      if (response.status === 404) { accept(null); setError(''); return; }
      if (!response.ok) throw new Error(data.error || 'Your setup could not be loaded.');
      if (!dirtyRef.current && !lock.current) accept(data.account);
      setError('');
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Please try again.'); }
    finally { setLoading(false); }
  }, [endpoint, accept]);
  useEffect(() => {
    const initialLoad = requestAnimationFrame(() => { void load(); });
    const refresh = () => { if (!document.hidden && !dirtyRef.current && !lock.current) void load(); };
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { cancelAnimationFrame(initialLoad); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);
  function change() { dirtyRef.current = true; setDirty(true); setMessage(''); }
  async function saveReview() {
    if (!account || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: account.version, status, note }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The review could not be saved.');
      accept(data.account); setMessage('Review saved. The member account shows this status and note too.');
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function remove() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const response = await fetch('/api/onboarding', { method: 'DELETE' });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Deletion could not be confirmed.'); }
      accept(null); setConfirmDelete(false); setMessage('Your setup was deleted from both management views.');
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const submission = account?.submission, profile = submission?.profile;
  return <div className="setup-workspace">
    <header className="setup-workspace-nav"><Brand /><nav aria-label="Setup navigation"><Link href="/local/account" aria-current={!management ? 'page' : undefined}><UserRound size={16} />My account</Link><Link href="/local/admin" aria-current={management ? 'page' : undefined}><ClipboardList size={16} />Admin dashboard</Link></nav><ThemeToggle /></header>
    <main id="main" tabIndex={-1} className="setup-workspace-main">
      <div className="setup-workspace-breadcrumb"><Link href="/"><ArrowLeft size={14} />Website</Link><Link href={management ? '/demo/ops' : '/demo/overview'}><House size={14} />Example workspace</Link></div>
      <header className="workspace-heading"><div><p className="eyebrow">{management ? 'Local admin review' : 'Your local account'}</p><h1>{management ? 'A considered beginning.' : 'Your quieter day, in progress.'}</h1><p>{management ? 'Review the setup submitted from this browser and keep the member informed.' : 'Your submitted details, assistant preferences, and setup progress in one place.'}</p></div><Button variant="outline" onClick={() => { dirtyRef.current = false; setDirty(false); void load(); }} disabled={busy}><RefreshCw size={15} />{dirty ? 'Discard edits & refresh' : 'Refresh'}</Button></header>
      <div className="review-disclosure"><ShieldCheck size={18} /><p><strong>Local account preview.</strong> This browser can review its own submission in both views. Live sign-in and staff permissions are not connected.</p></div>
      {loading && <p role="status">Loading your setup…</p>}
      {error && <div className="error-message" role="alert">{error}</div>}
      {message && <p className="setup-feedback" role="status"><CheckCircle2 size={17} />{message}</p>}
      {!loading && !account && !error && <section className="workspace-card empty-state"><h2>No submitted setup yet.</h2><p>Finish the seven-step form in this browser to add your information to the member account and admin review.</p><Button asChild><Link href="/#onboarding">Get started <ArrowRight size={15} /></Link></Button></section>}
      {account && submission && profile && <>
        <div className="setup-summary"><div><span className="avatar">{profile.fullName.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div><h2>{profile.fullName}</h2><p>{profile.email}</p></div></div><span className="badge">{reviewStatusOptions.find(option => option.value === submission.status)?.label}</span></div>
        <div className="setup-workspace-grid">
          <div className="stack"><section className="workspace-card"><header className="card-heading"><h2>Submitted information</h2><p>Shared by your member account and this local admin review.</p></header><dl className="setup-details">
            <div><dt>Full name</dt><dd>{profile.fullName}</dd></div><div><dt>Email</dt><dd>{profile.email}</dd></div><div><dt>Phone number</dt><dd>{normalizePhone(profile.phone)}</dd></div><div><dt>Carrier</dt><dd>{profile.carrier}</dd></div><div><dt>Line type</dt><dd>{profile.lineType === 'personal' ? 'Personal' : 'Business'}</dd></div><div><dt>Connection preference</dt><dd>{profile.connection === 'conditional' ? 'Conditional forwarding' : 'Dedicated number'}</dd></div><div><dt>Assistant</dt><dd>{profile.provider === 'redial' ? 'Redial assistant' : profile.providerName}</dd></div><div><dt>Voice</dt><dd>{profile.voice}</dd></div><div><dt>Screening</dt><dd>{profile.screening === 'all' ? 'Every call' : profile.screening === 'unknown' ? 'Unknown callers' : 'Spam-labeled calls only'}</dd></div><div><dt>Opening greeting</dt><dd>{profile.greeting}</dd></div><div><dt>Setup checks</dt><dd>Connection preference acknowledged. Route and fallback tests still pending.</dd></div><div><dt>Account reference</dt><dd className="setup-reference">{submission.accountId}</dd></div><div><dt>Submitted</dt><dd>{new Date(submission.submittedAt).toLocaleString()}</dd></div>
          </dl><div className="actions"><Button asChild variant="outline"><Link href="/#onboarding">Review or edit setup <ArrowRight size={15} /></Link></Button></div></section>
          <section className="workspace-card"><header className="card-heading"><h2>Setup history</h2></header><ol className="setup-history">{submission.history.slice().reverse().map((event, index) => <li key={`${event.at}-${index}`}><CheckCircle2 size={15} /><div>{event.action}<small>{new Date(event.at).toLocaleString()}</small></div></li>)}</ol></section></div>
          <div className="stack"><section className="workspace-card"><header className="card-heading"><h2>{management ? 'Manage this setup' : 'Review progress'}</h2><p>{management ? 'Status and notes appear in the member account.' : 'Updates from the local admin review appear here.'}</p></header>
            {management ? <form className="setup-management-form" onSubmit={event => { event.preventDefault(); void saveReview(); }}><div className="field"><label htmlFor="setup-review-status">Review status</label><Select id="setup-review-status" value={status} options={reviewStatusOptions} onValueChange={value => { change(); setStatus(value as SetupReviewStatus); }} disabled={busy} /></div><div className="field"><label htmlFor="setup-review-note">Note for the member</label><Textarea id="setup-review-note" rows={5} maxLength={1000} value={note} disabled={busy} onChange={event => { change(); setNote(event.target.value); }} placeholder="What should happen next?" /></div><Button disabled={busy || !dirty} type="submit">{busy ? 'Saving…' : 'Save review'}</Button></form> : <><span className="badge">{reviewStatusOptions.find(option => option.value === submission.status)?.label}</span><p className="setup-member-note">{submission.note || 'Your setup is waiting for review. Your number is not connected yet.'}</p><Link className="action-link" href="/local/admin">Open local admin review <ArrowRight size={15} /></Link></>}
          </section><section className="workspace-card"><header className="card-heading"><h2>Before calls go live</h2></header><p>Number ownership, carrier compatibility, provider connection and a real route test remain pending. Review status does not activate service.</p></section><section className="workspace-card"><header className="card-heading"><h2>Your saved information</h2></header><p>Submitted details stay on this computer until deleted. Keep this browser’s site data to retain access.</p><div className="actions"><Button variant="outline" disabled={busy} onClick={() => setConfirmDelete(!confirmDelete)}>Delete saved setup</Button></div>{confirmDelete && <div className="setup-delete"><p>Remove the draft, submitted profile, and review history from both views?</p><Button disabled={busy} onClick={remove}>Delete from both views</Button><Button variant="outline" onClick={() => setConfirmDelete(false)}>Keep it</Button></div>}</section></div>
        </div>
      </>}
    </main><footer className="review-footer"><span>Made for a quieter day.</span><span>Local setup management</span></footer>
  </div>;
}

'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReviewState } from '@/lib/review/model';
import { commandSchema } from '@/lib/review/commands';
import { Button } from '@/components/ui/button';

type ReviewContext = { state: ReviewState; busy: boolean; error: string; run: (command: unknown, message?: string) => Promise<boolean> };
const Context = createContext<ReviewContext | null>(null);
async function fetchReviewState(): Promise<ReviewState> {
  const response = await fetch('/api/demo/session', { method: 'POST' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data.state;
}
export function useReview() { const value = useContext(Context); if (!value) throw new Error('Review context is missing.'); return value; }
export function ReviewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ReviewState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const locked = useRef(false);
  async function initialize() {
    try { const next = await fetchReviewState(); setError(''); setState(next); }
    catch (error) { setError(error instanceof Error ? error.message : 'The local server is unavailable.'); }
  }
  useEffect(() => {
    let active = true;
    fetchReviewState().then(next => { if (active) setState(next); }).catch(error => { if (active) setError(error instanceof Error ? error.message : 'The local server is unavailable.'); });
    return () => { active = false; };
  }, []);
  async function run(command: unknown, message = 'Saved to this local review.') {
    if (!state || locked.current) return false;
    const parsed = commandSchema.safeParse(command);
    if (!parsed.success) { setError(parsed.error.issues.map(issue => issue.message).join(' ')); return false; }
    locked.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/demo/commands', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ version: state.version, command: parsed.data }) });
      const data = await response.json();
      if (data.state) setState(data.state);
      if (!response.ok) throw new Error(data.error || 'The local change could not be saved.');
      setNotice(message); return true;
    } catch (error) { setError(error instanceof Error ? error.message : 'Connection lost. Reload to check whether the change was saved before retrying.'); return false; }
    finally { locked.current = false; setBusy(false); }
  }
  if (!state) return <section className="empty-state"><h1>{error ? 'Review unavailable' : 'Opening your workspace…'}</h1><p role={error ? 'alert' : 'status'}>{error || 'Loading the local example data.'}</p>{error && <Button onClick={initialize}>Retry</Button>}</section>;
  return <Context.Provider value={{ state, busy, error, run }}><div className="review-feedback" aria-live="polite">{notice && <p className="success-message">{notice}<button aria-label="Dismiss confirmation" onClick={() => setNotice('')}>×</button></p>}</div>{error && <div className="error-message" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError('')}>×</button></div>}{children}</Context.Provider>;
}

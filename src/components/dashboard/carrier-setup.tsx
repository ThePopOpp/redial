'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getCountries } from 'libphonenumber-js';
import { ArrowRight, Check, Phone, ShieldCheck, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { carriers, emptySetup, routeNames, setupSchema, type SavedSetup, type SetupDraft } from '@/lib/dashboard/carrier-setup';
import { saveCarrierSetup } from '@/lib/dashboard/setup-actions';

const stages = ['Your provider', 'Your call path', 'Provider instructions', 'Before connecting', 'Review setup'];
export function CarrierSetup({ workspace, line, saved, unavailable = false }: { workspace?: string; line?: string; saved?: SavedSetup; unavailable?: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const demo = !workspace || !line;
  const [open, setOpen] = useState(false), [step, setStep] = useState(0);
  const [draft, setDraft] = useState<SetupDraft>(saved?.body || emptySetup);
  const [version, setVersion] = useState(saved?.version || 0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false);
  const countryOptions = useMemo(() => { const names = new Intl.DisplayNames(['en'], { type: 'region' }); return getCountries().map(value => ({ value, label: names.of(value) || value })).sort((a,b) => a.label.localeCompare(b.label)); }, []);
  useEffect(() => { if (dialogRef.current) dialogRef.current.scrollTop = 0; if (step > 0) headingRef.current?.focus({ preventScroll: true }); }, [step]);
  const carrier = carriers.find(item => item.id === draft.carrier)!;
  function change<K extends keyof SetupDraft>(key: K, value: SetupDraft[K]) { setDraft(old => ({ ...old, [key]: value })); setError(''); setDone(false); }
  function next() {
    if (step === 0 && (!draft.model.trim() || !draft.os.trim() || !draft.plan.trim() || (draft.carrier === 'other' && !draft.otherCarrier.trim()))) { setError('Add your provider, phone model, software version and plan so compatibility can be checked.'); return; }
    if (step === 1) {
      const result = setupSchema.safeParse({ ...draft, ownsLine: true, understandsRouting: true });
      if (!result.success) { setError(result.error.issues[0].message); return; }
    }
    if (step === 3 && (!draft.ownsLine || !draft.understandsRouting)) { setError('Confirm both items before reviewing your setup.'); return; }
    setError(''); setStep(value => value + 1);
  }
  async function save() {
    const parsed = setupSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    if (demo) { setDone(true); return; }
    setBusy(true); setError('');
    try {
      const result = await saveCarrierSetup({ workspace, line, version, body: parsed.data });
      if (result.error) setError(result.error); else { setVersion(result.version!); setDone(true); }
    } catch { setError('The response was interrupted. Reload to check whether the draft was saved.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={value => { if (busy) return; setOpen(value); if (value) { setStep(0); setError(''); setDone(false); } }}>
    <DialogTrigger asChild><Button variant="outline" disabled={unavailable}><Phone size={16}/>{saved ? 'Review call setup' : 'Set up incoming calls'}</Button></DialogTrigger>
    <DialogContent ref={dialogRef} className="carrier-wizard">
      <header><div><p className="small-label">YOUR INCOMING CALLS</p><DialogTitle>Connect your number, step by step.</DialogTitle></div><Button variant="outline" aria-label="Close call setup" disabled={busy} onClick={() => setOpen(false)}><X size={18}/></Button></header>
      <DialogDescription>{demo ? 'Interactive preview. Use example details; nothing is saved or connected.' : 'Save a setup plan for this line. Connecting calls requires a verified Redial number and a successful call test.'}</DialogDescription>
      <ol className="carrier-progress" aria-label="Call setup steps">{stages.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={index <= step ? 'reached' : ''}><span>{index < step ? <Check size={13}/> : index + 1}</span>{label}</li>)}</ol>
      <div className="carrier-body">
        <aside className="carrier-route" aria-label="Illustrated call path">
          <div className="carrier-node"><Phone size={24}/><strong>Someone calls</strong><span>{draft.route === 'dedicated' ? 'Your Redial number' : 'Your existing number'}</span></div>
          <div className="carrier-path" aria-hidden="true"><span/></div>
          <div className="carrier-node"><strong>{draft.route === 'dedicated' ? 'Redial number' : carrier.id === 'other' ? draft.otherCarrier || 'Your provider' : carrier.name}</strong><span>{draft.route === 'conditional' ? `Forwards when ${draft.condition}` : draft.route === 'all' ? 'Forwards every incoming call' : 'Receives calls directly'}</span></div>
          <div className="carrier-path" aria-hidden="true"><span/></div>
          <div className="carrier-node carrier-destination"><ShieldCheck size={24}/><strong>Redial assistant</strong><span>Pending connection and testing</span></div>
          <p>Illustration only · no call is being placed.</p>
        </aside>
        <section className="carrier-instructions" key={step} aria-label={stages[step]}>
          <p className="small-label">STEP {step + 1} OF {stages.length}</p><h3 ref={headingRef} tabIndex={-1}>{stages[step]}</h3>
          {step === 0 && <div className="carrier-fields">
            <label>Country<select aria-label="Country" value={draft.country} onChange={event => { change('country', event.target.value); if (event.target.value !== 'US') change('carrier', 'other'); }}>{countryOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Mobile provider<select aria-label="Mobile provider" value={draft.carrier} onChange={event => change('carrier', event.target.value as SetupDraft['carrier'])}>{carriers.filter(item => draft.country === 'US' || item.id === 'other').map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            {draft.carrier === 'other' && <label>Provider name<Input value={draft.otherCarrier} maxLength={80} onChange={event => change('otherCarrier', event.target.value)}/></label>}
            <label>Phone type<select aria-label="Phone type" value={draft.device} onChange={event => change('device', event.target.value as SetupDraft['device'])}>{['Android','iPhone','Other'].map(item => <option key={item}>{item}</option>)}</select></label>
            <label>Phone model<Input placeholder={demo ? 'Example: Pixel 9' : 'Your phone model'} value={draft.model} maxLength={80} onChange={event => change('model', event.target.value)}/></label>
            <label>Software version<Input placeholder="From your phone’s About screen" value={draft.os} maxLength={60} onChange={event => change('os', event.target.value)}/></label>
            <label>Plan name or type<Input placeholder="For example, prepaid or business" value={draft.plan} maxLength={80} onChange={event => change('plan', event.target.value)}/></label>
            <p className="carrier-wide">No carrier password is needed. Each plan and device needs its own compatibility check.</p>
          </div>}
          {step === 1 && <>
            <div className="carrier-choices" role="group" aria-label="Connection method">{Object.entries(routeNames).map(([value,label]) => <button key={value} aria-pressed={draft.route === value} onClick={() => change('route', value as SetupDraft['route'])}><strong>{label}</strong><span>{value === 'dedicated' ? 'People call a separate number. No forwarding needed.' : value === 'conditional' ? 'Your phone can ring first. Redial receives only forwarded calls.' : 'Your existing handset may stop ringing. Voicemail behavior changes.'}</span></button>)}</div>
            {draft.route !== 'dedicated' && <label>Number you plan to forward<Input type="tel" autoComplete="tel" placeholder={demo ? '+16025550149' : '+country code and number'} value={draft.sourcePhone} maxLength={16} onChange={event => change('sourcePhone', event.target.value)}/></label>}
            {draft.route === 'conditional' && <label>Forwarding condition<select aria-label="Forwarding condition" value={draft.condition} onChange={event => change('condition', event.target.value as SetupDraft['condition'])}><option value="unanswered">No answer</option><option value="busy">Busy</option><option value="unreachable">Unreachable</option></select></label>}
            <p>These are requested options. Availability is confirmed during your provider check. A dedicated number is an alternative where mobile forwarding is unavailable, subject to local number availability.</p>
          </>}
          {step === 2 && <>
            <p>{draft.route === 'dedicated' ? 'Your Redial number must be assigned and tested before you share it. Calls to your current mobile number continue as usual unless you separately arrange forwarding.' : carrier.guidance}</p>
            {draft.route !== 'dedicated' && carrier.url && <a href={carrier.url} target="_blank" rel="noreferrer">Open {carrier.name}’s official forwarding guide ↗</a>}
            <ol className="carrier-checks"><li>Confirm support for your country, exact plan, phone and selected forwarding condition.</li><li>Get the provider’s reversal instructions and note the current voicemail settings.</li><li>Wait for an assigned, verified Redial destination and a tested fallback.</li><li>Only then follow the matching provider instructions and run an inbound test.</li></ol>
            <div className="carrier-note"><strong>Destination not assigned</strong><p>Do not forward to an example number. This wizard cannot activate forwarding or purchase a number.</p></div>
            <p className="small-label">Documentation reviewed September 25, 2026 · Your route is not yet tested.</p>
          </>}
          {step === 3 && <>
            <p>Before your line can be connected, we need to verify these checks together:</p>
            <ul className="carrier-checks"><li>A caller reaches the correct workspace and line.</li><li>The caller hears the disclosure and can choose the approved alternative.</li><li>A message reaches your inbox with the correct caller information.</li><li>No answer, service outages and limits reach the tested fallback.</li><li>Turning forwarding off restores your expected ringing and voicemail.</li></ul>
            <p>Redial must never send the call back to the same number that forwards into it. Voice forwarding does not connect SMS or make a browser shortcut answer cellular calls.</p>
            <label className="carrier-consent"><input type="checkbox" checked={draft.ownsLine} onChange={event => change('ownsLine', event.target.checked)}/>I own this line or have permission to configure it.</label>
            <label className="carrier-consent"><input type="checkbox" checked={draft.understandsRouting} onChange={event => change('understandsRouting', event.target.checked)}/>I understand this saves my choices; my calls are not connected yet.</label>
          </>}
          {step === 4 && <>
            <dl className="carrier-summary"><dt>Provider</dt><dd>{draft.carrier === 'other' ? draft.otherCarrier : carrier.name} · {draft.country}</dd><dt>Phone</dt><dd>{draft.device} · {draft.model} · {draft.os}</dd><dt>Plan</dt><dd>{draft.plan}</dd><dt>Connection</dt><dd>{routeNames[draft.route]}{draft.route === 'conditional' ? ` (${draft.condition})` : ''}</dd><dt>Source number</dt><dd>{draft.route === 'dedicated' ? 'Dedicated number requested' : draft.sourcePhone}</dd><dt>Call status</dt><dd>Not connected · verification required</dd></dl>
            <div className="carrier-note"><strong>{done ? demo ? 'Preview complete' : 'Setup draft saved' : 'Ready to save your plan'}</strong><p>{done ? demo ? 'No personal details were saved. Close this preview or go back to explore another provider.' : 'Reopen this wizard to review your saved choices. Your line remains inactive pending a verified destination, consent, limits, fallback and call test.' : 'Saving does not change carrier settings or mark any test as passed.'}</p></div>
          </>}
          {error && <p role="alert" className="error-message">{error}</p>}
          {done && <p role="status">{demo ? 'Preview complete. No calls connected.' : 'Saved. No calls connected.'}</p>}
        </section>
      </div>
      <footer><Button variant="outline" disabled={busy || step === 0} onClick={() => { setStep(value => value - 1); setError(''); setDone(false); }}>Back</Button><span>Step {step + 1} of {stages.length}</span>{step < 4 ? <Button onClick={next}>Continue<ArrowRight size={16}/></Button> : done ? <Button onClick={() => setOpen(false)}>Done</Button> : <Button disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : demo ? 'Finish preview' : 'Save setup draft'}</Button>}</footer>
    </DialogContent>
  </Dialog>;
}

'use client';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PhoneSetupSimulator } from './phone-setup-simulator';
import QRCode from 'qrcode';
import { getCountries, type CountryCode } from 'libphonenumber-js/min';
import { Smartphone, Upload, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { fileLimit, fromPhone, importCandidates, parseVCards, type ImportDraft, type PhoneContact } from '@/lib/dashboard/contact-import';
import { importContacts } from '@/lib/dashboard/import-actions';

type ContactNavigator = Navigator & { contacts?: { select: (properties: string[], options: { multiple: boolean }) => Promise<PhoneContact[]> } };
type Props = { workspace: string; line: string; lineName: string; existingPhones: string[]; phoneUrl: string; autoOpen?: boolean };
const subscribeToBrowser = () => () => {};
const hasPicker = () => window.isSecureContext && window.top === window.self && typeof (navigator as ContactNavigator).contacts?.select === 'function';

export function ContactImport({ workspace, line, lineName, existingPhones, phoneUrl, autoOpen = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen), [busy, setBusy] = useState(false);
  const pickerReady = useSyncExternalStore(subscribeToBrowser, hasPicker, () => false);
  const [qr, setQr] = useState('');
  const [drafts, setDrafts] = useState<ImportDraft[]>([]), [chosen, setChosen] = useState<string[]>([]);
  const [country, setCountry] = useState('international'), [search, setSearch] = useState('');
  const [error, setError] = useState(''), [success, setSuccess] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const candidates = useMemo(() => importCandidates(drafts, existingPhones, country === 'international' ? undefined : country as CountryCode), [drafts, existingPhones, country]);
  const selected = candidates.filter(c => !c.issue && chosen.includes(c.key));
  const countryOptions = useMemo(() => {
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    return [{ value: 'international', label: 'International numbers (+country code)' }, ...getCountries().map(value => ({ value, label: `${names.of(value)} (${value})` })).sort((a, b) => a.label.localeCompare(b.label))];
  }, []);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(phoneUrl, { width: 224, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#101211', light: '#ffffff' } }).then(value => { if (!cancelled) setQr(value); }).catch(() => { if (!cancelled) setError('QR code could not be created. Use the phone link below.'); });
    const refresh = () => { if (document.visibilityState === 'visible') router.refresh(); };
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [open, phoneUrl, router]);

  function close() { if (busy) return; setOpen(false); setDrafts([]); setChosen([]); setSearch(''); setError(''); router.refresh(); }
  function receive(values: ImportDraft[]) { setDrafts(values); setChosen([]); setError(values.length ? '' : 'No phone numbers were shared. Try again or choose a vCard file.'); }
  async function pick(multiple: boolean) {
    setBusy(true); setError('');
    try {
      const contacts = await (navigator as ContactNavigator).contacts!.select(['name', 'tel'], { multiple });
      if (contacts.length) receive(fromPhone(contacts));
    } catch (cause) { if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError(cause instanceof Error ? cause.message : 'Could not open phone contacts. Try a vCard file.'); }
    finally { setBusy(false); }
  }
  async function readFile(file?: File) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      if (file.size > fileLimit) throw new Error('Choose a vCard smaller than 2 MB.');
      receive(parseVCards(await file.text()));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'This file could not be read.'); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError('');
    try {
      const result = await importContacts({ workspace, line, contacts: selected.map(({ name, phone }) => ({ name, phone })) });
      if (result.error) { setError(result.error); return; }
      setSuccess(`${result.added} contact${result.added === 1 ? '' : 's'} imported${result.skipped ? `; ${result.skipped} already listed and skipped` : ''}.`);
      setDrafts([]); setChosen([]); setOpen(false); router.refresh();
    } catch { setError('The response was interrupted. You can retry; matching phone numbers will be skipped.'); }
    finally { setBusy(false); }
  }
  const localOnly = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(phoneUrl).hostname);
  return <>
    <div className="contact-import-toolbar"><PhoneSetupSimulator /><Button variant="outline" onClick={() => { setOpen(true); setSuccess(''); }}><Smartphone size={16} />From phone</Button><Button variant="outline" onClick={() => { setOpen(true); setSuccess(''); }}><Upload size={16} />Import vCard</Button>{success && <p role="status">{success}</p>}</div>
    <Dialog open={open} onOpenChange={value => value ? setOpen(true) : close()}>
      <DialogContent className="contact-import-dialog" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onInteractOutside={event => { if (busy) event.preventDefault(); }}>
        <header className="contact-import-heading"><DialogTitle>{drafts.length ? 'Review your contacts' : 'Import from your phone'}</DialogTitle><Button variant="outline" aria-label="Close contact import" onClick={close} disabled={busy}><X size={18} /></Button></header>
        <DialogDescription>Import into {lineName}. Only selected names and phone numbers are saved. Existing call preferences stay unchanged.</DialogDescription>
        {!drafts.length ? <div className="contact-import-sources">
          {pickerReady ? <section className="contact-import-panel"><h3>Choose from your phone</h3><p>Your phone decides what to share. Choose one contact or select several in its contact list, then review them here.</p><div className="actions"><Button onClick={() => void pick(false)} disabled={busy}>Choose one contact</Button><Button variant="outline" onClick={() => void pick(true)} disabled={busy}>Select contacts</Button></div></section> : <section className="contact-import-panel"><h3>Continue on your phone</h3><p>Scan with your phone camera and sign in to the same Redial account. Import there, and this contact list refreshes automatically.</p>{qr && <Image unoptimized className="contact-import-qr" src={qr} alt="QR code to open this line’s contact importer on your phone" width={224} height={224} />}<a href={phoneUrl}>Open phone import link</a>{localOnly && <p className="contact-import-hint">This preview address only works on this computer. Phone scanning will work when Redial is available at your HTTPS domain.</p>}<p className="contact-import-hint">The phone picker is available in supported Android browsers. On iPhone or other browsers, use a vCard export below.</p></section>}
          <section className="contact-import-panel"><h3>Upload a vCard (.vcf)</h3><p>Choose an exported contact file, then select one, several, or all eligible numbers. The file is read on this device before you confirm.</p><input ref={fileInput} type="file" accept=".vcf,.vcard,text/vcard,text/x-vcard" aria-label="Choose vCard file" hidden onChange={event => { void readFile(event.target.files?.[0]); event.target.value = ''; }} /><Button variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}><Upload size={16} />Choose .vcf file</Button><details><summary>Exporting your contacts</summary><p>Use Export or Share in your phone’s Contacts app and save a vCard (.vcf). You can also export a vCard from iCloud Contacts. Return here and choose that file. Up to 1,000 numbers and 2 MB per import.</p></details></section>
        </div> : <>
          <Button variant="outline" onClick={() => { setDrafts([]); setChosen([]); setError(''); }} disabled={busy}><ArrowLeft size={16} />Choose a different source</Button>
          <label htmlFor="import-country">Country for numbers without a country code</label><Select id="import-country" value={country} onValueChange={value => { setCountry(value); setChosen([]); }} options={countryOptions} disabled={busy} />
          <Input aria-label="Search import contacts" placeholder="Search names or numbers" value={search} onChange={event => setSearch(event.target.value)} />
          <div className="actions"><Button variant="outline" disabled={busy} onClick={() => setChosen(candidates.filter(c => !c.issue).map(c => c.key))}>Select all eligible</Button><Button variant="outline" disabled={busy} onClick={() => setChosen([])}>Clear selection</Button><span aria-live="polite">{selected.length} selected of {candidates.length}</span></div>
          <div className="contact-import-list">{candidates.filter(c => `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase())).map(candidate => <label className="contact-import-row" key={candidate.key}><Checkbox aria-label={`Import ${candidate.name} ${candidate.phone}`} checked={chosen.includes(candidate.key) && !candidate.issue} disabled={Boolean(candidate.issue) || busy} onCheckedChange={value => setChosen(previous => value === true ? [...previous, candidate.key] : previous.filter(key => key !== candidate.key))} /><span><strong>{candidate.name}</strong><small>{candidate.phone}</small>{candidate.issue && <small className="contact-import-hint">{candidate.issue}</small>}</span></label>)}</div>
          <Button onClick={() => void save()} disabled={busy || !selected.length}>{busy ? 'Importing…' : `Import ${selected.length} selected`}</Button>
        </>}
        {busy && !drafts.length && <p role="status">Waiting for your contacts…</p>}{error && <p role="alert" className="error-message">{error}</p>}
      </DialogContent>
    </Dialog>
  </>;
}

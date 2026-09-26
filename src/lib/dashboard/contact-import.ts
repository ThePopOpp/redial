import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';

export const importLimit = 1000;
export const fileLimit = 2 * 1024 * 1024;
export type PhoneContact = { name?: string[]; tel?: string[] };
export type ImportDraft = { name: string; phone: string };
export type Candidate = ImportDraft & { key: string; issue: string };

export function normalizeContactPhone(value: string, country?: CountryCode) {
  const parsed = parsePhoneNumberFromString(value.replace(/^tel:/i, ''), { defaultCountry: country, extract: false });
  return parsed?.isPossible() && !parsed.ext ? String(parsed.number) : null;
}

export function fromPhone(contacts: PhoneContact[]): ImportDraft[] {
  if (contacts.length > importLimit) throw new Error('Choose up to 1,000 contacts at a time.');
  const drafts = contacts.flatMap(contact => (contact.tel || []).map(phone => ({ name: contact.name?.find(n => n.trim()) || phone, phone })));
  if (drafts.length > importLimit) throw new Error('Choose up to 1,000 phone numbers at a time.');
  return drafts;
}

function decodeValue(value: string, parameters: string) {
  if (/ENCODING=QUOTED-PRINTABLE/i.test(parameters)) {
    const bytes: number[] = [];
    for (let i = 0; i < value.length; i++) {
      if (value[i] === '=' && /^[\da-f]{2}$/i.test(value.slice(i + 1, i + 3))) { bytes.push(parseInt(value.slice(i + 1, i + 3), 16)); i += 2; }
      else bytes.push(...new TextEncoder().encode(value[i]));
    }
    const charset = /CHARSET=([^;:]+)/i.exec(parameters)?.[1] || 'utf-8';
    try { value = new TextDecoder(charset).decode(new Uint8Array(bytes)); } catch { throw new Error('This vCard uses an unsupported text encoding. Export it as UTF-8.'); }
  }
  return value.replace(/\\([nN,;\\])/g, (_, char: string) => /n/i.test(char) ? ' ' : char).trim();
}

// Only names and phone numbers are extracted. Photos, URLs, notes and email
// addresses are never uploaded or fetched. vCard 2.1, 3.0 and 4.0 text exports.
export function parseVCards(text: string): ImportDraft[] {
  if (new TextEncoder().encode(text).length > fileLimit) throw new Error('Choose a vCard smaller than 2 MB.');
  const lines: string[] = [];
  for (const line of text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/)) {
    const previous = lines.at(-1);
    if (previous && /ENCODING=QUOTED-PRINTABLE/i.test(previous) && previous.endsWith('=')) lines[lines.length - 1] = previous.slice(0, -1) + line;
    else if (/^[\t ]/.test(line) && previous) lines[lines.length - 1] += line.slice(1);
    else lines.push(line);
  }
  const contacts: PhoneContact[] = [];
  let current: PhoneContact | null = null;
  let fallback = '';
  for (const line of lines) {
    if (/^BEGIN:VCARD$/i.test(line)) { current = { tel: [] }; fallback = ''; continue; }
    if (/^END:VCARD$/i.test(line)) { if (current) contacts.push({ ...current, name: current.name || [fallback] }); current = null; continue; }
    if (!current) continue;
    const separator = line.indexOf(':'); if (separator < 0) continue;
    const parameters = line.slice(0, separator), key = parameters.split(';')[0].split('.').at(-1)?.toUpperCase();
    if (!['FN', 'N', 'TEL'].includes(key || '')) continue;
    const value = decodeValue(line.slice(separator + 1), parameters);
    if (key === 'FN') current.name = [value];
    if (key === 'N') { const [last, first, middle, prefix, suffix] = value.split(';'); fallback = [prefix, first, middle, last, suffix].filter(Boolean).join(' '); }
    if (key === 'TEL' && value) current.tel?.push(value);
  }
  if (current) throw new Error('This vCard is incomplete. Export the file again.');
  const drafts = fromPhone(contacts);
  if (!drafts.length) throw new Error('No phone numbers were found in this vCard.');
  return drafts;
}

export function importCandidates(drafts: ImportDraft[], existing: string[], country?: CountryCode): Candidate[] {
  const seen = new Set(existing.map(phone => normalizeContactPhone(phone)).filter(Boolean));
  return drafts.map((draft, index) => {
    const phone = normalizeContactPhone(draft.phone, country), name = draft.name.trim();
    const issue = !phone ? 'Choose the country for local numbers, or use an international number without an extension.' : !name || name.length > 100 ? 'Name must contain 1–100 characters.' : seen.has(phone) ? 'Already listed — skipped' : '';
    if (phone && !issue) seen.add(phone);
    return { name, phone: phone || draft.phone, key: String(index), issue };
  });
}

export function contactReturnPath(value: unknown) {
  if (typeof value !== 'string') return '/app';
  try {
    const url = new URL(value, 'https://redial.invalid');
    if (url.origin !== 'https://redial.invalid' || url.pathname !== '/app/contacts') return '/app';
    const result = new URLSearchParams();
    for (const key of ['workspace', 'line']) { const id = url.searchParams.get(key); if (id && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) result.set(key, id); }
    result.set('import', 'phone');
    return `/app/contacts?${result}`;
  } catch { return '/app'; }
}

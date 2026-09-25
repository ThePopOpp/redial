import { test, expect } from '@playwright/test';
import { contactReturnPath, fromPhone, importCandidates, normalizeContactPhone, parseVCards } from '../src/lib/dashboard/contact-import';

test('vCards preserve international names, multiple numbers, and folded values', () => {
  const contacts = parseVCards('BEGIN:VCARD\r\nVERSION:2.1\r\nFN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Jos=C3=A9=\r\n Nu=C3=B1ez\r\nTEL;CELL:+1 602-555-0101\r\nTEL:+44 20 7123 4567\r\nPHOTO;VALUE=URI:https://invalid.example/photo\r\nEND:VCARD\r\nBEGIN:VCARD\r\nVERSION:4.0\r\nFN:Sam \\,\r\n  Lee\r\nitem1.TEL;VALUE=uri:tel:+16025550102\r\nEND:VCARD');
  expect(contacts).toHaveLength(3);
  expect(contacts[0].name).toBe('José Nuñez');
  expect(contacts[2].name).toBe('Sam , Lee');
  expect(importCandidates(contacts, [])[2].phone).toBe('+16025550102');
  expect(Object.keys(contacts[0]).sort()).toEqual(['name', 'phone']);
});
test('country-aware normalization never matches by name or trailing digits', () => {
  expect(normalizeContactPhone('020 7123 4567')).toBeNull();
  expect(normalizeContactPhone('020 7123 4567', 'GB')).toBe('+442071234567');
  expect(normalizeContactPhone('+1 6025550101 ext 5')).toBeNull();
  const candidates = importCandidates([{ name:'Same name',phone:'+16025550101' },{ name:'Same name',phone:'+442071234567' },{ name:'Repeat',phone:'+1 (602) 555-0101' }],[]);
  expect(candidates.map(c=>Boolean(c.issue))).toEqual([false,false,true]);
});
test('malformed, oversized and excessive imports are rejected', () => {
  expect(()=>parseVCards('junk')).toThrow('No phone numbers');
  expect(()=>parseVCards('BEGIN:VCARD\nTEL:+16025550101')).toThrow('incomplete');
  expect(()=>parseVCards('x'.repeat(2*1024*1024+1))).toThrow('2 MB');
  expect(()=>fromPhone(Array.from({length:1001},()=>({tel:['+16025550101']})))).toThrow('1,000');
});
test('QR sign-in return paths cannot redirect outside scoped contacts', () => {
  expect(contactReturnPath('https://evil.example/app/contacts')).toBe('/app');
  expect(contactReturnPath('//evil.example')).toBe('/app');
  expect(contactReturnPath('/ops?role=admin')).toBe('/app');
  expect(contactReturnPath('/app/contacts?workspace=bad&next=https://evil.example')).toBe('/app/contacts?import=phone');
});

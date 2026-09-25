import { z } from 'zod';

export const uuid = z.uuid();
const text = (max = 100) => z.string().trim().min(1).max(max);
const phone = z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use an international number such as +442071234567.');
export const recordSchemas = {
  contact: z.object({ name: text(), phone, policy: z.enum(['standard','vip','blocked']) }).strict(),
  directory: z.object({ name: text(), phone, extension: z.string().regex(/^\d{0,8}$/).default('') }).strict(),
  callback: z.object({ name: text(), phone, scheduledAt: z.iso.datetime(), note: z.string().max(1000), done: z.boolean() }).strict(),
  policy: z.object({ mode: z.enum(['unknown','all','spam_only']), maxSeconds: z.number().int().min(30).max(120), vip: z.boolean() }).strict(),
  agent: z.object({ name: text(80), greeting: text(400), instructions: text(1800) }).strict(),
  preferences: z.object({ timezone: z.string().refine(value => { try { new Intl.DateTimeFormat('en',{timeZone:value}); return true; } catch { return false; } }, 'Choose a valid IANA timezone.'), retentionDays: z.number().int().min(7).max(90), email: z.boolean() }).strict(),
  ticket: z.object({ subject: text(150), body: text(4000) }).strict(),
};
export type RecordKind = keyof typeof recordSchemas;
export type DashboardRecord = { id: string; workspace_id: string; line_id: string | null; kind: RecordKind; body: Record<string, string | number | boolean>; version: number; created_at: string; owner_id: string };
export type Workspace = { id: string; name: string; type: 'personal' | 'business' };
export type Line = { id: string; name: string; owner_id: string; status: string };
export const views = ['overview','calls','live','screening','agent','directory','contacts','callbacks','numbers','connections','people','billing','settings','help','audit'] as const;
export const labels = ['Overview','Call inbox','Live Call Controls','Screening','Your assistant','Directory','Contacts','Callbacks','Numbers & setup','Connections','People & access','Membership','Settings','Help & support','Activity'];
export const capabilities = ['read_summary','read_transcript','manage_rules','monitor_live','takeover_live','direct_agent','transfer_call'] as const;

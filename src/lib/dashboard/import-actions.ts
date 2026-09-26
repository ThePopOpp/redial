'use server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { verifiedAccount } from '@/lib/supabase/server';
import { appOrigin } from '@/lib/supabase/config';
import { importLimit, normalizeContactPhone } from './contact-import';

const inputSchema = z.object({ workspace: z.uuid(), line: z.uuid(), contacts: z.array(z.object({ name: z.string().trim().min(1).max(100), phone: z.string().max(40) }).strict()).min(1).max(importLimit) }).strict();
export async function importContacts(input: unknown): Promise<{ added: number; skipped: number; error?: string }> {
  try {
    if ((await headers()).get('origin') !== appOrigin()) throw new Error('Origin');
    const account = await verifiedAccount(); if (!account) throw new Error('Identity');
    const parsed = inputSchema.parse(input);
    const contacts = parsed.contacts.map(contact => {
      const phone = normalizeContactPhone(contact.phone); if (!phone) throw new Error('Phone');
      return { name: contact.name, phone };
    });
    const { data, error } = await account.db.rpc('import_contacts', { w: parsed.workspace, l: parsed.line, contacts });
    if (error || !data || !Number.isInteger(data.added) || !Number.isInteger(data.skipped)) throw new Error('Import');
    revalidatePath('/app/contacts');
    return { added: data.added, skipped: data.skipped };
  } catch { return { added: 0, skipped: 0, error: 'Contacts could not be imported. Check your connection and line access, then try again. Existing contacts were not changed.' }; }
}

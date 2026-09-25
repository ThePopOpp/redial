'use server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { verifiedAccount } from '@/lib/supabase/server';
import { appOrigin } from '@/lib/supabase/config';
import { setupSchema } from './carrier-setup';

export async function saveCarrierSetup(input: unknown): Promise<{ version?: number; error?: string }> {
  try {
    if ((await headers()).get('origin') !== appOrigin()) throw new Error('Origin');
    const account = await verifiedAccount(); if (!account) throw new Error('Identity');
    const parsed = z.object({ workspace: z.uuid(), line: z.uuid(), version: z.number().int().min(0), body: setupSchema }).strict().parse(input);
    const { data, error } = await account.db.rpc('save_line_setup', { w: parsed.workspace, l: parsed.line, expected_version: parsed.version, draft: parsed.body });
    if (error || !Number.isInteger(data)) throw new Error('Save');
    revalidatePath('/app/numbers');
    return { version: data };
  } catch {
    return { error: 'Setup could not be saved. Your line permissions may have changed, or another tab saved a newer version. Reload before retrying.' };
  }
}

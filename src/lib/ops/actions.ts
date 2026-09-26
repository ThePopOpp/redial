'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { appOrigin } from '@/lib/supabase/config';
import { requireStaff } from '@/lib/supabase/staff';

export async function promoteStaff(form: FormData) {
  if ((await headers()).get('origin') !== appOrigin()) redirect('/ops/staff?notice=failed');
  // Re-checked on every write, not only when the page rendered. The database
  // function checks again, so neither layer is trusted alone.
  const account = await requireStaff('staff_admin');
  const input = z.object({
    target: z.uuid(),
    role: z.enum(['owner', 'admin', 'support', 'finance', 'growth', 'analyst']),
    note: z.string().trim().max(500).optional(),
  }).safeParse({ target: form.get('target'), role: form.get('role'), ...(form.get('note') ? { note: form.get('note') } : {}) });
  if (!input.success) redirect('/ops/staff?notice=failed');
  const { error } = await account.db.rpc('promote_staff', {
    target: input.data.target,
    new_role: input.data.role,
    is_active: form.get('active') === '1',
    staff_note: input.data.note || null,
  });
  revalidatePath('/ops', 'layout');
  redirect(error ? '/ops/staff?notice=failed' : '/ops/staff?notice=saved');
}

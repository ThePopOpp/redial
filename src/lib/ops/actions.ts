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

// --- Plans and pricing -------------------------------------------------------
// Reading the catalog needs billing_read; changing it needs catalog_write. Each
// action re-checks on the write rather than trusting the render, and the
// database function checks again, so neither layer stands alone.
const catalogFailed = '/ops/catalog?notice=failed';
const catalogSaved = '/ops/catalog?notice=saved';

async function catalogWriter() {
  if ((await headers()).get('origin') !== appOrigin()) redirect(catalogFailed);
  return requireStaff('catalog_write');
}

function finish(error: unknown) {
  revalidatePath('/ops/catalog');
  redirect(error ? catalogFailed : catalogSaved);
}

// Money is entered in major units because that is what a person types, and
// stored in minor units because that is the only representation that does not
// drift. The conversion happens once, here.
const majorToMinor = (value: string) => Math.round(Number(value) * 100);

export async function createProduct(form: FormData) {
  const account = await catalogWriter();
  const input = z.object({
    code: z.string().trim().regex(/^[a-z][a-z0-9_]{1,40}$/),
    name: z.string().trim().min(1).max(80),
    kind: z.enum(['membership', 'add_on']),
  }).safeParse({ code: form.get('code'), name: form.get('name'), kind: form.get('kind') });
  if (!input.success) redirect(catalogFailed);
  const { error } = await account.db.rpc('create_billing_product', input.data);
  finish(error);
}

// Features and limits are entered as JSON because they are open-ended: what a
// plan includes changes faster than a column would. They are validated as
// objects here and bounded by the column checks in the database.
const planBody = z.object({
  features: z.string().transform((raw, ctx) => {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      return parsed as Record<string, unknown>;
    } catch { ctx.addIssue({ code: 'custom', message: 'Features must be a JSON object.' }); return z.NEVER; }
  }),
  limits: z.string().transform((raw, ctx) => {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      return parsed as Record<string, unknown>;
    } catch { ctx.addIssue({ code: 'custom', message: 'Limits must be a JSON object.' }); return z.NEVER; }
  }),
});

export async function createPlanVersion(form: FormData) {
  const account = await catalogWriter();
  const input = planBody.extend({ product: z.uuid() })
    .safeParse({ product: form.get('product'), features: form.get('features'), limits: form.get('limits') });
  if (!input.success) redirect(catalogFailed);
  const { error } = await account.db.rpc('create_plan_version', input.data);
  finish(error);
}

export async function updatePlanDraft(form: FormData) {
  const account = await catalogWriter();
  const input = planBody.extend({ plan_version: z.uuid() })
    .safeParse({ plan_version: form.get('plan_version'), features: form.get('features'), limits: form.get('limits') });
  if (!input.success) redirect(catalogFailed);
  const { error } = await account.db.rpc('update_plan_draft', input.data);
  finish(error);
}

export async function publishPlanVersion(form: FormData) {
  const account = await catalogWriter();
  const input = z.uuid().safeParse(form.get('plan_version'));
  if (!input.success) redirect(catalogFailed);
  const { error } = await account.db.rpc('publish_plan_version', { plan_version: input.data });
  finish(error);
}

export async function retirePlanVersion(form: FormData) {
  const account = await catalogWriter();
  const input = z.uuid().safeParse(form.get('plan_version'));
  if (!input.success) redirect(catalogFailed);
  const { error } = await account.db.rpc('retire_plan_version', { plan_version: input.data });
  finish(error);
}

export async function setPlanPrice(form: FormData) {
  const account = await catalogWriter();
  const input = z.object({
    plan_version: z.uuid(),
    cadence: z.enum(['monthly', 'annual', 'free']),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
    amount: z.string().refine(value => Number.isFinite(Number(value)) && Number(value) >= 0, 'Enter an amount'),
    square_variation: z.string().trim().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(),
  }).safeParse({
    plan_version: form.get('plan_version'), cadence: form.get('cadence'),
    currency: form.get('currency'), amount: form.get('amount'),
    ...(form.get('square_variation') ? { square_variation: form.get('square_variation') } : {}),
  });
  if (!input.success) redirect(catalogFailed);
  const { error } = await account.db.rpc('set_plan_price', {
    plan_version: input.data.plan_version, cadence: input.data.cadence, currency: input.data.currency,
    amount_minor: majorToMinor(input.data.amount), square_variation: input.data.square_variation ?? null,
  });
  finish(error);
}

export async function publishPrice(form: FormData) {
  const account = await catalogWriter();
  const input = z.uuid().safeParse(form.get('price'));
  if (!input.success) redirect(catalogFailed);
  const { error } = await account.db.rpc('publish_price', { price: input.data });
  finish(error);
}

export async function retirePrice(form: FormData) {
  const account = await catalogWriter();
  const input = z.uuid().safeParse(form.get('price'));
  if (!input.success) redirect(catalogFailed);
  const { error } = await account.db.rpc('retire_price', { price: input.data });
  finish(error);
}

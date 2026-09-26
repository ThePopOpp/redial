import 'server-only';
import { redirect, notFound } from 'next/navigation';
import { verifiedAccount } from './server';
import type { StaffCapability } from '@/lib/ops/sections';

export async function staffAccount() {
  const account = await verifiedAccount(); if (!account) return null;
  const { data: staff, error } = await account.db.from('platform_staff').select('role,active').eq('user_id', account.user.id).maybeSingle();
  if (error || !staff?.active) return null;
  const { data, error: claimError } = await account.db.auth.getClaims();
  const mfa = !claimError && data?.claims.aal === 'aal2';
  // Capabilities resolve server-side from the database matrix, never from a
  // role string in editable user metadata.
  let capabilities: StaffCapability[] = [];
  if (mfa) {
    const { data: rows } = await account.db.rpc('staff_capabilities_for_me');
    capabilities = (rows ?? []).map((row: { capability: string }) => row.capability as StaffCapability);
  }
  return { ...account, role: String(staff.role), mfa, capabilities, can: (c: StaffCapability) => capabilities.includes(c) };
}

export type StaffSession = NonNullable<Awaited<ReturnType<typeof staffAccount>>>;

// Every page calls this, including those inside the gated layout. A layout
// check is a convenience, not an authorization boundary.
export async function requireStaff(capability?: StaffCapability) {
  const account = await staffAccount();
  if (!account) redirect('/staff-sign-in');
  if (!account.mfa) redirect('/ops');
  // notFound rather than 403: a finance operator should not learn that the
  // staff administration section exists.
  if (capability && !account.can(capability)) notFound();
  return account;
}

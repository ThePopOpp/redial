import 'server-only';
import { createHash } from 'node:crypto';

// Bounded, per-process protection that supplements Supabase's own persistent
// Auth limits rather than replacing them. This deployment runs a single web
// instance, so a shared store would buy nothing yet; once the web unit scales
// past one replica this has to move to Postgres or Redis, because each process
// would otherwise grant the full allowance on its own.
const state = globalThis as typeof globalThis & { redialAuthLimits?: Map<string, { count: number; until: number }> };
const limits = state.redialAuthLimits ??= new Map();

// Identities are hashed so an address never sits in process memory in the clear.
export function allowAuthRequest(identity: string) {
  const now = Date.now();
  for (const [key, item] of limits) if (item.until <= now) limits.delete(key);
  // A flood of unique identities must not grow the map without bound. Refusing
  // once it is this large is the safe direction to fail.
  if (limits.size > 2000) return false;
  const key = createHash('sha256').update(identity.toLowerCase()).digest('hex');
  // Fixed one-minute windows: a generous ceiling for the whole process, and a
  // tight one per identity so a single account cannot be ground down.
  for (const [bucket, max] of [['global', 120], [key, 8]] as const) {
    const entry = limits.get(bucket) ?? { count: 0, until: now + 60_000 };
    if (++entry.count > max) return false;
    limits.set(bucket, entry);
  }
  return true;
}

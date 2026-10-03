import 'server-only';
import { serverSupabase } from '@/lib/supabase/server';

// What a prospective member is allowed to see of the catalog. No filter is
// written here on purpose: `plan_version_public_read` and `price_public_read`
// already restrict both tables to `availability = 'available'` for anon and
// authenticated alike, so a draft or retired row cannot come back through this
// path even if this query forgot to ask. The policy is the authority.
export type PublishedPrice = { id: string; cadence: string; currency: string; amountMinor: number };
export type PublishedPlan = {
  code: string; name: string; kind: string;
  planVersionId: string; version: number;
  features: Record<string, unknown>; limits: Record<string, unknown>;
  prices: PublishedPrice[];
};

type Row = {
  code: string; name: string; kind: string;
  plan_versions: { id: string; version: number; features: Record<string, unknown>; limits: Record<string, unknown>;
    prices: { id: string; cadence: string; currency: string; amount_minor: number }[] }[];
};

export async function publishedPlans(): Promise<PublishedPlan[]> {
  const db = await serverSupabase();
  if (!db) return [];
  const { data, error } = await db
    .from('billing_products')
    .select('code,name,kind,plan_versions(id,version,features,limits,prices(id,cadence,currency,amount_minor))');
  if (error || !data) return [];
  return (data as Row[]).flatMap(product => {
    // The newest readable version is the one on offer. Older ones stay visible
    // to their existing subscribers through the subscription, not through here.
    const version = [...(product.plan_versions ?? [])].sort((a, b) => b.version - a.version)[0];
    // A plan with no published price cannot be chosen, so it is not offered.
    if (!version || !version.prices?.length) return [];
    return [{
      code: product.code, name: product.name, kind: product.kind,
      planVersionId: version.id, version: version.version,
      features: version.features ?? {}, limits: version.limits ?? {},
      prices: version.prices.map(price => ({ id: price.id, cadence: price.cadence, currency: price.currency, amountMinor: price.amount_minor })),
    }];
  }).sort((a, b) => (a.prices[0]?.amountMinor ?? 0) - (b.prices[0]?.amountMinor ?? 0));
}

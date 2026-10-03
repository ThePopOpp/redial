import { checkLocalRequest, failure, json } from '@/lib/review/store';
import { publishedPlans } from '@/lib/landing/plans';

export const runtime = 'nodejs';

// The catalog a prospective member can choose from. Behind the same access gate
// as the rest of the site; the row-level policies decide what is in it.
export async function GET(request: Request) {
  try {
    checkLocalRequest(request);
    return json({ plans: await publishedPlans() });
  } catch (error) { return failure(error); }
}

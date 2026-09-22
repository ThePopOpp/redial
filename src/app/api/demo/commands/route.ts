import { checkLocalRequest, failure, mutateReview } from '@/lib/review/store';
export const runtime = 'nodejs';
export async function POST(request: Request) { try { checkLocalRequest(request, true); return await mutateReview(request); } catch (error) { return failure(error); } }

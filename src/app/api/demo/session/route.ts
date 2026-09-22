import { checkLocalRequest, failure, openReview, getReview } from '@/lib/review/store';
export const runtime = 'nodejs';
export async function POST(request: Request) { try { checkLocalRequest(request, true); return await openReview(); } catch (error) { return failure(error); } }
export async function GET(request: Request) { try { checkLocalRequest(request); return await getReview(); } catch (error) { return failure(error); } }

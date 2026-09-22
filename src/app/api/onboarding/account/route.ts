import { checkLocalRequest, failure } from '@/lib/review/store';
import { getSetupAccount } from '@/lib/landing/onboarding-store';
export const runtime = 'nodejs';
export async function GET(request: Request) { try { checkLocalRequest(request); return await getSetupAccount(); } catch (error) { return failure(error); } }

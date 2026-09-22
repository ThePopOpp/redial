import { checkLocalRequest, failure } from '@/lib/review/store';
import { getSetupAccount, manageSetup } from '@/lib/landing/onboarding-store';
export const runtime = 'nodejs';
// Management preview of this browser's submission only: no staff authority,
// other-session enumeration, provider changes or service activation.
export async function GET(request: Request) { try { checkLocalRequest(request); return await getSetupAccount(); } catch (error) { return failure(error); } }
export async function PATCH(request: Request) { try { checkLocalRequest(request, true); return await manageSetup(request); } catch (error) { return failure(error); } }

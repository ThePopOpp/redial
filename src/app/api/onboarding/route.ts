import { checkLocalRequest, failure } from '@/lib/review/store';
import { deleteOnboarding, getOnboarding, saveOnboarding } from '@/lib/landing/onboarding-store';

export const runtime = 'nodejs';
export async function GET(request: Request) { try { checkLocalRequest(request); return await getOnboarding(); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { checkLocalRequest(request, true); return await saveOnboarding(request); } catch (error) { return failure(error); } }
export async function DELETE(request: Request) { try { checkLocalRequest(request, true); return await deleteOnboarding(); } catch (error) { return failure(error); } }
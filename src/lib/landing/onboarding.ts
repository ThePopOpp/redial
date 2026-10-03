import { z } from 'zod';
export const carrierOptions = ['T-Mobile', 'AT&T', 'Verizon', 'Mint Mobile', 'Boost Mobile', 'Cricket Wireless', 'Metro by T-Mobile', 'Visible', 'Google Fi Wireless', 'US Mobile', 'Consumer Cellular', 'Spectrum Mobile', 'Xfinity Mobile', 'Straight Talk', 'Tracfone', 'Other / not sure'] as const;
export const draftSchema = z.strictObject({
  fullName: z.string().trim().max(100), email: z.string().trim().max(180), phone: z.string().trim().max(30),
  lineType: z.enum(['personal', 'business']), carrier: z.enum(['', ...carrierOptions]),
  connection: z.enum(['conditional', 'dedicated']), connectionReviewed: z.boolean(), checksReviewed: z.boolean(),
  provider: z.enum(['redial', 'own']), providerName: z.string().trim().max(100), voice: z.enum(['Calm', 'Warm', 'Direct']),
  screening: z.enum(['unknown', 'spam_only', 'all']), greeting: z.string().trim().max(400),
  // The account type the member chose, by product code, with the cadence they
  // picked. The code rather than the plan version id: a version can be
  // superseded between saving a setup request and acting on it, and what they
  // chose was the plan, not that particular revision of it.
  planCode: z.string().trim().max(41), planCadence: z.enum(['', 'monthly', 'annual', 'free']),
  depositAcknowledged: z.boolean(),
  acknowledgeLocal: z.boolean(), step: z.number().int().min(1).max(8), complete: z.boolean(),
});
export type OnboardingDraft = z.infer<typeof draftSchema>;
export const initialDraft: OnboardingDraft = { fullName: '', email: '', phone: '', lineType: 'personal', carrier: '', connection: 'conditional', connectionReviewed: false, checksReviewed: false, provider: 'redial', providerName: '', voice: 'Calm', screening: 'unknown', greeting: 'Hi, you’ve reached my AI assistant. May I ask who’s calling and what this is about?', planCode: '', planCadence: '', depositAcknowledged: false, acknowledgeLocal: false, step: 1, complete: false };
export function normalizePhone(value: string) { const digits = value.replace(/\D/g, ''); return digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith('1') ? `+${digits}` : ''; }
export function validateStep(draft: OnboardingDraft, step: number): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 1) {
    if (draft.fullName.trim().length < 2) errors.fullName = 'Enter your name.';
    if (!z.email().safeParse(draft.email).success) errors.email = 'Enter a valid email address.';
    if (!/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(normalizePhone(draft.phone))) errors.phone = 'Enter a valid 10-digit US or Canadian phone number.';
    if (!draft.carrier) errors.carrier = 'Choose your carrier, or select Other / not sure.';
  }
  if (step === 3 && !draft.connectionReviewed) errors.connectionReviewed = 'Confirm that you understand activation happens after verification.';
  if (step === 4 && !draft.checksReviewed) errors.checksReviewed = 'Confirm that the route still needs a real test before activation.';
  if (step === 5 && draft.provider === 'own' && !draft.providerName.trim()) errors.providerName = 'Tell us which provider you would like to use.';
  if (step === 6 && draft.greeting.trim().length < 20) errors.greeting = 'Add a greeting of at least 20 characters that introduces your AI assistant.';
  if (step === 6 && !/\bAI\b|artificial intelligence/i.test(draft.greeting)) errors.greeting = 'Include “AI” so callers know an AI assistant is answering.';
  // The account type is a recorded preference, not a contract: no money moves
  // on this form and the binding choice happens at checkout. So it is optional
  // — a deployment with nothing published must not be able to trap someone on
  // this step. Choosing a paid plan does require the deposit to be understood,
  // because that is a real disclosure rather than a preference.
  if (step === 7 && draft.planCode && !draft.planCadence) errors.planCadence = 'Choose how often you would be billed.';
  if (step === 7 && draft.planCode && draft.planCadence !== 'free' && !draft.depositAcknowledged) errors.depositAcknowledged = 'Confirm you understand the deposit before continuing.';
  if (step === 8 && !draft.acknowledgeLocal) errors.acknowledgeLocal = 'Confirm how this local setup request will be saved.';
  return errors;
}
export function validateDraft(draft: OnboardingDraft) {
  return Object.assign({}, draft.complete && draft.step !== 8 ? { step: 'Finish the final review before submitting.' } : {}, ...Array.from({ length: draft.complete ? 8 : draft.step - 1 }, (_, index) => validateStep(draft, index + 1))) as Record<string, string>;
}
export const onboardingRequestSchema = z.strictObject({ version: z.number().int().min(0), draft: draftSchema });
export const reviewStatusOptions = [
  { value: 'pending_review', label: 'Pending review' },
  { value: 'in_review', label: 'In review' },
  { value: 'needs_information', label: 'Needs information' },
] as const;
export const setupManagementSchema = z.strictObject({ version: z.number().int().min(1), status: z.enum(['pending_review', 'in_review', 'needs_information']), note: z.string().trim().max(1000) });
export type SetupReviewStatus = z.infer<typeof setupManagementSchema>['status'];
export type SetupSubmission = { accountId: string; submittedAt: string; updatedAt: string; profile: OnboardingDraft; status: SetupReviewStatus; note: string; history: { at: string; action: string }[] };
export type SavedOnboarding = { id: string; version: number; updatedAt: string; expiresAt: number | null; draft: OnboardingDraft; submission?: SetupSubmission };
export type SetupAccount = { id: string; version: number; submission: SetupSubmission };

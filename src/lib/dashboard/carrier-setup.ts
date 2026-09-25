import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

// Documentation is evidence of a carrier feature, not a verified Redial route.
export const carriers = [
  { id: 'mint', name: 'Mint Mobile', url: 'https://www.mintmobile.com/help/how-to-turn-on-off-call-forwarding/', guidance: 'Mint documents forwarding for all calls, unanswered calls, out-of-service calls, and busy or unreachable calls. Confirm the option on your own plan and phone.' },
  { id: 'tmobile', name: 'T-Mobile', url: 'https://www.t-mobile.com/support/plans-features/self-service-short-codes', guidance: 'Use T-Mobile’s call-forwarding instructions for your line. Confirm the forwarding condition and how to restore voicemail before changing anything.' },
  { id: 'verizon', name: 'Verizon', url: 'https://www.verizon.com/support/call-forwarding-faqs/', guidance: 'Verizon documents all-call and unanswered-call forwarding. Voice forwarding does not forward your text messages. Confirm the supported option for your plan.' },
  { id: 'att', name: 'AT&T', url: 'https://www.att.com/support/article/wireless/KM1011513/', guidance: 'AT&T provides device-specific wireless forwarding instructions. Confirm the available conditions, destination restrictions, charges and voicemail behavior with AT&T.' },
  { id: 'other', name: 'Other provider', url: '', guidance: 'Ask your provider which forwarding conditions your plan supports, permitted destinations, any charges, and the exact reversal procedure. Support is not inferred from the underlying network.' },
] as const;
export const routeNames = { dedicated: 'Use a dedicated Redial number', conditional: 'Forward calls I miss', all: 'Forward all incoming calls' } as const;
export const setupSchema = z.object({
  carrier: z.enum(['mint', 'tmobile', 'verizon', 'att', 'other']),
  otherCarrier: z.string().trim().max(80),
  country: z.string().regex(/^[A-Z]{2}$/),
  device: z.enum(['Android', 'iPhone', 'Other']),
  model: z.string().trim().min(1).max(80),
  os: z.string().trim().min(1).max(60),
  plan: z.string().trim().min(1).max(80),
  route: z.enum(['dedicated', 'conditional', 'all']),
  condition: z.enum(['unanswered', 'busy', 'unreachable']),
  sourcePhone: z.string().max(16),
  ownsLine: z.literal(true),
  understandsRouting: z.literal(true),
}).strict().superRefine((value, ctx) => {
  if (value.carrier === 'other' && !value.otherCarrier) ctx.addIssue({ code: 'custom', path: ['otherCarrier'], message: 'Enter your provider.' });
  if (value.country !== 'US' && value.carrier !== 'other') ctx.addIssue({ code: 'custom', path: ['carrier'], message: 'Select Other provider outside the US.' });
  if (value.sourcePhone && (!/^\+[1-9]\d{7,14}$/.test(value.sourcePhone) || !isValidPhoneNumber(value.sourcePhone))) ctx.addIssue({ code: 'custom', path: ['sourcePhone'], message: 'Use a valid international phone number.' });
  if (value.route !== 'dedicated' && !value.sourcePhone) ctx.addIssue({ code: 'custom', path: ['sourcePhone'], message: 'Enter the number you plan to forward.' });
});
export type SetupDraft = Omit<z.infer<typeof setupSchema>, 'ownsLine' | 'understandsRouting'> & { ownsLine: boolean; understandsRouting: boolean };
export const emptySetup: SetupDraft = { carrier: 'mint', otherCarrier: '', country: 'US', device: 'Android', model: '', os: '', plan: '', route: 'conditional', condition: 'unanswered', sourcePhone: '', ownsLine: false, understandsRouting: false };
export type SavedSetup = { body: SetupDraft; version: number; updated_at: string };

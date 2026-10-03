// Preserves docs/08 and configuration/plans.proposed.json from kit v1.1.
// Display-only proposal. This is not an approved catalog or entitlement source.
//
// The figures below are copied from the kit rather than imported from it, so
// the application never reads out of `redial-build-kit/`, which stays byte
// identical to the M0 baseline. A null limit means the meter does not apply to
// that plan — on a BYO plan the member pays the AI and telephony providers
// directly — and is never a promise of unlimited use.
export const proposedPlans = [
  { name: 'Doorstep BYO', monthly: 0, annual: null, allowance: '1 person / line · 20 screened calls per month · 7-day history' },
  { name: 'Concierge BYO', monthly: 12, annual: 120, allowance: '1 person / line · 1,000 screened calls per month · 90-day history' },
  { name: 'Estate BYO', monthly: 29, annual: 290, allowance: 'Up to 5 people / lines · 5,000 pooled screened calls per month · 90-day history' },
  { name: 'Concierge Managed', monthly: 29, annual: 290, allowance: '1 person / US local number · 50 AI minutes + 50 member-app talk minutes per month' },
  { name: 'Estate Managed', monthly: 69, annual: 690, allowance: 'Up to 5 people / US local numbers · 100 AI minutes + 150 member-app talk minutes per month, pooled' },
] as const;

export type ProposedPlan = {
  id: string; name: string; mode: 'byo' | 'managed';
  monthly: number; annual: number | null;
  summary: string; highlights: readonly string[]; featured?: boolean;
};

// What each card says. `highlights` reads as a progression rather than a full
// repeat of the plan above it, which is how a reader actually compares tiers.
export const planCards: readonly ProposedPlan[] = [
  {
    id: 'doorstep_byo', name: 'Doorstep BYO', mode: 'byo', monthly: 0, annual: null,
    summary: 'Bring your own number and providers. Enough to see whether screening suits you.',
    highlights: ['1 person, 1 line', '20 screened calls a month', '7-day call history', 'Rule-based screening', 'Community support'],
  },
  {
    id: 'concierge_byo', name: 'Concierge BYO', mode: 'byo', monthly: 12, annual: 120,
    summary: 'The same line, used every day rather than tried out.',
    highlights: ['Everything in Doorstep, plus', '1,000 screened calls a month', '90-day call history', 'Transcripts and directory', 'Email support'],
  },
  {
    id: 'estate_byo', name: 'Estate BYO', mode: 'byo', monthly: 29, annual: 290,
    summary: 'A household or a small team, each with their own assistant and rules.',
    highlights: ['Everything in Concierge, plus', 'Up to 5 people and lines', '5,000 pooled screened calls', 'AI screening, up to 3 questions', 'Callbacks'],
    featured: true,
  },
  {
    id: 'concierge_managed', name: 'Concierge Managed', mode: 'managed', monthly: 29, annual: 290,
    summary: 'We supply the number and the minutes. Nothing to set up with a carrier.',
    highlights: ['A US local number included', '50 AI minutes a month', '50 member-app talk minutes', 'AI screening, up to 3 questions', '90-day call history'],
  },
  {
    id: 'estate_managed', name: 'Estate Managed', mode: 'managed', monthly: 69, annual: 690,
    summary: 'Managed numbers for everyone, with the allowance pooled across them.',
    highlights: ['Everything in Concierge Managed, plus', 'Up to 5 people and numbers', '100 AI minutes, pooled', '150 member-app talk minutes, pooled', 'Priority email support'],
  },
] as const;

// The comparison table. `null` renders as "not applicable to this plan", which
// is a different statement from "none" and the kit is explicit about the
// difference: on a BYO plan Redial does not meter AI minutes because the member
// is paying that provider directly.
export type ComparisonValue = string | number | boolean | null;
export type ComparisonGroup = { title: string; note?: string; rows: readonly { label: string; values: readonly ComparisonValue[] }[] };

export const planComparison: readonly ComparisonGroup[] = [
  {
    title: 'People and lines',
    rows: [
      { label: 'People', values: [1, 1, 5, 1, 5] },
      { label: 'Lines', values: [1, 1, 5, 1, 5] },
      { label: 'Separate assistant and rules per line', values: [true, true, true, true, true] },
    ],
  },
  {
    title: 'Screening',
    note: 'Which screening a line uses also depends on the line owner recording a basis and turning it on.',
    rows: [
      { label: 'Screened calls a month', values: [20, '1,000', '5,000 pooled', null, null] },
      { label: 'Rule-based screening', values: [true, true, true, true, true] },
      { label: 'AI screening', values: [false, false, true, true, true] },
      { label: 'Follow-up questions', values: ['—', '—', 'Up to 3', 'Up to 3', 'Up to 3'] },
      { label: 'Caller notice', values: [true, true, true, true, true] },
    ],
  },
  {
    title: 'Calls and records',
    rows: [
      { label: 'Call history', values: ['7 days', '90 days', '90 days', '90 days', '90 days'] },
      { label: 'Transcripts', values: [false, true, true, true, true] },
      { label: 'Recordings', values: ['With a recorded basis', 'With a recorded basis', 'With a recorded basis', 'With a recorded basis', 'With a recorded basis'] },
      { label: 'Callbacks', values: [false, false, true, false, true] },
      { label: 'Directory', values: [false, true, true, true, true] },
    ],
  },
  {
    title: 'Telephony',
    note: 'BYO means you keep your own number and pay your carrier and AI provider directly. Internal processing and abuse limits still apply.',
    rows: [
      { label: 'Bring your own number', values: [true, true, true, false, false] },
      { label: 'US local number included', values: [false, false, false, 1, 5] },
      { label: 'AI minutes a month', values: [null, null, null, 50, '100 pooled'] },
      { label: 'Member-app talk minutes', values: [null, null, null, 50, '150 pooled'] },
      { label: 'Automatic overage charges', values: [false, false, false, false, false] },
    ],
  },
  {
    title: 'Support',
    rows: [
      { label: 'Community', values: [true, true, true, true, true] },
      { label: 'Email', values: [false, true, true, true, true] },
      { label: 'Priority email', values: [false, false, false, false, true] },
    ],
  },
];

// Written as answers, not as reassurance. Each one is a question the pricing
// above actually raises.
export const pricingQuestions: readonly { question: string; answer: string }[] = [
  {
    question: 'Can I buy one of these today?',
    answer: 'No. These are proposed prices published for review. Checkout is not built, no payment provider is connected, and nothing on this page can take money. When that changes it will be a deliberate step, not a quiet one.',
  },
  {
    question: 'What does BYO actually mean?',
    answer: 'You keep your existing number and your own accounts with a carrier and an AI provider, and you pay those providers directly. Redial screens the calls and keeps the records. A managed plan is the opposite: the number and the minutes come from us, and there is nothing to arrange with a carrier.',
  },
  {
    question: 'Why do BYO plans show no AI minutes?',
    answer: 'Because Redial does not meter them on those plans — you are paying the AI provider yourself, so there is no allowance for us to count. That is not a promise of unlimited use: your own provider still bills you, and internal processing and abuse limits still apply.',
  },
  {
    question: 'What happens when I reach a limit?',
    answer: 'Nothing is charged automatically. There are no automatic overage charges on any plan in this proposal. An annual plan still receives a monthly usage window and unused allowance does not roll over.',
  },
  {
    question: 'Is my call recorded?',
    answer: 'Only if you turn it on. Recording and transcription are off on every line until the line owner records a basis for it and then switches it on, and the database refuses to enable either without one. AI screening is a third, separate decision.',
  },
  {
    question: 'What is excluded?',
    answer: 'Taxes, premium and international calls, SMS, PSTN forwarding, outbound calling, and conference or recording add-ons, unless separately included in approved terms. Live Call Controls eligibility and their cost require separate approval.',
  },
];

// Preserves docs/08 and configuration/plans.proposed.json from kit v1.1.
// Display-only proposal. This is not an approved catalog or entitlement source.
export const proposedPlans = [
  { name: 'Doorstep BYO', monthly: 0, annual: null, allowance: '1 person / line · 20 screened calls per month · 7-day history' },
  { name: 'Concierge BYO', monthly: 12, annual: 120, allowance: '1 person / line · 1,000 screened calls per month · 90-day history' },
  { name: 'Estate BYO', monthly: 29, annual: 290, allowance: 'Up to 5 people / lines · 5,000 pooled screened calls per month · 90-day history' },
  { name: 'Concierge Managed', monthly: 29, annual: 290, allowance: '1 person / US local number · 50 AI minutes + 50 member-app talk minutes per month' },
  { name: 'Estate Managed', monthly: 69, annual: 690, allowance: 'Up to 5 people / US local numbers · 100 AI minutes + 150 member-app talk minutes per month, pooled' },
] as const;

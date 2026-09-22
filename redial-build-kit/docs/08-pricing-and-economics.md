# 08 · Pricing proposal and unit economics

## Preserve the source economics accurately
The prototype offers Doorstep $0/month, Concierge $12/month and Estate $29/month, with carrier and voice-provider costs paid through the customer's own accounts. A sample admin transaction also shows Concierge $120/year. The source does not establish that these are viable managed all-inclusive prices. Estate annual pricing below is a new proposal.

## Proposed launch catalog — USD, before applicable taxes
Every value below is an editable planning assumption until approved and mapped to a tested billing configuration. The deliberately bounded paid BYO limits replace the mockup's undefined “unlimited” and “full history” claims.

| Offer | Monthly | Annual total | Included resources / proposed limits |
|---|---:|---:|---|
| Doorstep BYO | $0 | — | 1 person/line, 20 screened calls/month, 7-day history; customer pays providers |
| Concierge BYO | $12 | $120 | 1 person/line, 1,000 screened calls/month, all supported modes, scripts, callbacks; customer pays providers |
| Estate BYO | $29 | $290 | Up to 5 people/lines, 5,000 pooled screened calls/month, private line permissions; customer pays providers |
| Concierge Managed | $29 | $290 | 1 person/US local number, 50 AI-session minutes plus 50 member-app talk minutes/month |
| Estate Managed | $69 | $690 | Up to 5 people/US local numbers, 100 pooled AI-session minutes plus 150 member-app talk minutes/month |

For managed plans, AI minutes cover the defined inbound screening segment; member-app talk minutes are a separate meter for connected human conversation. PSTN forwarding, outbound calls, international calls, premium numbers, SMS and advanced conference/recording features are not silently included. Add them only through approved quotas/price rules. For BYO, application limits still protect Redial's compute/abuse exposure even when external provider invoices are the customer's responsibility.

Annual pricing uses ten monthly payments: two months equivalent savings, or **16⅔%** versus twelve monthly payments. Display the total charged annually prominently. Annual plans receive monthly usage windows; unused allowance does not roll over under this proposal. Plan cards must not advertise “20% off.”

## Free and demo strategy
Keep a no-account interactive simulation clearly labeled as a demo. Doorstep BYO is inexpensive for Redial only because the customer funds telephony/AI usage; explain this before signup. For a consumer managed trial, use a separate strictly capped trial budget and verified identity/payment conditions approved by the owner. Do not provision an unlimited free DID or allow repeated trial registration to create paid provider liability.

## Current provider reference rates
Checked September 18, 2026. xAI lists voice audio at $0.08/minute; its pricing also lists a text-input charge. Twilio's US page lists local inbound $0.0085/minute, Media Streams $0.0044/minute, browser/app $0.0040/minute and local number rental $1.15/month. Other legs, features, destinations, billing increments, taxes and contractual rates change the bill. [W06, W07]

For an illustrative simple Twilio inbound → Media Streams → xAI screening segment:

```text
AI-session baseline per minute = 0.0800 + 0.0085 + 0.0044 = $0.0929
50 such minutes = $4.645
100 such minutes = $9.29
```

This is not a complete cost quote. It excludes xAI text/tool inputs, model changes, provider rounding, setup time if billed, storage, taxes, SMS, calls after screening, support and infrastructure. A transfer may continue the inbound leg while adding a member-app or PSTN leg. Count all overlapping legs. Do not multiply every call's total duration by only one “AI price.”

## Illustrative maximum-included-usage scenario
Assume each included AI minute is the simple screening segment above and each member-app minute incurs $0.0085 inbound plus $0.0040 app-leg cost, with the AI/stream stopped. This assumes a validated transfer topology and excludes conference charges. Actual bills may differ.

```text
Concierge Managed:
  50 × 0.0929 + 50 × (0.0085 + 0.0040) + 1 × 1.15 = $6.42
Estate Managed:
 100 × 0.0929 + 150 × (0.0085 + 0.0040) + 5 × 1.15 = $16.915
```

These are partial variable-cost illustrations only, not promised margins. Evaluate p50/p95 usage, concurrent calls, short-call rounding, support cost per active user, payment processing, taxes and refunds before launch. Owner-approved prices may need to increase or limits decrease.

## Model to maintain in operations
```text
Net subscription revenue = billed base - discounts - refunds - taxes collected for remittance
Contribution = net revenue - telephony legs - AI/text/tools - storage - messaging
               - payment fees - variable support - allocated infrastructure
Contribution margin = contribution / net revenue
Acquisition payback months = acquisition cost / monthly contribution
```

Calculate monthly and annual cohorts separately. Annual cash collection is not twelve months of immediately earned contribution. Preserve raw usage, tariff version, estimated amount and reconciled actual vendor amount. Keep vendor costs separate from what the member is allowed to consume.

## Usage controls
Warn at proposed 70%, 90% and 100% thresholds, with deduplication per billing window. At the cap use the configured no-AI fallback and notify the member. Do not unexpectedly charge overages. Start with prepaid approved usage packs or an explicit capped overage agreement only after their exact billing mechanism is tested. No automatic unlimited top-ups.

Count budgets before opening expensive sessions and reconcile when the call ends. Reserve enough budget to finish a permitted segment; handle simultaneous calls atomically. A late vendor event must not give back a budget reservation twice. Keep explicit policies for refunds, transfer sessions, partial calls and caller hangups.

## Pricing validation gate
Approve a plan only after representative live pilot invoices reconcile with the internal meter, the max-cap scenario is commercially acceptable, fraud scenarios are budget-bounded and customers can explain their expected total. Evaluate conversion alongside retained contribution, not signups alone.

## v1.1 · Conference cost boundary

The existing direct-screening arithmetic is not a full-suite conference cost estimate. Insider and Gavel introduce user/monitor participants; Directory can add phone/consultation legs; the AI conference application participant may have its own transport charge. Record each provider charge type and reconcile a real pilot invoice before publishing managed-plan economics for this topology. Do not double count usage observations as separate customer charges. No prices, quotas or annual discount percentages were changed in this update. Feature eligibility remains proposed in `configuration/live-controls.proposed.json`.

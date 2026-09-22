# 07 · Square subscriptions and complete commerce lifecycle

## Commercial boundary
Redial is the seller of its membership. Customers do not need to connect their own Square merchant account to buy. Use Redial's approved Square merchant/location; use separate sandbox and production applications and credentials. Multi-seller onboarding is a later feature, not a prerequisite for this SaaS.

Square is the requested web processor. Do not use Stripe product IDs, webhook types or a Stripe customer portal in this implementation. Square's objects and limitations are different. Sources [W10–W13] inform the provider mapping below; the surrounding workflow is a proposed Redial design.

## Internal catalog
Maintain internal product, plan version, price, billing cadence, currency, entitlements, usage limits, support/retention policy and tax classification. Map approved paid prices to Square catalog `SUBSCRIPTION_PLAN` and `SUBSCRIPTION_PLAN_VARIATION` IDs. Flat-rate memberships use tested STATIC phases; annual discounts are a separate annual variation. Square documents RELATIVE pricing for itemized subscriptions and does not support arbitrary phase rearrangement after creation. New commercial terms should create a new versioned offering rather than silently rewriting existing customers. [W10, W11]

Doorstep is an internal free entitlement, not a $0 paid Square subscription. Square's documented minimum paid subscription is $1. Keep free-user lifecycle and abuse limits in Redial. [W10]

## Public purchase surfaces
**Pricing:** show BYO versus managed, monthly/annual total, effective monthly equivalent, included lines/people/usage, overage/fallback behavior, taxes, external fees, renewal and cancellation.

**Individual plan page:** audience, features, exclusions, connection requirements, provider responsibilities, data/retention policy, demonstration and comparison.

**Cart:** one base subscription per workspace, compatible add-ons only, server-side prices, coupon eligibility and currency lock. A second base membership requires another workspace or a plan-change flow. Additional line quantities cannot exceed the selected plan's supported limits.

**Checkout:** identify the authenticated buyer/workspace; show a server-created quote with expiry; tokenize payment using Square's supported web flow; explicitly capture card-on-file/recurring authorization and terms version. Store no PAN or CVV. Separate optional marketing consent from payment/service agreement.

**Result/thank-you:** retrieve the internal checkout operation, payment and subscription state from the server. Display “setting up,” “payment pending,” “requires action,” “paid—finish number setup,” or a clear failure. A query parameter or redirect is never authority to grant paid access.

## Enrollment sequence
1. Resolve internal plan/price version; validate eligibility, coupon, legal country, currency, tax and workspace ownership. Create an idempotent checkout operation and snapshot the quote/terms.
2. Create or reuse the correct Square customer; prevent cross-workspace/customer confusion. Link only tokenized payment methods owned by that customer and merchant.
3. Create the approved subscription with `customer_id`, `location_id`, `plan_variation_id` and a supported `card_id` where applicable. Square can instead send invoices when no card is attached; do not accidentally enroll a “paid” membership that is only awaiting invoice payment. [W12]
4. Persist provider IDs and an initially pending billing/access state. Do not separately charge the first period with Payments API and also let the subscription invoice charge it unless an intentionally designed, tested flow prevents double charging.
5. Reconcile actual invoice/payment settlement through verified webhooks or authorized retrieval. Grant the correct period's entitlement only according to the accepted paid/trial/grace policy.
6. Send a branded onboarding message once. Coordinate Square invoices/receipts with Redial notifications so customers do not receive contradictory duplicate receipts.
7. Provision service only after the relevant payment/free entitlement, compatibility and identity checks. Record failed setup and remediation independently from payment status.

## Billing state is not access state
Square subscription status and Redial entitlement state are related, not identical. An ACTIVE subscription is not sufficient proof that the latest invoice was paid.

| Internal state | Meaning | Entitlement policy |
|---|---|---|
| `free` | Approved no-charge plan | Free limits only |
| `pending` | Enrollment/payment not confirmed | No paid AI provisioning |
| `trial` | Explicit approved trial phase | Trial limits and known end |
| `active` | Current paid period validated | Approved plan and quotas |
| `grace` | Payment issue with a disclosed short grace policy | Bounded service; notifications; no unlimited new spend |
| `past_due` | Debt unresolved beyond grace | Restricted service and safe call-path fallback |
| `cancel_scheduled` | Renewal stopped, paid period remains | Access through recorded entitlement end |
| `ended` | Paid/trial period over | Free/read-only/offboarding per policy |
| `disputed` | Payment dispute under review | Separate risk decision; do not destroy records |

Track payment status, provider subscription status, entitlement interval, usage interval and number ownership separately. Annual billing does **not** grant the entire year's usage allowance on day one: provision monthly usage windows with deterministic timezone/anniversary semantics. Upgrades do not repeatedly reset already consumed usage.

## Webhook processing
Use the raw request body, exact configured notification URL and signature key for Square's validation algorithm; use the official SDK helper where compatible. Behind Coolify, do not reconstruct a trusted URL from arbitrary client-forwarded headers. Validate before parsing into business actions. [W13]

Register relevant subscription, invoice, payment, refund and dispute notifications supported by the pinned API version. Subscription-created/updated, invoice payment and failed-payment events are documented entry points. Store event ID, merchant/environment and receipt time; acknowledge only after durable acceptance. Process asynchronously with deduplication, tenant mapping and authoritative-object reconciliation.

Handle duplicate and out-of-order notifications. Never let an older unpaid event revoke a later settled period. Schedule periodic reconciliation of subscriptions/invoices/payments to repair missed events. Use explicit operation IDs for checkout, refund, plan change and cancellation. Custom dunning must not compete with Square's payment-retry behavior or charge the same invoice twice.

## Customer billing dashboard
Current plan and purchase source; renewal amount/date; payment method; upcoming changes; included and consumed usage; separate BYO provider-charge estimate; invoice/receipt history; pending credits/refunds; download; plan change; cancel/reactivate; tax/billing contact and notification preferences. For future app-store purchases show the correct store-management route, not a Square cancellation button for a store-owned subscription.

## Plan changes and proration
Default to next-period changes in the first release. Preview the exact effective date, access changes, future charge and retained usage. Immediate upgrades require a tested Square-supported proration/adjustment design with an explicit quote and acceptance; do not invent Stripe-style automatic proration.

Downgrades with too many people/lines must ask the owner to choose retained resources before the effective date. Preserve conversations according to their retention policy, not a silent cascade delete. Keep a plan-change operation ledger and reconcile failures before retrying externally.

## Coupons, discounts and credits
Create a Redial offer registry with code, allowed plans/cadences, start/end, first-use/repeat policy, total/customer/workspace redemption limits, stacking policy and maximum value. Reserve redemptions transactionally, expire abandoned reservations and finalize only once enrollment settles.

For STATIC plans, do not assume `discount_ids` can be attached as a generic coupon mechanism. Use a small set of approved provider-mapped promotional variations/phases with the desired prices and regular follow-on price. For complex recurring itemized discounts, design a tested RELATIVE/order-template mapping separately. Avoid creating unbounded variation combinations. [W11]

An internal goodwill credit is not cash and does not automatically lower a Square subscription charge. Apply it only through a supported tested billing mechanism or issue an approved refund; display its status truthfully. Referral credit cannot be redeemed against taxes/fees or cash unless the final policy explicitly permits it.

## Cancellation, refunds and disputes
The default cancellation operation stops future renewal at the current period boundary; Square documents end-of-cycle behavior for `CancelSubscription`. Immediate cancellation and prorated final billing have different semantics and must be implemented deliberately. [W12]

Refunds are separate from cancellation. Staff select a settled payment, full or partial amount within the unrefunded balance, reason and applicable approval. Use a provider idempotency key, track pending/completed/failed state, reconcile the provider result and never delete the original transaction. An annual refund is not assumed to be prorated automatically.

A chargeback creates a risk/support case with preserved authorization, terms and service-delivery evidence. Do not expose private call transcripts by default as dispute evidence. Redact to the minimum necessary and follow reviewed policy.

## Finance operations
Reconcile gross sales, tax, refunds, provider fees, disputes, net settlements and outstanding invoices. MRR uses monthly recurring value with annual subscriptions divided by twelve, not all cash receipts booked as MRR. Keep management metrics separate from formal accounting recognition. Export customer and transaction records with least-privilege access and audit. A qualified accountant determines tax treatment and financial reporting; a payment processor integration does not resolve telecom tax obligations.

## Required commerce tests
Duplicate checkout, token expired, card declined, invoice pending, delayed webhook, replayed event, out-of-order success/failure, subscription active but invoice unpaid, annual renewal, cancellation boundary, failed cancellation retry, partial refund, double refund attempt, coupon race, downgrade with too many lines, missed event reconciliation, worker crash and recovery. Sandbox success does not certify production renewal behavior; perform controlled owner-authorized end-to-end tests before launch.

## v1.1 · Live-control entitlements

Map Insider/Gavel/Audible/Directory access to versioned feature entitlements after an owner-approved commercial decision. Existing Square plans, subscription prices and renewal amounts are unchanged by this kit update. Joining a monitor or transferring a call must not create an unannounced Square charge. Separate provider cost observation from customer billable usage. A mid-call entitlement change should block new optional spend/control actions while preserving the already-connected conversation through a safe configured completion path.

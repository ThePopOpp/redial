# 13 · Operate the entire Redial business

## Staff roles
Platform owner, platform administrator, support agent, finance operator, growth/content editor, engineering/on-call and read-only analyst. Small teams may assign several roles to one person, but retain permission boundaries in software. Require MFA and audit sensitive reads/writes. Support staff do not become household members; customer credentials are never shared with staff.

## Executive overview
Show paid active accounts, activated lines, MRR/ARR, net collections, pending invoices, churn, trials nearing expiry, setup completion, support backlog, call-delivery failures and per-plan contribution. Every metric has a definition, time window and data freshness. Separate demo fixtures from production and do not silently show zero when data retrieval failed.

The “Needs attention” queue should link to actionable records: failed renewal, unverified route, provider spend spike, stalled number setup, old support ticket, failed export, expired credential, dead-letter webhook and approval request. Badge counts come from actual authorized queries.

## Customer 360
Profile and workspace; people/line ownership; subscription/purchase source; invoices/refunds; consent evidence; setup tests; configured fallback; device readiness; plan usage; tickets; internal notes; account activity; export/deletion requests. Default view excludes private transcripts. Any temporary support access is explicit, justified, expiring and logged.

Staff actions include invite, resend activation, suspend login, revoke sessions, flag risk, create a support grant request and request a billing correction. Distinguish suspending access from disabling telephony. A security suspension must route active callers safely and preserve evidence.

## CRM and sales pipeline
Keep Redial-business prospects separate from member caller contacts. Proposed lifecycle: lead → qualified prospect → opportunity → trial/onboarding → customer → retained/at risk → former customer. A deal separately has stages and outcome won/lost; “contact” is a record type, not necessarily a pipeline stage.

Fields: person/company, source/UTM, consent channels, owner, use case, expected lines, current carrier/stack, next action/date, stage, expected value, outcome and lost reason. Views: table, kanban, owner queue and activity timeline. Conversion preserves identity and attribution without copying private consumer call data into marketing.

## Support desk
In-app/email queues first, with SMS support only under the messaging/consent setup. Ticket states new, triaged, waiting_customer, waiting_provider, in_progress, resolved and closed. Include owner, priority, category, response target, last activity, related billing/setup operation and attachments. Templates must not promise a resolved carrier issue without a test.

Incident tickets outrank ordinary requests when calls cannot be received, a forwarding loop occurs, private content is exposed or spend exceeds a ceiling. Provide one-click links to approved diagnostic reports, not unrestricted production database access. Track recurrence and publish validated help articles from common setup issues.

## Billing operations
Catalog approval, subscription reconciliation, failed-charge review, dunning, discounts/coupon limits, partial/full refunds, disputes, net settlement exports and outstanding balances. Staff approval thresholds are configured and auditable. Reconciliation displays provider truth alongside the internal projection and proposes corrections; it never silently overwrites history.

## Provider operations
Readiness catalog, account limits, credential expiry, number inventory, routing tests, gateway latency, model error rate, stream disconnects, usage and actual vendor charges. Report “last successful synthetic test” separately from a provider's public status page. A vendor logo and a public uptime widget do not prove a member's route works.

Maintain a number lifecycle queue: reserved → verified → assigned → active → suspended/retained → porting/releasing → released. Every release or port requires authorized review and the offboarding checklist. Detect orphan reservations and stale setup operations without reclaiming a customer's active number automatically.

## Marketing and content operations
Page/blog/help editor; media library with rights/alt text; draft/review/schedule/publish; plan-aware content blocks; segmented email/SMS/in-app campaigns; suppression/consent ledger; campaign approvals; attribution and conversion reports. Keep transactional service notices distinct from optional promotions. A broadcast composer shows audience definition, actual eligible count, exclusions, estimated cost, test send and approval state.

## Internal task/project management
A lightweight business task board is sufficient initially: projects, tasks, owner, due date, priority, dependencies, links to customers/incidents/campaigns and completion evidence. Use this for launches, provider onboarding and recurring operational checks. Do not import print-production or audio-ad campaign workflows merely because they exist in the reference repositories.

Add vendor/contract register, recurring expense estimates, renewal dates, access owner, data-processing terms and invoice links. Formal accounting remains in the chosen accounting system; provide reconciled exports rather than claiming to replace a general ledger in the pilot.

## Agent operations
Agent inventory, versioned skills, tool scopes, human approvals, budget ceilings, run logs, evaluation results and emergency disable. Paperclip may manage tasks/coordination; Redial remains authoritative for account, billing, consent and permission facts. An agent run should link to the business record it affected and the approving human where required.

## Reporting definitions
MRR: eligible recurring contract value normalized monthly, net of recurring discounts per reporting policy. ARR: twelve times that defined MRR, not a forecast guarantee. Churn: explicitly define customer/revenue basis and period denominator. Activation: tested enabled call path, not just signup/payment. Call success: logical intended outcome, not provider webhook 200 response. Margin: actual attributed costs including all call legs. Report estimated and reconciled values distinctly.

## Suggested operating cadence
Daily: route failures, abuse/spend, failed payments, old tickets and approval queue. Weekly: activation dropoff, mistaken classifications, margin by plan/provider, lifecycle performance and unresolved reliability work. Monthly: provider reconciliation, renewal offers, account access review, retention/deletion verification and restore test review. Implement schedules as application jobs only after each has an owner and a tested alert destination.

## v1.1 · Live operations and feature access

Add authorized live-session metadata, topology/capability status, transition failures, monitor counts, guidance delivery counts, transfer outcomes and provider usage reconciliation. Add feature rollout/kill switches for Insider/Gavel/Audible/Directory. Customer-authorized time-limited staff audio grants remain separate from platform/billing roles; no default cross-customer monitoring. Directory troubleshooting uses minimal scoped route data. Marketing gets aggregate approved product events, never private Audible text or transcripts.

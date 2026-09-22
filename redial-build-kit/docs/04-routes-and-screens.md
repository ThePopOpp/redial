# 04 · Routes, navigation and screen requirements

All routes below are proposed. Separate site, account and staff layouts even when hosted in one Next application. Use nested sidebar groups rather than an expanding flat list. Deep links need resource-level authorization.

## Public website
| Route | Content / functional contract |
|---|---|
| `/` | Hero, labeled demo, value story, setup choices, capabilities, pricing teaser, privacy statement and CTA |
| `/how-it-works` | Connection → policy → conversation → outcome; explain front-door versus conditional forwarding |
| `/features` | Feature archive; only launched capabilities marked available |
| `/features/[slug]` | Screening, messages, callbacks, privacy, household or agent details; related help and plan eligibility |
| `/solutions/[slug]` | Proposed solo-professional, small-business and household landing pages |
| `/compatibility` | Carrier/device/connection questionnaire; result shows tested, limited or pending state |
| `/providers` | Transport, voice and business-tool catalogs with actual readiness labels |
| `/providers/[slug]` | Requirements, charges, supported features, setup guide, known limitations, verification date |
| `/pricing` | BYO/managed distinction, monthly/annual toggle, limits, total billed amount, taxes and external charges |
| `/plans/[slug]` | Individual plan detail, inclusion/exclusion table, cancellation, usage and provider requirements |
| `/cart` | One base membership plus compatible add-ons; not an unrestricted pile of subscriptions |
| `/checkout` | Authenticated buyer, server-priced order, tokenized Square payment, recurring terms and consent |
| `/checkout/result` | Server-polled authoritative state: pending, paid, failed or requires action |
| `/download` | Real app-store/extension links once available; otherwise clearly marked waitlist |
| `/blog`, `/blog/[slug]` | CMS archive/article with authorship, updated date, canonical and social metadata |
| `/help`, `/help/[slug]` | Setup, billing, privacy, troubleshooting and offboarding |
| `/status` | Incident history and actual monitored component states; no fake green dots |
| `/about`, `/contact`, `/demo` | Brand, support/sales forms, request/demo with separate marketing consent |
| `/privacy`, `/terms`, `/acceptable-use`, `/billing-policy` | Reviewed business-specific policies |
| `/sms-consent`, `/email-preferences`, `/privacy-request` | Consent and rights workflows; no prechecked marketing enrollment |
| `/sign-in`, `/sign-up`, `/forgot-password`, `/auth/callback` | Auth flows with safe redirects and verified session handling |

## Member app
| Navigation group / routes | Required elements |
|---|---|
| Overview `/app` | Active line, actual routing status, needs-attention, recent calls, usage, test route button |
| Calls `/app/calls`, `/app/calls/[id]` | Search/filter/pagination, corrected labels, summary/transcript access, timeline, callback, block/allow, delete/export |
| Call console `/app/call-console/[id]` | Supported live session only; authorization, expiration, join/decline, clear recording/monitoring state |
| Actions `/app/callbacks` | Date AND time, timezone, owner, due state, completion; explicit human callback versus automated action |
| Contacts `/app/contacts`, `/app/lists` | Minimal contact fields, import preview, consent, trusted/blocked lists, source, removal and retention |
| Screening `/app/screening` | Three modes, schedule, VIP override, known/unknown treatment, capability warning, simulation |
| Agent `/app/agent` | Voice, greeting, behavioral boundaries, scripts, version history, test conversation, approval before activation |
| Numbers `/app/numbers`, `/app/numbers/[id]` | Ownership, transport, route map, forwarding mode, destination, provider costs, verification and reversal steps |
| Connections `/app/connections` | Provider credentials state, permissions, quota, expiry, disconnect consequences |
| People `/app/people` | Invitations, members, line access, billing roles; no default access to private conversations |
| Billing `/app/billing`, `/app/billing/history`, `/app/billing/change` | Plan, next charge, usage, receipts, payment method, change/cancel/reactivate and purchase source |
| Settings `/app/settings/*` | Profile, security/MFA, sessions/devices, notifications, privacy/retention, exports/deletion, consent |
| Help `/app/help`, `/app/support/[id]` | Context-aware help and support tickets; optional scoped support access grant |

## Internal business dashboard
Use `/ops/*` and independent platform staff authorization. Require MFA for staff access.

| Group | Routes | Actions |
|---|---|---|
| Business | `/ops`, `/ops/reports` | MRR/ARR definitions, net collections, churn, activation, support load, per-cohort margin |
| Customers | `/ops/customers`, `/ops/customers/[id]`, `/ops/workspaces` | Customer 360, subscription, line health, consent evidence, support timeline; sensitive content gated |
| Revenue | `/ops/subscriptions`, `/ops/invoices`, `/ops/payments`, `/ops/refunds`, `/ops/coupons`, `/ops/catalog` | Catalog versioning, reconciliation, dunning, reviewed refunds, discounts, entitlement correction |
| Communications | `/ops/inbox`, `/ops/tickets`, `/ops/announcements` | Assigned support queues, outbound replies, approval-controlled broadcasts |
| Growth | `/ops/crm`, `/ops/pipeline`, `/ops/campaigns`, `/ops/automations`, `/ops/referrals` | Leads/deals, consent-aware audiences, email/SMS workflows, experiment and referral attribution |
| Content | `/ops/pages`, `/ops/blog`, `/ops/media`, `/ops/help-content` | Draft/review/publish, metadata, reusable content blocks, accessibility checks |
| Voice | `/ops/numbers`, `/ops/call-health`, `/ops/providers`, `/ops/abuse` | Synthetic route checks, configuration readiness, provider invoices, spend anomalies and abuse actions |
| Agents | `/ops/agents`, `/ops/approvals`, `/ops/agent-runs`, `/ops/tools` | Agent roles/budgets, approval queue, tool scopes, evaluations and kill switch |
| Platform | `/ops/staff`, `/ops/roles`, `/ops/audit`, `/ops/incidents`, `/ops/settings` | Staff permissions, operational policies, incident review and configuration history |

## Per-screen completion contract
Every screen needs a defined role, tenant/resource scope, plan/capability gate, API query/command, loading state, empty state, permission-denied state, retry/error state, keyboard behavior, small-screen layout and analytics privacy classification. A visible button must either complete its real command or clearly explain why the capability is unavailable; a toast saying “done” without a backend transition is not acceptable.

## Mobile navigation
Calls · Screening · Agent · Account. Use a line/workspace switcher only for authorized resources. Callback tasks can live inside Calls initially. Live call presentation is native and separate from ordinary navigation.

## Extension navigation
Inbox · Quick actions · Account. Selected-number actions open a confirmation view before any outbound call. Deep links open the full app for billing, complex rules and privacy administration.

## v1.1 · Named live controls and Directory routes

Extend `/app/calls?view=live` and `/app/call-console/[id]` with **Insider · Listen live**, **Gavel · Take over**, **Audible · Guide agent**, **Directory · Transfer**; show per-action authorization/capability reasons. Add `/app/directory`, `/app/directory/[id]` and `/app/directory/routes` under Call Management. Add `/features/insider`, `/features/gavel`, `/features/audible`, `/features/directory` to the public feature catalog. In the existing staff layout add Live Calls metadata and Feature Access configuration; staff audio remains separately granted. Mobile presents a compact four-control sheet. The extension's initial Insider/Gavel buttons open the web console, while Audible/Directory can send authorized commands. Detailed screens and microcopy are in docs 19 and `content/live-call-controls-copy.md`.

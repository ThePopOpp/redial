# Redial v1.1 ordered implementation plan

Source of scope: unchanged `redial-build-kit/01-BUILD-ORDER.md`, docs/18 and docs/19–21. One reviewable increment at a time; no production service changes authorized.

Current update: the user's follow-up requested the whole local review and a unique server address. Member/operations shells and stateful synthetic workflows now cover the main review journeys, including all four Live Call Controls. This remains M1 review work; real identity and staff MFA are still the next acceptance gate. See `LOCAL-REVIEW.md` for the precise distinction between the runnable simulator and unimplemented provider/native integrations. Do not mark later stages complete from these screens.

| Stage | Next deliverable | Acceptance before advancing |
| --- | --- | --- |
| M0 | Inventory, provenance and local dependency decisions | Baseline documented, originals preserved, references inspected read-only |
| M1 first increment | Public brand/routes, synthetic Calls preview, locked member/staff entry surfaces | Build/typecheck/lint; keyboard, mobile, honest fixtures; no private-route bypass |
| M1 remainder | Calls/Screening/Agent/Numbers/Billing and staff layouts; real dev auth/workspace | Verified sessions, member scope, distinct staff roles with MFA; responsive/empty/error/denied states; no fixture auth |
| M2 | Scoped domain/API validation, repeatable migration proposals, lines/grants/policies/consent/billing/outbox; live-control increment A | Local RLS allow/deny, wrong-tenant and revoked grants, no service keys in clients |
| M3 | One authorized test number → Twilio → xAI → useful inbox → fallback/callback | Real call, no-answer/provider-failure/loop and budget evidence; separate gateway and worker |
| M3a | Shared conference with independent AI participant; labeled console/Directory UI (B), topology proof (C) | Caller survives AI removal; lifecycle, audio direction, permissions and all-leg costs |
| M4 | Square sandbox catalog/subscription/invoice/payment lifecycle | Settled access reconciliation, webhook signatures/idempotency/order, monthly annual quotas, safe cancellation/refunds |
| M5 | Member operations, staff support, customer view, diagnostics, CMS/core email | Staff RBAC, scoped support grants, suppression/consent, failure and restoration evidence |
| M6 | React Native companion and MV3 extension | Device push/privacy tests, validated worker messages and lifecycle; no untested native audio claims |
| M7 D | Insider: provider-enforced silent listener | Both sides audible; mic cannot leak; revocation removes listener; caller survives departure |
| M7 E | Gavel: verified human endpoint, AI input/output/tools fenced and removed | One winner; no post-barrier AI audio/input; raced/failed transitions and fallback tested |
| M7 F | Audible: private current-session guidance | Expiry, policy precedence, retries and truthful queued/submitted/acknowledged states; no raw guidance speech |
| M7 G–I | Directory saved/custom phones then internal users/extension/briefing/native/sharing | Approval, bounded loops/cost, actual destination acceptance, cleanup; SIP/groups/private consult separately gated; prices/quotas unchanged |
| M8 | CRM/campaigns/referrals and optional Hermes/Paperclip/MCP/Grok Bot | Scoped tools, approvals, prompt-injection tests, consent and spend ceilings |
| M9 | Staging/release configuration and independent security review | CI, backup restore, rollback, monitored compatibility/pricing, all blocking findings closed; explicit owner signoff before production |

Commercial/legal/domain/retention decisions stay proposed. Recording and automatic overage billing stay off. No deployment, live dialing, charge, campaign, forwarding edit, port or number release is part of M0/M1.

# 18 · Implementation roadmap and acceptance gates

Deliver a working narrow slice before broadening. These milestones are ordered by dependency, not calendar estimates. Do not claim completion based on generated files or screenshots alone.

| Milestone | Deliverable | Exit evidence |
|---|---|---|
| M0 · Inspect and isolate | Current-project inventory, source reuse matrix, versions, domain/env plan, threat outline | Read-only references, no secrets/customer data copied, working baseline or documented existing errors |
| M1 · Product shell | Branded public/member/ops layouts, routes, demo fixtures, auth, basic workspace | Responsive and keyboard checks; demo labeling; staff/member separation |
| M2 · Secure data core | Lines, grants, policies, calls, billing operations, consent/outbox schema and APIs | Migrations repeatable, cross-tenant allow/deny tests, no service secret in clients |
| M3 · Real call vertical slice | One Twilio number, xAI screening, message, inbox, tested fallback and budget | Actual inbound call evidence; no-answer/provider-failure/loop scenarios; cost recorded |
| M3a · Live-control topology proof | Conference caller + independent AI participant, control contracts and read-only console | Caller survives AI removal; media direction, grants, lifecycle and cost evidence |
| M4 · Paid membership | Square catalog/checkout, invoice reconciliation, entitlements, cancellation/refunds, usage | Duplicate/out-of-order webhook tests, verified billing states, no double charges, safe offboarding |
| M5 · Operable pilot | Support, customer 360, provider diagnostics, incident controls, core emails/CMS | Staff RBAC, consent/suppression, live diagnostics and restoration test |
| M6 · Companion surfaces | Mobile inbox/push and Chrome side panel/quick actions | Physical-device tests, worker lifecycle tests, store/permissions review |
| M7 · Named Live Call Controls and sharing | Insider, Gavel, Audible and Directory; app take-call; household privacy | Per-feature provider/device/access evidence; no AI audio after takeover; actual destination acceptance; costs and consent |
| M8 · Growth and operational agents | CRM, campaigns, referrals, Hermes/Paperclip/MCP and optional Grok Bot | Human approvals, injection tests, scoped tool actions, fraud/spend limits |
| M9 · Public release | Approved policies, pricing and compatibility, production deployment, monitoring | All blocking gates closed; owner-authorized live tests; rollback/on-call ownership |

## Definition of done for every feature
Real persisted behavior; server authorization; schema validation; appropriate entitlement/capability/consent; observable error path; idempotent external effects; accessible loading/empty/error UI; tests covering unauthorized and failure cases; audit/privacy classification; documentation and truthful release status. A mock-data page remains a prototype.

## Pilot release test matrix
### Identity and privacy
Wrong-tenant IDs; removed member; role escalation; expired invite; owner transfers; household billing owner attempting transcript read; expired support grant; signed URL reuse after expiry; private storage access; log/analytics redaction; export permission revoked before download; account deletion includes derived data.

### Telephony
Known/unknown/blocked/VIP caller under all three modes; absent caller ID; spoofable known number; no real spam flag; delayed/duplicate events; no answer; busy/voicemail destination; forwarded-to-same-number loop; chain loop; AI disconnect; DB unavailable; gateway restart/drain; no speech; caller interruption; opt-out; long message; quota hit mid-session; two people racing to accept; usage for all legs.

### Commerce
Free plan without Square $0 subscription; successful monthly and annual enrollment; unsettled invoice; card failure; stale checkout quote; changed price; duplicate client submit; delayed/out-of-order webhook; refund boundaries; cancellation end period; recurring offer transitions; duplicate coupon redemption; cross-account provider token; downgrade exceeding seats; annual monthly quota windows; missed-event repair.

### Mobile/extension
Foreground/background/locked/terminated app; denied microphone/notifications; stale token; Wi-Fi/cellular change; headset; signed-in user switch; sensitive lock-screen data; device loss; extension worker restart; invalid sender message; unauthorized page capture; malicious phone selection; revoked auth; popup/side-panel close.

### Business operations
Finance-only role cannot read transcripts; growth cannot export private member contacts; campaign opt-out between scheduling and send; draft changed after approval; referral self-credit; refund reversal; incident notification; dead-letter replay; provider key rotation; privileged action needs MFA and an approval record.

### Agent evaluation
Malicious caller/webpage/tool result; secret request; false urgency; unauthorized booking confirmation; repeated refund/route tool request; changed approval arguments; wrong tenant; cost ceiling; kill switch; memory deletion and tenant isolation.

## Required release evidence file
Create `release-evidence/<release>.md` listing git commit, lockfile/build versions, migration IDs, command output links, automated test counts, real call/provider test IDs, controlled payment tests, supported compatibility rows, accepted risks, policies approved, owner signoff, rollback instructions and monitoring owner. Do not include secrets, card data or raw private transcripts.

## Explicit current delivery status
This kit's isolated policy reference tests can be run without providers. They demonstrate proposed routing decisions only. The full web application, RLS migrations, live telephony, Square integration, mobile apps, extension and production infrastructure remain implementation work described by this specification.

## v1.1 · Feature-specific order and proof

Use `prompts/13-live-call-controls.md` after inventory/foundation. First prove the shared conference and AI path (M3a), then Insider, Gavel, Audible and basic Directory on web. Extensions/private briefing/native audio/SIP/groups follow their own gates. The module is part of the requested product scope, but rollout remains disabled until tested. Add evidence for no microphone leak, no hidden AI listening after takeover, no raw guidance speech, verified phone/extension acceptance, no duplicated/racing transfers, safe loss-of-connectivity and all physical-leg cleanup. Reference tests validate only pure policy/state rules.

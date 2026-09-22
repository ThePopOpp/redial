# 10 · API, commands, events and concurrency

## Public contract conventions
Base `/api/v1`. JSON schemas validate input and output; reject unknown privileged fields. API errors include `code`, safe `message`, `request_id` and field errors, without secret/provider payload leakage. Use cursor pagination and explicit maximum page size. Authenticate bearer tokens or secure same-origin sessions as appropriate, plus resource authorization. Cookie-authenticated writes require CSRF/origin defenses; CORS is not authentication.

Risky commands use `Idempotency-Key`. Persist request hash and response/result: same key + same request returns the original result; same key + different request returns a conflict. Use optimistic concurrency/version checks for settings and policy publication. Never accept a client-supplied Square amount or Twilio destination as authoritative.

## Endpoint inventory
| Method and path | Command/query | Main authorization / side effects |
|---|---|---|
| GET `/me` | Profile, memberships and capability summary | Verified session; never return secrets |
| POST `/workspaces` | Create workspace | Rate/provisioning limits |
| POST `/workspaces/{id}/invitations` | Invite user | Workspace permission + role ceiling |
| PATCH `/memberships/{id}` | Change or revoke role | No self-escalation; last-owner protection |
| GET `/capabilities` | Effective route + plan features | Authorized line context; server resolved |
| GET/POST `/lines` | List/create line | Workspace scope; plan/reservation cap |
| POST `/lines/{id}/ownership-verifications` | Start ownership check | Proof/attempt limits; no arbitrary toll calls |
| POST `/lines/{id}/route-tests` | Controlled inbound configuration test | Line manager; explicit test consent |
| PUT `/lines/{id}/route` | Validate/update route | Cycle detection, destination ownership, version check |
| POST `/lines/{id}/pause` | Switch to safe fallback | Permission, confirmation of forwarding implications |
| GET/PUT `/lines/{id}/policy` | Read/edit policy draft | Line grant; validated mode/capabilities |
| POST `/lines/{id}/policy/publish` | Activate a version | Simulation pass and optimistic concurrency |
| POST `/lines/{id}/policy/simulate` | Explain expected outcomes | No provider side effects |
| GET/PUT `/lines/{id}/agent` | Voice/instructions configuration | Restricted schema; no arbitrary endpoint execution |
| POST `/lines/{id}/agent/tests` | Capped synthetic conversation | Test-only fixtures, budget reservation |
| GET `/calls` | Filter/paginate call list | Authorized lines only |
| GET `/calls/{id}` | Summary and permitted metadata | Summary grant; content minimized |
| GET `/calls/{id}/transcript` | Transcript | Separate transcript grant and retention |
| POST `/calls/{id}/recording-link` | Short-lived private download | Recording grant; audit; signed URL with short expiry |
| POST `/calls/{id}/feedback` | Correct label | Scope and bounded taxonomy |
| POST `/calls/{id}/join` | Request authorized live participation | Active state, line/join grant, short-lived call token |
| POST `/calls/{id}/callback` | Human callback request/task | Verified destination, cost/consent, idempotency |
| POST `/contacts/import-preview` | Validate selected contact import | Permission, limits, no automatic full phonebook sync |
| POST `/contacts/import` | Commit confirmed normalized contacts | Scope, consent and idempotent import ID |
| POST/DELETE `/lines/{id}/list-entries` | Allow/block/VIP rule | Version, reason, undo policy |
| GET `/billing/catalog` | Approved active offers | Public safe fields; distinguish BYO/managed |
| POST `/billing/quotes` | Server-side checkout/change quote | Customer eligibility and amount computation |
| POST `/billing/checkout` | Idempotent Square enrollment | Owner/billing permission; validated quote/token |
| GET `/billing/operations/{id}` | Enrollment/change result | Same workspace; authoritative current result |
| GET `/billing/history` | Invoices/payments/refunds | Billing permission |
| POST `/billing/change-plan` | Approved effective-date change | Quote acceptance; provider reconciliation |
| POST `/billing/cancel` | Stop renewal | Owner/billing authority; numbers not deleted |
| POST `/billing/payment-method` | Tokenized card-on-file update | Provider customer ownership; no PAN |
| GET `/usage` | Quotas and estimates | Workspace/line scope, no other users' contents |
| POST `/support/tickets` | Create support ticket | Safe attachments, spam limits |
| POST `/support/access-grants` | Time-limited delegated access | Resource owner, capability/duration bounds |
| GET/PUT `/preferences` | Notice/retention preferences | Subject-owned fields only |
| POST `/exports`, POST `/privacy-requests` | Export/delete request | Reauthentication, async job, audit |
| POST `/devices/register` | Push/VoIP endpoint registration | Verified session + device ownership |
| POST `/extension/exchange` | One-time PKCE-bound authorization exchange | Exact redirect/origin/client binding and short lifetime |

`/api/v1/ops/*` is an additional staff-only surface, not merely a hidden link to the customer API. Include customers, catalog versioning, refunds, campaign approvals, incidents, agent tools and scoped reports. Platform staff access requires role checks, MFA and audit.

## External ingress endpoints
`/hooks/square`, `/hooks/resend`, `/voice/twilio/inbound`, `/voice/twilio/status`, `/voice/twilio/recording` and the gateway WSS upgrade endpoint. Verify each provider's documented signature scheme and canonical URL/raw body rules. Do not reuse one generic HMAC function for all vendors. Match provider account and environment to the right connection before authorizing work.

The WSS endpoint also validates stream/call association and consumes a short-lived internal session authorization where the bridge design requires it. Never use a user-controlled URL to make the gateway connect to arbitrary internal addresses; custom adapters require allowlists and SSRF protections.

## Event envelope
```json
{
  "id": "uuid",
  "schema_version": 1,
  "type": "call.message_captured",
  "occurred_at": "2026-09-19T00:00:00Z",
  "workspace_id": "uuid",
  "line_id": "uuid",
  "resource_id": "uuid",
  "correlation_id": "uuid",
  "causation_id": "uuid",
  "deduplication_key": "provider:account:external-event",
  "actor": {"kind": "provider", "id": "verified-connection-id"},
  "data": {"summary_id": "uuid", "classification": "message"}
}
```

Use IDs/references in events rather than transcript text. Access-controlled consumers retrieve necessary content. Events carry facts that occurred; commands request actions that may fail.

## Domain event families
Identity: workspace.created, invitation.accepted, membership.revoked. Setup: number.reserved, ownership.verified, route.test_passed, route.activated, route.degraded. Calls: call.received, screening.started, consent.changed, classification.proposed, message.captured, transfer.requested, member.connected, call.ended, summary.ready. Billing: checkout.pending, payment.settled, renewal.failed, subscription.cancel_scheduled, entitlement.changed, refund.completed. Growth: signup.completed, activation.completed, referral.qualified. Operations: support.opened, incident.declared, agent.action_proposed, approval.granted, tool.action_completed.

Avoid a “customer activated” event merely on payment success. Activation means the tested call path is usable, as defined in the product spec.

## Retry and race handling
Write domain state plus outbox entry in one database transaction. Claim jobs with a lease and retry delay; detect expired leases. External side effects require their own idempotency key. A dead-letter queue exposes reason and replay controls to authorized staff. Replay after a policy fix must not resend old campaigns or make duplicate refunds.

Use per-call serial state transitions or versioned compare-and-set updates. Terminal call states cannot be overwritten by earlier ringing callbacks. Two members racing to take a call must result in one accepted owner unless conference participation is explicitly enabled. Revoked users must not join with an old stored capability snapshot.

## Realtime
Use Supabase Realtime for private state notifications, not media transport. Subscribe only to authorized workspace/line resources. On reconnect or tab focus, re-fetch authoritative state using a cursor; events are not guaranteed to be the sole complete history. Do not send transcript text in general notifications or lock-screen pushes by default.

## Contract tests
Validate all example envelopes and request/response schemas. Assert status/error cases: unauthenticated, forbidden, not found without information leakage, unsupported capability, quota exhausted, stale version, duplicate request, idempotency conflict and provider unavailable. The exact HTTP mapping should remain consistent across web, mobile and extension clients.

## v1.1 · Live-control commands

Docs 19–21 add `insider`, `gavel`, `audible` and `transfers` commands under `/api/v1/calls/{id}`, plus scoped Directory CRUD/test endpoints. Return operation IDs and truthful asynchronous state. Require current line grants, policy/capability, expected version, idempotency and fencing. Handle monitor and instruction state separately from routing ownership. All external effect completion comes from reconciled provider state, not button clicks or accepted HTTP requests. Only one takeover/transfer operation runs per logical call.

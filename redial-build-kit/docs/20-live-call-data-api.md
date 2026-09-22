# 20 · Live Call Controls — data, API, permissions & events

**v1.1 additive design.** Reuse the existing Redial call, line, membership, event and usage models. These are proposed tables/contracts, not migrations run against Supabase. `contracts/live-call-controls.ts` provides typed design interfaces without pretending to validate runtime input.

## Permission model

Add explicit line-scoped capabilities: `read_live_metadata`, `monitor_live`, `takeover_live`, `direct_agent`, `transfer_call`, `manage_directory`, `dial_custom_destination`. Retain legacy `join_call` for compatibility but do not translate it into all new permissions. `read_transcript`, `read_recording` and `export_content` remain independent.

Effective access is the intersection of current authenticated membership, per-line grants, entitlement, provider/topology evidence, policy/consent and action state. Billing owner, workspace owner, customer-support staff and global administrator labels are not substitutes for audio grants. Staff use a separate consented, time-limited support grant and MFA. AI tools use a current session/line-bound service identity with permitted destination IDs and no blanket human rights.

## Entities and relationships

| Entity | Required fields / constraints |
|---|---|
| `live_call_sessions` | Existing call/workspace/line FKs, topology + version, coordinator ID, `state_version`, `fencing_epoch`, handling mode, current controller, current agent session, provider conference reference, active transition ID, ended timestamp |
| `call_participants` | Session/tenant/line FKs, role caller/ai/monitor/operator/target, user or directory reference, provider account+call+participant refs, desired/observed mute and hold, connection status, join/leave times, media scope, grant reference |
| `live_control_grants` | User/support service, line/call scope, allowed actions, expiry/revocation, approved support reason where applicable; no audio rights inferred from finance role |
| `call_control_operations` | Session, actor, action, payload hash, unique idempotency scope, expected version, fencing epoch, status, provider effects, timeout, result/error and retry/reconciliation metadata |
| `agent_guidance` | Session + current agent ID, author, server sequence, timing, scope, encrypted/protected body or secure content reference, status, expiration, provider ack reference, superseded/canceled references |
| `directory_destinations` | Tenant/scope, contact link, label, kind, route revision, normalized phone/base extension or internal/SIP reference, hours/timezone, enabled state, permission policy and minimum verification evidence |
| `directory_routes` | Line, destination/group/fallback graph, current revision, strategy, bounded attempts/timeouts, allowed callers, approval policy, test status |
| `directory_route_members` | Group to destination edges, ordered priority, schedule and acceptance policy; all related records same tenant |
| `transfer_attempts` | Session/operation, immutable destination revision snapshot, actor/source, mode, attempt index, target leg, ring/answer/accept/join/complete times, failure reason and cost reservation |
| `call_control_audit` | Content-minimal events for joined/listened/taken over/guided/transferred/revoked; actor, scope, state, grant and provider evidence |
| `call_cost_segments` | Provider, account, logical call, physical leg, charge kind, quantity/unit, billable timestamps, reconciliation reference; separate from sellable usage meters |

Do not duplicate an existing table merely because these proposed names differ from the application's names. Normalize call IDs and participant roles into current models after inventory.

Unique constraints: provider participant identifier within provider account; idempotency key per tenant+actor+action+resource; guidance server sequence per call; one nonterminal routing transition per call; current controller by versioned session state. Use tenant-consistent composite foreign keys where practical. Never trust a request's workspace ID to make a cross-tenant relationship valid.

Protect phone/SIP endpoints and private guidance from general marketing/support read roles. Directory visibility is not unconditional dial authority. Guidance retention defaults to the associated call's retention unless a shorter approved policy is chosen; it is not copied to caller transcripts or standard exports. Delete it with the relevant privacy workflow. Audits can retain minimal action metadata according to the reviewed retention policy.

## Call state versus overlays

Keep the original coarse `CallState` for history and analytics. Add an orthogonal control snapshot:

- handling mode: `ai_active`, `handoff_pending`, `human_active`, `transfer_pending`, `transferred_out`, `fallback`, `ended`;
- transition phase: `idle`, `preparing_endpoint`, `silencing_ai`, `connecting_human`, `dialing_target`, `consulting`, `bridging`, `reconciling`;
- AI lifecycle: `starting`, `connected`, `stopping`, `disconnected`;
- monitors: zero or more separately authorized participant sessions.

Insider is an overlay, not a global call state that replaces `ai_active`. Audible is a queue scoped to one AI session, not an independent handler. A call does not become “human active” because a Gavel button was clicked. A phone target answering an IVR does not make a transfer “accepted.”

## API inventory

Base `/api/v1`; all control endpoints are authenticated. Provider webhooks use a separate signature-authenticated ingress. Identifiers are examples of application routes, not Twilio/xAI API URLs.

| Method and route | Purpose |
|---|---|
| `GET /calls/live` | Authorized active-call summaries; filtering/pagination without leaking other lines |
| `GET /calls/{id}/controls` | Authoritative state, current controller and per-action availability reason |
| `POST /calls/{id}/insider` | Authorize one monitor session and issue a narrowly scoped short-lived endpoint credential |
| `DELETE /calls/{id}/insider/{monitorId}` | Leave/revoke that monitor only; server revocation is idempotent |
| `POST /calls/{id}/gavel` | Begin authenticated endpoint preparation and controlled takeover |
| `POST /calls/{id}/audible` | Queue validated, current-agent-session-bound text guidance |
| `POST /calls/{id}/audible/{guidanceId}/cancel` | Cancel only still-cancelable guidance; return truth for already submitted messages |
| `GET /calls/{id}/audible` | Authorized guidance history, not public/caller transcript |
| `GET /directory` | Scoped saved destinations and current call eligibility |
| `POST /directory` | Create a draft destination under `manage_directory` |
| `PATCH /directory/{id}` | Versioned changes with validation and re-test state |
| `POST /directory/{id}/test` | Explicit owner-authorized test dial; must not call merely on save |
| `POST /calls/{id}/transfers` | Saved or approved custom route with requested mode and budget |
| `POST /calls/{id}/transfers/{transferId}/cancel` | Cancel and reconcile target legs; does not end original caller |
| `GET /call-control-operations/{id}` | Operation state/result for reconnect, refresh and retries |
| `POST /calls/{id}/return-to-agent` | Optional separately tested explicit resumption, not automatic after Gavel |

### Commands

Every state-changing command contains an `expected_version` where relevant, a unique client request/idempotency key and a finite expiry. Actor, workspace, line grant, capability and consent are derived server-side. Request payloads do not include provider credentials or arbitrary callback/media URLs. Per-call actions are authorized anew at execution.

Guidance example:

```json
{
  "agent_session_id": "current-session-reference",
  "expected_version": 12,
  "text": "Ask which project they are calling about.",
  "timing": "next_turn",
  "scope": "next_turn",
  "expires_in_seconds": 60
}
```

Saved transfer example:

```json
{
  "expected_version": 12,
  "destination": {
    "kind": "saved",
    "destination_id": "approved-office-route",
    "destination_version": 3
  },
  "mode": "brief_and_accept"
}
```

Custom transfer example:

```json
{
  "expected_version": 12,
  "destination": {
    "kind": "custom_phone",
    "phone": "+16025550142",
    "country": "US",
    "approval_id": "single-action-approval-reference"
  },
  "mode": "announced"
}
```

The sample phone is illustrative and is not an authorized dialing target. Approval binds actor, call, normalized phone, method, max cost, version and expiry; it cannot be replayed for a different number. Never accept a client-sent `approved=true` boolean.

Respond `202` for asynchronous work with operation ID, current status and a safe poll/subscription reference. Completion requires provider-state evidence, not this response. Failed validation is `422`; insufficient access `403` or privacy-preserving `404`; conflicting state/version/idempotency `409`; unsupported route/capability `422`; rate/spend gate `429` or a consistent documented application code. Do not return private metadata in error descriptions.

## Events

Use existing event envelopes with `workspace_id`, `line_id`, call/resource ID, timestamps, causation/correlation, actor and deduplication key. Example families:

`insider.requested`, `insider.connected`, `insider.disconnected`, `insider.revoked`;
`gavel.requested`, `gavel.endpoint_ready`, `gavel.ai_detached`, `gavel.completed`, `gavel.failed`;
`audible.queued`, `audible.submitted`, `audible.acknowledged`, `audible.expired`, `audible.canceled`, `audible.failed`;
`directory.updated`, `transfer.requested`, `transfer.ringing`, `transfer.accepted`, `transfer.bridged`, `transfer.failed`, `transfer.canceled`.

Events carry references and state, not private Audible text, phone secrets, transcripts or stream credentials. Private detail is fetched only by authorized clients. Supabase Realtime carries UI state, not live audio. Browser/native reconnect fetches an authoritative snapshot and event cursor.

## Permissions, RLS and integration QA

Verify tenant isolation for every new table, joins, views, functions, storage path and realtime channel. Test global/billing/support roles without content grants, expired/revoked grants during a session, caller-controlled destination IDs, directory destinations moved between lines, cross-tenant group members and history/export access. The service role is never used in browser/native/extension code.

Provider callbacks map by account and persisted identifiers, not an untrusted query parameter. Out-of-order events cannot reopen ended calls. Durable operations and fencing prevent repeated connects/dials/unmutes. Token expiry and revocation are enforced on ongoing sessions, not just issuance. Never allow a client to choose a conference name, participant ID, mute state or AI tool context without checking the server mapping.

## Acceptance evidence

Use contract/unit tests for state and validation; database integration tests for RLS and constraints; signed webhook replay tests for callbacks; physical/web audio tests for actual mute, isolation and handoff; reconciled provider usage for costs. The isolated reference model shipped with this kit proves none of the provider, database, microphone or legal behaviors by itself.

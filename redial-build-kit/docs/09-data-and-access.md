# 09 · Supabase data model, permissions and retention

This is a schema specification, not an applied migration. Generate actual migrations inside the existing project after resolving its conventions. Use UUID keys, explicit foreign keys, timestamps, constrained status values and database indexes. Store money in integer minor units with currency; durations in integer milliseconds/seconds with an explicit unit; timestamps as UTC instants plus IANA timezone where user scheduling needs it.

## Entity dictionary
| Table / domain | Core fields and constraints |
|---|---|
| `profiles` | `user_id` FK to auth, display name, locale, timezone, security/preferences reference; no privileged role in editable user metadata |
| `workspaces` | id, type personal/household/business, legal/billing account reference, status, created_by |
| `memberships` | workspace_id/user_id unique, role, status, accepted_at; server-controlled role changes |
| `invitations` | workspace, target identity, hashed single-use token, role ceiling, expiry, inviter, accepted_by; no plaintext durable token |
| `platform_staff` | user_id, staff role, active, MFA requirement; separate from memberships |
| `lines` | workspace, owner_user_id, display label, status, ownership type, selected policy, consent policy, provisioning operation |
| `phone_numbers` | line_id, normalized E.164, encrypted value as needed, lookup token, provider-number ID, lifecycle, retention/port-out state; active number uniqueness |
| `provider_connections` | workspace or platform owner, provider, account reference, environment, credential reference, granted capabilities, readiness, last_test_at |
| `credential_references` | encrypted secret reference/envelope metadata, key version, provider, scope, rotation date; never client-readable |
| `routes` | line, ingress type, forwarding source, permitted destination graph, fallback, version, verified_at |
| `endpoints` | owner/line, kind app/browser/PSTN/SIP, verified destination, forwarding risk, capability, last_seen, revoked_at |
| `compatibility_tests` | carrier/device/OS/plan/region/route, scenario, actual result, evidence, performed_at, configuration version |
| `line_access_grants` | line + user + capability unique; read_summary/read_transcript/manage_rules/join_call/export; explicit revocation |
| `contacts` | owner/line scope, optional display name, normalized phone match reference, source, consent reference, updated_at |
| `contact_list_entries` | line, match token, allow/block/VIP, reason, creator, expiry; explicit precedence |
| `screening_policies` | line, version unique, mode, schedule/timezone, exceptions, max durations, fallback, draft/published; immutable published revisions |
| `agent_profiles` | line, provider config reference, approved voice, instruction version, guardrail version, status |
| `agent_scripts` | profile, caller category, text, permitted outcomes, validation result, approved_by, version |
| `calls` | workspace/line, logical id, external account/call id, parent leg, ingress, started/ended, state, policy snapshot, classification and confidence |
| `call_events` | call, source event ID, type, provider time, received time, sequence/version, redacted payload; dedup key |
| `call_participants` | call, participant/endpoint, role caller/member/agent, joined/left, authorization grant, billable leg reference |
| `call_summaries` | call, encrypted body/reference, model/prompt version, created_at, corrected labels, expiry |
| `transcript_segments` | call, speaker, start/end, finality, sequence, encrypted text, consent policy reference, expires_at |
| `recordings` | call, private object path, consent evidence, duration, encryption metadata, retention deadline, deletion state |
| `consent_events` | subject, channel/purpose, disclosure version, granted/revoked, timestamp, collection context and evidence reference |
| `callbacks` | call/line, requested destination, owner, scheduled UTC/timezone, mode reminder/human/approved-auto, state, idempotency key |
| `products`, `plan_versions`, `prices` | internal offering, immutable features/limits snapshot, cadence, currency, minor units, availability and external mapping |
| `billing_customers` | workspace, purchase source, merchant/environment, provider customer ID; no card data |
| `subscriptions` | workspace, source square/apple/google/free, provider ID, plan version, provider state, cancellation/effective boundaries |
| `entitlements` | workspace/line, feature/limit, valid_from/until, source, authorized override, reason and audit reference |
| `invoices`, `payments`, `refunds`, `disputes` | immutable money/currency links, provider IDs, state and reconciliation evidence |
| `checkout_operations`, `billing_operations` | actor/workspace, request hash, quote, idempotency key, step/provider IDs, status/retry metadata |
| `offers`, `offer_redemptions` | eligibility and limits; reservation state and unique workspace/customer redemption keys |
| `usage_events`, `usage_windows`, `usage_reservations` | meter/unit, logical call/leg/session, quantity, tariff version, costs, reset boundaries, reservation status; dedup key |
| `webhook_inbox`, `outbox_events`, `job_runs` | provider/environment/external event unique, processing lease, attempts, next retry, dead-letter reason |
| `notifications`, `device_registrations` | scoped recipient, channel, template, event key, delivery state, encrypted token reference, revoked_at |
| `support_tickets`, `support_messages`, `support_access_grants` | customer scope, assignment, SLA target, consented content attachment, grant expiry/reason |
| `crm_contacts`, `deals`, `activities` | Redial-business prospects only; consent/source, owner/stage, outcome and next action |
| `campaigns`, `audiences`, `automation_runs`, `message_deliveries` | channel/purpose, approved template, consent filters, enrollment keys, suppressed state |
| `pages`, `posts`, `content_revisions`, `media_assets` | draft/review/published, slug, metadata, accessible media, scheduled release and rollback |
| `referrals`, `referral_rewards` | inviter/referee, paid settlement condition, fraud checks, reversal/refund status |
| `agent_runs`, `tool_actions`, `approvals` | principal/scope, prompt/tool version, budget, action hash, approval expiry, result, redacted trace |
| `audit_events`, `incidents` | actor, scope, resource/action, reason, before/after hashes, timestamps and immutable evidence |

MVP migrations need only the entities used by the pilot. Later domains remain designed rather than prematurely migrated with broad permissions.

## Multi-tenant invariants
Every child entity must reference a parent in the same workspace. Use composite uniqueness/foreign keys such as `(workspace_id, line_id)` rather than relying only on application checks. Externally provided IDs must be scoped by provider account and environment, not assumed globally unique across connections.

A call belongs to one line; a transcript belongs to that call and inherits its access requirements. Storage paths are not authorization. Realtime channel names are not authorization. Export jobs must retain the requestor/scope and re-check authorization on download. SQL views/functions and service-role paths require the same scrutiny as tables.

## Access matrix
| Actor | Billing | Own line rules | Other line transcript | Platform operations |
|---|---|---|---|---|
| Anonymous | Public catalog only | No | No | No |
| Member | Own permitted invoices/account | Yes when line owner/granted | Only explicit grant | No |
| Household billing owner | Household subscription and aggregate usage | Only assigned/granted | **No by default** | No |
| Workspace administrator | Membership and assigned configuration | By role + line grant | **No by default** | No |
| Support staff | Minimal subscription/support fields | Change only with delegated authority | Time-limited specific grant + reason | Support scope only |
| Finance staff | Payments/refunds under approval limits | No | No | Finance scope |
| Platform administrator | Approved operational metadata | Emergency change with audit | Break-glass procedure only | MFA and least privilege |
| AI agent | Its delegated domain scope | Propose or approved action only | Minimum specifically allowed data | No implicit superuser |

## Supabase RLS requirements
Enable RLS on exposed tables and explicitly control grants. Write policies for permitted operations; never grant authenticated users blanket access simply because they are signed in. Keep service-role credentials server-only and audit every bypass path. Test both allowed and denied reads/writes, membership revocation and cross-tenant relationship injection. Review view/function behavior and private Storage policies. [W14]

Do not derive platform staff authority from mutable `user_metadata`, browser state or a requested role string. Harden any security-definer function with a controlled search path, restricted execution grants and narrowly scoped behavior; avoid recursive membership policy traps.

## Suggested indexes
Unique provider/environment/account/event keys; active phone lookup token; `(workspace_id, created_at DESC)` for calls/tickets; `(line_id, started_at DESC)`; `(call_id, sequence)` for segments; pending outbox/job retry indexes; subscription provider ID; callback due/state; consent subject/channel/purpose; active line grants. Paginate before full-table rendering. Add text search only where content permissions and encryption design support it.

## Contact matching
Normalize E.164 with a maintained phone-number library and country context. Do not infer all numbers are US by trimming digits. Minimize uploads; ask permission and explain server processing. A tenant-scoped keyed lookup token can reduce exposure in ordinary queries, while encrypted values allow necessary routing/export. It is pseudonymous, not anonymous, and the service can still link it. Revisit private-set-intersection or on-device approaches only after a security design; plain hashes are not a privacy claim.

## Proposed retention defaults
Free call history: seven days. Paid transcripts/summaries: ninety days unless the member chooses a shorter supported period. Operational call metadata: up to 365 days under a documented purpose. Recordings: off by default; when enabled and lawful, thirty days proposed. Raw webhook bodies: minimize/redact and expire promptly after troubleshooting needs; never retain full audio payloads in generic logs. Billing/audit retention is set with counsel/accountant and may differ.

Deletion runs must cover database rows, private objects, embeddings, provider-side stored media where supported, cached copies and exports. Backups have documented expiry and restricted restore procedures. Honor legal holds without falsely claiming immediate universal erasure. Prefer recording object identifiers and access logs over copying sensitive data into multiple services.

## v1.1 · Live-control schema extension

Add or reuse live sessions, participants, control operations, agent guidance, Directory destinations/routes, transfer attempts and cost segments per `docs/20-live-call-data-api.md`. Introduce explicit line grants for live metadata, monitoring, takeover, guidance, transfer, Directory management and custom dialing. Legacy `join_call` never expands automatically to these rights. Keep guidance separate from transcripts; line/tenant-consistent relationships, revoked active sessions, private realtime channels and action-bound destination approvals require integration tests. `contracts/live-call-controls.ts` is a design interface, not a run migration or runtime validator.

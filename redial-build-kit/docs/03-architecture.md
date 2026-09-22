# 03 · System architecture

## Recommended physical layout
Begin with one Next.js control-plane application for the public site, member app and staff UI, plus separate deployable voice and worker processes. Avoid unnecessary microservices while protecting active calls from web deployment churn.

```text
Website / Member web app / Staff operations
                 │
       Next.js authenticated API / domain services
                 │                         │
    Supabase Auth + Postgres          Square / Resend
    RLS + private Storage            verified webhooks
    scoped Realtime events                │
                 └──── Postgres outbox ────┘
                              │
                        Async worker
             summaries / notices / billing reconciliation

PSTN caller → supported number / forwarding → Twilio
                                           │
                            signed ingress + WSS media
                                           │
                             Dedicated voice gateway
                       policy / budget / consent / call state
                              │                    │
                       xAI voice adapter     permitted member endpoint
                              │              app VoIP / tested phone
                        scoped tool broker

Mobile + Chrome extension → same scoped API and events
Hermes / Paperclip / optional Grok Bot → restricted MCP/business API
```

## Deployment units
| Unit | Responsibilities | Not responsible for |
|---|---|---|
| `web` | Next App Router, SSR marketing, member/staff UI, standard APIs, auth callbacks, billing UI | Owning long-lived caller audio sockets |
| `voice-gateway` | Fast signed voice ingress, persistent WebSockets, call policy, media adaptation, transfers, deadlines | Campaign sending, large report generation, unrestricted agent tools |
| `worker` | Durable asynchronous tasks, notifications, billing sync, retention, exports, approved agent jobs | Real-time per-frame audio processing |
| Supabase | Auth, durable relational data, private objects, scoped events | Replacing a realtime audio engine |
| Redis | Optional queue/cache/short-lived rate or concurrency state; private network only | Sole source of truth for charges, membership or completed calls |
| Agent runner | Isolated approved tasks using scoped broker credentials | Root VPS access, Docker socket, production database superuser |

**Queue decision:** store durable domain events in a Postgres outbox. A worker can claim them directly for the pilot. Add Redis/BullMQ when throughput or scheduling complexity warrants it; idempotency and replay still depend on durable database state. Do not run both scheduling systems independently on the same logical job.

## Repository structure to grow toward
Do not reorganize a nonempty working project just to match this drawing. Adopt service/package boundaries as justified.

```text
apps/web/                 # website, member and ops routes (or existing root app/)
apps/mobile/              # React Native/Expo development-build app
apps/extension/           # Vite/React or existing reviewed MV3 toolchain
services/voice-gateway/   # Node + persistent WebSocket server
services/worker/
packages/domain/          # types, policy, entitlement and capability definitions
packages/contracts/       # API schemas and event envelopes
packages/provider-adapters/
packages/ui/              # web/extension components, NOT native DOM components
packages/config/          # non-secret validated configuration
automation/               # agent profiles, tools and eval definitions
supabase/migrations/
supabase/tests/
redial-build-kit/          # this handoff, reference only where appropriate
```

Native apps share contracts, rules, validation and tokens; they do not directly render web shadcn components. Keep browser-only code and server-only secrets out of the shared native dependency graph.

## Logical domains
Identity and workspaces; number ownership/connections; screening policies; conversations and actions; provider credentials/capabilities; billing/entitlements/usage; notifications/consent; operations/support; growth/CMS; agent approvals/audit. Each domain owns its state transitions and exposes explicit commands rather than letting every UI write arbitrary tables.

## Trust boundaries
Authenticated user identity is verified server-side; tenant membership and resource permissions are resolved from trusted state. A client-provided `tenant_id` is a requested scope, not authority. Telephony webhooks are authenticated by provider signatures and mapped from provider account/number to a tenant. A call identifier from a URL is not enough to join a call or download a recording.

Use service-role access only in restricted server paths with explicit authorization. Human web requests should use RLS-protected queries where practical. Background jobs re-check scope, revocation and entitlement before consequential work. Version rule snapshots at call start so mid-call settings changes cannot create inconsistent behavior.

## Multi-provider design
Use capability-checked adapters, not an assumed universal endpoint. An adapter declares codec support, bidirectional streaming, transcript events, tool calls, barge-in, transfer primitives, region options and billing measurement. When unavailable, disable the corresponding UI feature with a reason.

First adapter: Twilio transport plus xAI speech-to-speech. Evaluate direct xAI SIP as a separate design experiment: fewer bridge components may help, but observability, tool control, transfer semantics and fallback must be demonstrated before replacing the first path. [W04, W05, W09]

## Resilience goals — proposed, not tested performance
Web deploys should not terminate calls. Voice deploys mark an instance draining, stop taking new work, and allow existing calls a bounded drain period. A stalled model should reach a configured deterministic fallback rather than silence. Database/queue outages must not cause duplicate charges or notifications. Missing Realtime events are recovered through ordinary API fetches.

A single VPS is a single failure domain. Multi-container deployment does not make it highly available. Establish independent carrier-level fallback and an external synthetic check, then add a second failure domain when business requirements justify it. Do not advertise a numerical uptime guarantee before measuring and contracting for it.

## v1.1 · Shared live-call media architecture

For Live Call Controls-enabled calls, use the conference-first topology in `docs/21-live-call-topology.md`: caller conference leg; independent AI TwiML Application participant/stream; provider-muted Insider participant; human Gavel participant; independently staged Directory destination. Audible is a private authenticated command channel to the active agent session. Basic direct screening can coexist, but cannot claim the same capabilities without tests. The serialized coordinator owns transitions while the gateway owns audio gates. This extends—not replaces—the web/worker/Supabase/Coolify boundary. Reconcile new participant/leg costs before managed-plan rollout. [LC01–LC05]

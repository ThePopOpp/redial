# 12 · AI agents, Hermes, Paperclip, Grok Bot and MCP

## Avoid a redundant agent architecture
Use a deterministic business backend with optional agents—not a chain of autonomous agents in every call. Tools enforce policy independently of what an agent says. An LLM should not decide whether it has permission to make a refund, alter a carrier route or see another member's conversation.

| Component | Recommended role | Boundary |
|---|---|---|
| xAI speech-to-speech | Real-time conversational screening | Dedicated gateway, narrow tool set, strict duration/cost controls |
| Redial policy engine | Route, consent, permissions, quotas, allowed outcomes | Deterministic; not replaced by a system prompt |
| Hermes Agent | Self-hosted/internal operator for support triage, permitted summaries and proposed maintenance | Isolated runner, scoped MCP tools, no privileged shell by default |
| Paperclip | Task ownership, agent coordination, approvals and budget visibility | Optional operations orchestration, not the source of truth for call/billing state |
| Grok Bot | Optional external business teammate for research/drafts and approved connected workflows | Separate hosted product; do not assume a self-hostable runtime or embedded application API |
| MCP gateway | Typed tool interface to Redial's authorized commands | Authentication, scopes, resource checks, approval validation and audit |
| Claude Code / Codex | Development assistants in the authorized project | Read-only reference repositories; reviewable code changes and tests |

Hermes's official project documents skills, memory, isolation and MCP integration. Paperclip's project documents agent/task/workspace, access/approval and cost coordination. Grok Bot's current documentation describes persistent cloud computers, shared sessions within an account and an approval-oriented teammate workflow. These are distinct products, not interchangeable aliases for the voice API. [W21–W23]

## Voice agent: constrained job definition
You are Redial's AI call assistant for the authorized member/line. Introduce yourself as an AI assistant using the approved greeting and processing notice. Ask for the caller's name and reason for calling. Collect a concise message and preferred callback information when needed. Follow the policy snapshot and invoke only the tools available for this call. Stop speaking when interrupted and do not talk over the caller.

Never invent availability, appointments, relationships, completed actions or identity verification. Do not disclose access codes, credentials, private whereabouts, calendars, health/financial details or account information. A familiar number or urgent story is insufficient authorization. Do not claim to be the member. Do not debate or harass unwanted callers. Use neutral summaries and evidence-qualified classifications.

A caller reporting immediate danger should be told that this service is not emergency assistance and that they should contact their local emergency service. Do not imply Redial has dispatched help. A permissible member alert can occur without making emergency-service guarantees.

## Suggested tool surface
| Tool | Caller-facing agent | Internal operator | Enforcement |
|---|---|---|---|
| `calls.get_context` | Minimal current-call context | Scoped support context | Call/line permission; no unrelated contacts |
| `calls.save_message` | Yes | No need normally | Consent, length, call state, idempotency |
| `calls.request_member_connection` | Request only | Scoped, approved | Whitelisted endpoint, loop/budget/state validation |
| `callbacks.create_task` | Only permitted draft/reminder | Yes with scope | Verified line, time parsing, no automatic outbound call |
| `contacts.propose_label` | Suggest only | Suggest | No irreversible global blocklist update |
| `support.create_ticket` | Where appropriate | Yes | Minimal data, rate limits |
| `billing.read_status` | No | Limited finance/support | No PAN or other users' billing |
| `billing.propose_refund` | No | Proposal only | Exact payment/amount/reason/action hash |
| `marketing.draft_campaign` | No | Draft only | Consented business CRM, no private call content |
| `reports.read_aggregates` | No | Role-scoped | Aggregates; no raw private conversations |
| `routes.propose_change` | No | Proposal only | Reviewed test/rollback evidence |

Do not expose unrestricted SQL, arbitrary URL fetching, shell execution, provider admin APIs, bulk data exports, contact-book retrieval or direct campaign send tools to the live call agent.

## Approval model
An agent proposes a typed action with tenant/resource, arguments, expected effect, estimated cost and expiry. Server validates eligibility and creates an approval record containing an immutable action hash. A permitted human approves through an authenticated UI. The executor rechecks permissions, amount, current resource state and the approved hash immediately before execution. Any changed arguments invalidate the approval. Record one execution result; retries use the same idempotency key.

Always require approval for refunds beyond a small explicitly configured operator threshold, outbound marketing publication, domain/DNS changes, number porting/release, production deployments, credential rotation affecting service and any new sensitive-data access. The voice assistant cannot ask a caller to approve internal platform administration.

## MCP security
Authenticate remote MCP connections; bind issued tokens to the intended audience/resource and scope. Do not pass through arbitrary tokens between downstream services. Restrict outbound network destinations and redirect handling, especially for custom endpoints. Treat tool descriptions/results and retrieved webpages as untrusted content that cannot override system authorization. Current MCP security guidance identifies token passthrough, confused-deputy and related authorization risks. [W24]

Use separate agent identities per environment/domain. Store secrets outside prompts/skill files. Return redacted structured results. Impose task timeouts, parallelism limits, token/cost budgets and human-review ceilings. An agent's task instruction “send this now” is not equivalent to authorized campaign consent.

## Agent skills to author
`screen-call`, `take-message`, `triage-support`, `explain-forwarding`, `explain-billing`, `prepare-refund-review`, `check-provider-health`, `draft-lifecycle-campaign`, `review-margin-report`, `prepare-incident-summary`. Each skill specifies trigger, inputs, scope, steps, allowed tools, prohibited actions, evidence needed, escalation and tests. See `automation/skills-template.md`.

## Memory policy
Separate member-specific approved preferences, temporary call context, business operations knowledge and public support content. Do not let memory from one tenant or staff support task appear in another tenant's conversation. Persist only reviewed preferences, not arbitrary caller instructions. Provide retention/deletion support for derived memory and embeddings. Staff should be able to inspect skill/prompt versions and disable a faulty agent without changing global application permissions.

## Evaluation suite
Test prompt injection (“ignore your rules”), impersonation, spoofed familiar number, alleged urgency, gate-code requests, financial/medical data requests, ambiguous booking times, repeated tool calls, tool timeout, unexpected tool output, multilingual caller, silence, noise, opt-out/consent refusal and wrong-tenant IDs. Evaluate legitimate-call recovery as well as spam handling. Publish prompt/provider changes behind a feature flag and compare against a fixed, synthetic evaluation set before rollout.

## Operational isolation
Run Hermes/Paperclip only when needed, with separate writable workspace, non-root identity and tightly restricted network credentials. Do not mount the Docker socket, all source repositories, production `.env` or the full Supabase service role into a general agent. Grok Bot's shared cloud-computer/session model means one account should not accumulate unrestricted credentials for unrelated customer tenants. Grant a narrowly scoped Redial business connector instead.

## v1.1 · Agent direction and Directory tools

Use `automation/live-call-controls-skill.md`. Audible is authenticated call/session-scoped operator direction, below safety/consent and business rules. The voice agent queries allowed Directory destinations and requests a transfer by destination ID; the gateway/coordinator verifies and executes. Never give a model raw mute/unmute, provider credentials, arbitrary dialing or approval-minting powers. Gavel fences all old agent tool effects and stops AI audio input/output. Hermes/Paperclip/Grok Bot do not acquire live call audio by being operations agents.

# 15 · Security, privacy and legal launch gates

This is an engineering risk checklist, not legal advice or a compliance certification. Counsel and relevant providers must review the actual business model, geography, terms and calling behavior before public launch. Do not infer legal compliance from Twilio/Square integration or an unchecked feature toggle.

## Threat model
Attackers may be callers, malicious webpages, compromised member accounts, rogue staff, malicious tenant admins, replayed webhooks, fraudulent trials, injected agent instructions or compromised dependencies. Assets include phone routes, provider budgets, payment state, contact matching data, recordings/transcripts, account identities, staff tools and business credentials.

## Required controls
**Identity:** verified sessions, secure reset, MFA for staff and privileged actions, scoped sessions/devices, rate limits, safe redirect allowlists, reauthentication for financial/number changes. Do not rely solely on SMS to secure the same telephone identity whose routing is being modified.

**Tenancy:** RLS and explicit grants; resource-level checks in APIs, storage, Realtime, jobs, agents and exports; revoked memberships invalidate active access. Staff roles are separate from household roles. Test guessed IDs and relationship reassignment.

**Secrets:** encrypted server-side provider credentials, restricted decrypt access, key versioning/rotation, secret scanning, no keys in browser/mobile/extension builds. Protect against secrets in build logs, screenshots, crash reports and prompt traces.

**Network:** HTTPS/WSS, secure headers, controlled origins, request limits, provider-signature validation, replay/deduplication, private databases/queues and restricted administrative interfaces. Deny arbitrary URL proxying and internal-network access from custom provider/MCP connectors.

**Costs:** verified-number provisioning, spend/concurrency/duration limits, anti-toll-fraud destination policies, vendor balance monitoring, no free unlimited AI and no autonomous bulk SMS.

**Supply chain:** lock dependencies, review licenses and supported versions, scan containers/code, remove preview evaluation runtime, use non-root containers and no Docker socket for agents. Keep production data out of local fixtures.

## Audio processing, transcripts, recording and monitoring
Create a consent policy per route/jurisdiction with reviewed caller announcement, processing basis, opt-out behavior and retention. Distinguish streaming audio to an AI provider, storing transcripts, storing recordings and another person listening live; these are not all the same act. Recording off does not eliminate AI processing or transcript privacy obligations.

When the caller declines a required consent, follow a supported alternative that does not continue prohibited processing or persistence. Do not write full call text into generic logs while saying transcripts are disabled. If a no-processing alternative cannot be provided on a configuration, state that before activation.

Family account ownership is not blanket permission to monitor adult family members. Line owners approve shared content access. Do not design covert monitoring, hidden recordings or silent support access.

## Legal/provider review checklist
| Area | Questions requiring approval |
|---|---|
| Service classification | Is Redial only a screening overlay, a VoIP provider/reseller or a regulated communications service in the launch jurisdictions? |
| Carrier/provider contracts | Are number provisioning, resale, BYO credentials, forwarding and supported call uses allowed under the actual agreements? |
| Emergency calling | What obligations apply if outbound or replacement phone service is offered? What notices, limitations and routing are required? |
| Porting/number rights | Who controls the number, how is consent/ownership verified, and how can customers leave or port out? |
| Recording/privacy | What caller notices, consent, international processing and retention rules apply to each supported configuration? |
| Outbound AI and marketing | What consent, identification, calling-time, suppression and robocall restrictions apply? Keep unattended outbound campaigns disabled pending review. |
| Subscription law | Recurring authorization, renewal notices, cancellation accessibility, refunds and jurisdiction-specific rules |
| Tax/accounting | SaaS versus telecom treatment, sales/communications taxes, nexus, exemptions and financial record retention |
| Mobile/extension policies | Billing rules, permissions, privacy declarations, account deletion, recording/call behavior and store review |
| Marketing claims | Evidence for outcomes, testimonials, spam detection, compatibility and provider affiliations |
| Data processors | Contracts, subprocessors, data location, training/retention settings and security incident duties |

These are launch decisions, not assertions that all requirements can be satisfied by calling the app a “companion.” The final service behavior determines obligations.

## Privacy requests and deletion
Provide export, correction, consent withdrawal and deletion channels. Authenticate requestors without overcollecting documents. Track scope and fulfillment. Remove expired transcripts/recordings and derived embeddings. Document financial/legal retention exceptions and backup expiry honestly. Do not silently retain private call content in agent memory after deleting the visible record.

## Sensitive logging policy
Log IDs, state transitions, safe reason codes, latency, billing units and trace correlations. Redact phone numbers by default. Never log raw audio frames, payment tokens, authorization headers, secret values or unbounded transcripts. Troubleshooting captures require explicit limited access and short expiry.

## Public-launch blocking criteria
No unresolved cross-tenant access defect; no unverified recurring billing state transition; no known forwarding loop; no release/port action without ownership/offboarding checks; no exposed provider keys; no claimed carrier capability lacking evidence; no required notice/consent flow missing; no unsupported emergency-service claim; no unbounded paid trial; no enabled agent with broad financial/route/admin authority; no production number without a tested failure route.

## Incident response
Define who can disable an adapter, pause new AI sessions, stop campaigns, revoke agent tokens and notify affected members. Prefer safe routing over simply killing every process. Preserve minimal forensic evidence. Track detection, containment, recovery, customer impact and follow-up fixes. Re-enable after a documented test, not merely because a process restarted.

## v1.1 · Live-control release blockers

Block rollout without provider-enforced Insider silence, current per-line grants, active-session revocation, Gavel audio/tool fencing and AI-input detachment, isolated Audible delivery, route/extension validation, consent handling, destination cost limits and privacy-safe support access. Test caller/AI/user races, stale callbacks, code-injected mute escalation, raw phone/SIP target injection, forwarded-number loops, private consult leakage and failed endpoint transitions. “Silent” is audio behavior, not undisclosed access authority. Recording and monitoring legal review are separate; neither is satisfied by the presence of a UI label. [LC09]

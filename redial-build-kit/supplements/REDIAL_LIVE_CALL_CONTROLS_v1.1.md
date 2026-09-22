# REDIAL — Live Call Controls

**Version 1.1 · Insider · Gavel · Audible · Directory**

Standalone module specification. The complete updated kit integrates these additions into the existing website, web/mobile/extension, business, billing, security and roadmap documents. These are planned features, not live integrations.



---

# 19 · Live Call Controls — Insider, Gavel, Audible & Directory

**Redial build kit v1.1 · Requested additions · September 18, 2026 (America/Phoenix)**

Status: product and engineering requirements, not working provider integrations. The four names and core behaviors below are the owner's requested scope. Interaction details, permissions, limits and implementation choices are proposed elaborations. No existing subscription prices are changed by this update.

## 1. The four features

| Feature | Requested behavior | Product description | Primary control |
|---|---|---|---|
| **Insider** | Live listening; silent listening to agent and caller | Listen to both sides of an active Redial call without adding your microphone audio to the conversation. | **Insider · Listen live** |
| **Gavel** | Take-over; stops agent and user takes over call | Move from AI handling to your own two-way conversation on the same connected call. | **Gavel · Take over** |
| **Audible** | Message the AI agent with real-time call direction | Send a private instruction to the active agent while it continues speaking with the caller. | **Audible · Guide agent** |
| **Directory** | Agent transfers to phone/custom numbers, extensions and more | Route callers to authorized saved destinations, approved custom numbers, internal users, departments and compatible phone systems. | **Directory · Transfer** |

Together these form **Redial Live Call Controls**. Preserve the feature names in the website, app, mobile interfaces, documentation and admin feature catalog. Add plain-language subtitles because the branded names alone do not explain the action.

The supplied member design already contains “Take the call” and “Listen in” controls in its mobile preview, plus a live-call alert description. These are design references, not implemented media controls (`references/claude-design/ReDial App.dc.html`, approximately lines 228–279). This update formalizes those concepts as Gavel and Insider and adds Audible and Directory without modifying the source references.

## 2. Scope and availability

All four features are designed for calls Redial actually controls. They do not intercept arbitrary T-Mobile, Verizon, AT&T or other cellular calls merely because an app or extension is installed. Existing carrier-forwarding limitations remain in force.

The first supported full-control topology is a Twilio conference with independent caller, AI and authorized human participants. The AI uses a separate TwiML Application participant attached to the voice gateway. This proposal builds on documented Twilio primitives; Redial-specific behavior must pass real-call tests before activation. See `docs/21-live-call-topology.md`. [LC01–LC05]

A basic direct-stream call can continue to exist for earlier screening-only development. Do not advertise all four controls on that path or silently try to add a conference alongside a blocking stream. Choose the verified topology before admitting the call; existing active calls retain their selected topology/version.

Feature visibility is determined by all of: current user identity, line-level grant, workspace entitlement, actual provider capability, consent policy, active call state, device readiness, and spending limits. A platform administrator or household payer does not automatically have permission to listen to someone else's call.

## 3. Insider — live silent listening

### Member experience

A member sees an authorized active call in **Calls → Live** or receives a generic live-call alert. Opening the console shows caller display information, the agent status, an optional authorized live transcript, elapsed time and the four named controls.

Selecting **Insider · Listen live** opens the audio output and joins a listen-only session. The UI displays **Listening live · Your microphone is not sent**. The member hears the caller and agent as carried by the live call, not merely a transcript readback. They can adjust local volume, stop listening, use Audible, request a Directory transfer, or select Gavel if separately authorized.

Stopping Insider removes only that monitoring session. It does not end the caller's call or pause the agent. Listening permissions never imply speaking, transfer, recording or transcript-export permissions.

### Required behavior

- Enforce silence at the provider/media layer. A disabled microphone icon or client-side mute alone is insufficient. A conference monitor is admitted muted, and the API rejects an ordinary unmute attempt unless a valid Gavel transition authorizes it. Twilio documents muted conference participants as able to hear others without transmitting their speech. [LC01, LC02]
- For the reference Twilio Voice SDK endpoint, request only the microphone permissions required by the selected SDK and platform; do not promise that every SDK can establish a call without microphone access. Even where permission is needed, block microphone transmission at the provider and locally. A purpose-built receive-only transport is a separate tested adapter.
- Do not produce an operator greeting, whisper, typing sound or system notification into the caller mix. Join/leave announcement policy is independent of microphone silence. Do not disable legally or contractually required notice merely to make the feature feel invisible.
- Show monitoring status to authorized users in Redial and maintain an access audit. Do not market the feature as undetectable surveillance.
- No new recording is created simply because Insider begins. Recording, transcription and AI processing remain separate permissions/consent states.
- Revoking access, signing out or removing a member causes active monitor sessions to be revoked server-side. Closing the browser is not the only enforcement mechanism.
- Losing a monitor connection leaves the agent/caller session running. Never restart all call legs because the listener changed Wi-Fi networks.
- Initial proposal: one simultaneous Insider session per authorized user per call and a separately configurable line-level listener limit. Server enforcement must prevent duplicate listeners from browser, extension and mobile sessions unexpectedly multiplying costs.

### Boundaries

Insider monitors the agent/caller portion by default. Gavel completion or a successful external transfer ends other Insider sessions unless an explicit grant and call policy authorize continuing to monitor the human conversation. Continuing must be visible and governed by the applicable notice/consent policy. Listening is not the same as listening to an isolated warm-transfer consultation; access must be checked separately.

### Acceptance

Both agent and caller are audible; an operator speaking into their device is inaudible to the call; stopping listening preserves the call; forged tokens and wrong-line IDs fail; revocation removes an already-connected listener; hold/private-consultation routing does not leak an unauthorized conversation; a monitor leaving does not terminate the conference.

## 4. Gavel — stop the agent and take over

### Member experience

Selecting **Gavel · Take over** connects the member through a ready web/mobile calling endpoint. Where implemented and approved, an alternate verified phone can be selected. Dialing a phone is a visible action, not an automatic side effect of opening the console.

If already in Insider, Redial reuses that authenticated participant where the SDK and provider support promotion. Otherwise it prepares a muted human participant. The caller remains on the same logical call and does not need to redial.

The UI progresses through **Preparing your connection → Silencing agent → Connecting you → You are speaking**. Do not show “You are speaking” just because a command was accepted or a phone started ringing. If there is a connection delay, display it rather than promise an instant or seamless handoff.

### Handoff protocol

1. Validate current line-level `takeover_live`, entitlement, consent, device and call capabilities. Allocate a single transition with a compare-and-set call version, idempotency key, finite deadline and fencing epoch.
2. Prepare or identify the human endpoint, initially muted. Verify it is connected and the user has deliberately accepted. The AI can continue handling the caller while the member endpoint is being prepared.
3. Once the member is ready, close the AI output gate in the gateway; stop forwarding new caller audio to that AI session; cancel generation when the adapter supports it; invalidate pending AI tool authorizations; clear queued playback at the gateway and telephony stream. Twilio has a `clear` message for its playback buffer. An individual provider's cancel/truncate event must be verified, not copied from another vendor's schema. [LC04, LC08]
4. Mute and remove the AI conference participant. Confirm the effective provider state, including the human leg and caller still being present. Removing the AI must not end the conference.
5. Promote/unmute only the winning authorized human participant. Reconcile provider state and then publish **human_active**. Stop the AI session and its metering when actually closed; continue transport/participant metering until those legs end.
6. End other monitor sessions unless the explicit post-handoff monitoring policy permits them. Close the Audible composer for the removed AI session. Record a content-minimal handoff audit event.

Some already played or in-flight audio cannot be recalled. The requirement is to prevent subsequent AI output after the provider-confirmed handoff barrier, and to measure any residual audio during testing. Muting without detaching the AI input is not sufficient to meet the proposed privacy default.

### Failure and race rules

Only one speaking owner and one routing transition can be active at a time. A second takeover request gets a clear busy/stale response or the original result for an identical idempotency key. Directory transfers and Gavel cannot simultaneously change the same call. A pending transfer must be explicitly canceled and reconciled before Gavel starts.

If the human never connects, the AI remains in control and the UI reports the failed attempt. If the AI has already been removed and the human connection fails, route the caller to a bounded deterministic hold/message fallback. Do not silently reconnect a listening AI after telling the member that it has left. An explicit **Return to agent** action, where implemented, requires a new authorized session and an appropriate disclosure policy.

If the caller hangs up, close all pending human/destination legs, stop AI work and reject late success callbacks. A lease expiring does not grant a second worker permission to blindly unmute a new operator: reconcile actual provider state using the fencing epoch before resuming.

### Acceptance

A real human converses with the original caller; agent output and incoming audio to the AI cease; buffered speech and delayed tool calls cannot continue; the caller does not disconnect when the AI leaves; two devices racing do not both become the speaker; failed endpoint readiness does not prematurely silence the only responder; human disconnect uses the stated fallback; an API acknowledgement alone never becomes a completed handoff.

## 5. Audible — private, real-time agent direction

### Member experience

**Audible · Guide agent** opens a private composer beside the live transcript or as a mobile sheet. It works without joining Insider and does not require microphone input. The user can type an instruction, choose a suggested direction, see delivery status and retract it while still queued.

Example directions:

> Ask which project they are calling about.
>
> Let them know I can return the call after 3:00 PM.
>
> Get their preferred callback number before ending the call.
>
> Offer to connect them with our office manager.

Resolve relative times with the member's saved timezone and current call date. Do not make availability or appointment commitments that conflict with the member's standing permissions.

### Private channel contract

Audible is text guidance to the agent, not an SMS to the caller and not a human audio whisper. The instruction travels from the authenticated Redial interface to the call-control service and then to the current permitted agent session. Raw instructions are not directly played as audio, inserted as caller speech, or included in caller-facing exports.

The caller may hear the agent act on the guidance. “Private” describes the message channel; it is not a promise that an AI can never paraphrase information it has been given. Do not include passwords, entry codes, payment data or other secrets in Audible. Add redaction and disclosure-regression tests. Never convert this composer into a secret-storage feature.

xAI documents session instructions and text conversation input. The exact mid-call delivery, acknowledgement and interruption behavior must be implemented against the selected xAI API version. Do not infer that every OpenAI-style event or guarantee is supported. [LC08]

### Message contract and states

Each instruction has a call ID, agent-session ID, author ID, server sequence, submission time, expiration, source `operator_guidance`, timing mode, scope and status. Proposed length limit: 1,000 characters. Proposed default expiration: 60 seconds for next-turn guidance; explicitly selected remainder-of-call guidance lasts only until that agent session ends.

States: **queued → submitted → acknowledged**, with optional **action-confirmed** only when independent evidence exists. Alternative states: **rejected**, **expired**, **canceled**, **superseded**, **delivery-unknown** and **failed**. Provider acknowledgement means delivered/configured, not that the model understood or obeyed the direction. Do not fake an “applied” badge from a successful network send.

### Timing and priority

Default **Next turn** applies at the next safe turn boundary without talking over the caller. An optional **Interrupt agent** mode requires a verified interruption adapter, stops current generated speech, clears stale playback and then applies the direction. It must not interrupt a required disclosure or bypass policy. If unsupported, disable that timing mode with a reason.

Priority: authorization/consent and safety policy → active handoff/transfer state → owner-approved business rules → valid operator guidance → caller requests. Guidance is not allowed to change tools, entitlements, consent, dial permissions, system prompts or secret access. Preserve base instructions when compiling call-scoped guidance; never replace them with the user's text.

One authoritative controller writes directions at a time for the initial release. Other authorized viewers can request control. Queue edits explicitly supersede only the targeted still-queued instruction; a delivered instruction cannot be “unsaid.” Audible requests directed at a prior AI session are rejected instead of being replayed into a new call or successor session.

### Directory interaction

An instruction such as “Transfer to the office manager” can cause the agent to request an authorized Directory action. The backend still resolves the saved destination ID and checks the line's standing authority. An unknown or custom destination requires the separately authorized custom-transfer flow; no raw phone number becomes executable solely because it appears in a guidance message.

### Acceptance

Messages reach only the current call's agent; caller audio never includes the raw private message; expired/canceled messages do not execute; guidance submitted during Gavel is rejected or canceled; untrusted caller speech cannot impersonate operator guidance; safe base instructions survive updates; observed behavior is not confused with delivery acknowledgement; browser retries do not submit the same guidance twice.

## 6. Directory — contacts, destinations and routing

### Destination types

| Destination | Example / meaning | Required implementation |
|---|---|---|
| Saved phone number | Member's authorized office, mobile or landline destination | Country/E.164 normalization, reachable route, spend and loop checks |
| One-time custom phone | A number deliberately entered by an authorized member for this call | Separate permission, visible full-number confirmation, policy checks and action-bound approval |
| Phone plus extension | Main office number followed by extension 204 | Store number and extension separately; use a tested DTMF/IVR route |
| Internal Redial user | Authorized teammate's app calling endpoint | Resolve active identity/device, line access and presence |
| SIP/PBX address | A provisioned organization SIP destination | Approved connector/domain, authentication, codec and interoperability evidence |
| Department / ring group | Sales, office, scheduling or support | Explicit members, routing strategy, hours and fallback |
| Voicemail/message route | An internal Redial message flow or supported destination mailbox | Consent, bounded duration and correct message owner |
| External system | Compatible contact-center queue, IVR or PBX route | Specific connector; not a generic arbitrary URL |

“Any phone number” is a flexible member-controlled destination, subject to supported geography, dialability, authorization, carrier restrictions and fraud controls. It does not mean that an anonymous caller or agent can dial any number without approval. Do not require members to claim ownership of every legitimate third-party business they call; distinguish authorized dialing from proof of phone ownership.

### Directory management

Add **Directory** under the member's Call Management navigation. Provide search, favorites, recently used, personal/workspace scope, categories, named destinations, contact linkage and status. Keep Directory routing records distinct from address-book contacts: not every imported contact is an authorized transfer endpoint.

Each destination supports a display name, destination type, phone/country or internal identity/SIP reference, extension/approved dial sequence, timezone, weekly hours, holiday overrides, availability source, line restrictions, caller-type eligibility, transfer method, ring timeout, fallback, confirmation policy, brief-to-recipient settings, owner, verification status and revision history. Directory routes must be versioned and testable before publication. Mask sensitive routing details according to permission and do not disclose a private destination number to the caller merely to transfer them.

Start with saved phones, a one-time custom-phone flow and internal users. Add extensions after a real IVR test. Department strategies, SIP and queues remain visible as planned/unsupported until their individual adapters pass.

### Agent-initiated transfer

The caller asks for a person/department or screening policy identifies an appropriate route. The AI queries a line-scoped Directory search tool, resolves ambiguity with the caller and requests a transfer using a destination ID. The server checks standing authority, hours, destination version, loops, costs and current call state. The agent may announce an intention to connect but must not claim the transfer succeeded before backend confirmation.

### Member-initiated transfer

The member opens Directory from the active console, searches or enters a permitted custom number, reviews the target/method and selects **Transfer call**. This may happen while the AI handles the call or while the member owns a Gavel-taken call. If a human currently owns the call, only that controller or an explicitly authorized delegated controller can initiate the change.

### Transfer methods

**Announced transfer:** default. The caller is told where the call is going; the target rings; failed attempts return to the selected fallback. Do not describe an ordinary bridged transfer as zero downtime.

**Warm transfer:** the destination receives an approved, minimal caller brief and accepts before joining the caller. The first implementation may use a private pre-join announcement and a “press 1 to accept” step; label it **brief-and-accept**. A live AI conversation with the destination is an optional richer mode requiring a separately isolated consultation path. Never place a supposedly private briefing in a shared conference mix. Recipient context requires the appropriate permission and must exclude Audible messages and unrelated transcript details.

**Direct/blind transfer:** initiate the target without a private consultation. Clearly state whether Redial retains the caller bridge and can recover on no-answer, or whether a verified SIP REFER releases control. Default to a recoverable controlled bridge. A released external transfer disables Redial monitoring and controls unless the external system explicitly supports them.

**Group routing:** sequential and simultaneous strategies may follow after individual routes work. Prefer a deliberate accept step to prevent voicemail winning a simultaneous ring. Cancel all losing call attempts and cap the number of targets, hops, cost and duration.

### Extensions and DTMF

An extension alone is not a public phone number. Pair it with an approved main number or PBX/SIP route. Store a reviewed dial sequence and pauses separately from the number. Twilio's `<Number sendDigits>` and outbound Call `SendDigits` support tones after answer; do not send extension digits as xAI speech or assume outgoing DTMF exists on a bidirectional Media Stream. [LC03, LC06, LC07]

The Conference Participants create API must not be given an invented `sendDigits` field. For an extension route, use a supported outbound Call/dial flow that handles DTMF and pre-join acceptance before joining the conference, or a compatible PBX/SIP connector. Test the sequence against the actual IVR. Its answering event may mean the switchboard or voicemail answered, not that extension 204's intended recipient accepted.

### Destination controls and fallback

Normalize phone numbers; reject malformed inputs, blocked/premium/emergency targets and disallowed regions under the pilot policy; resolve approved SIP domains safely; apply spend ceilings, call concurrency, maximum transfer attempts and a finite ring window. Verify route graph and known aliases at execution, not only when saving a destination. Reject the forwarding source, original Redial number and cycles, including cycles through departments or fallbacks.

An arbitrary external system's forwarding behavior may be unknowable. Combine known-graph checks with bounded attempts/hops and monitoring rather than claim perfect detection of every outside loop.

No-answer, busy, declined, invalid extension, unavailable user, no matching department, provider error and caller disconnect each have separate outcomes. A standard fallback offers an authorized next destination, a message or a callback task. Do not create an unbounded chain or silently dial an unapproved fallback. Transfer is complete only when the expected target acceptance/bridge evidence exists.

## 7. Shared live-call interface

### Desktop web app

Use `/app/calls?view=live` for the active list and preserve `/app/call-console/[id]` as the detail route. A live call card opens the console rather than placing control buttons on static historical calls.

Console layout: call header and status at top; transcript/context at left; the named control bar near the active conversation; participants and connection quality at right; Audible/Directory in contextual panels. The call header includes the line, caller display, elapsed time, `AI handling / Preparing takeover / You are speaking / Transfer pending / Ended`, and separate recording/monitoring indicators.

Control bar: **Insider · Listen live | Gavel · Take over | Audible · Guide agent | Directory · Transfer**. During Insider replace the first label with **Stop listening** and retain the Insider title. After takeover show microphone, audio output, hold, Directory and end-my-call controls; Audible is unavailable while the AI is disconnected.

Distinguish **Leave listening**, **Leave my call**, **Cancel transfer**, and **End call for everyone**. The destructive action needs appropriate authority and explicit confirmation. Do not end the global call when a browser listener closes its panel.

### Mobile

Use a two-by-two accessible control area or bottom sheet preserving all four names and descriptions. Insider, Gavel and two-way calls require native/SDK readiness and physical-device audio/background testing. Audible and Directory can be command interfaces without sending audio from the phone. A push notification deep link requires reauthorization; it is not a join token. Keep private message and transcript text off lock screens by default.

### Chrome extension

Expose live-call state, Audible and Directory command panels through the same authorized API. Insider and Gavel initially open the dedicated web call console. Do not claim audio is hosted inside the extension service worker. Later embedded media needs its own lifecycle and microphone tests; the four products can exist across the platform without pretending every interface has equal media capabilities.

### Public website

Add `/features/insider`, `/features/gavel`, `/features/audible` and `/features/directory`, plus a four-card Live Call Controls section. Display availability truthfully. Store links are not fabricated; demonstrations are labeled simulations. See `content/live-call-controls-copy.md`.

## 8. Operations dashboard and subscriptions

Add **Operations → Live Calls** with actual active-session counts, topology, connection health, transition state and errors. Metadata requires its own staff grant; audio, transcripts and guidance require separate time-limited customer-authorized access. A support case does not confer silent audio access. Finance and growth roles cannot monitor calls by default.

Add **Product → Feature Access** for Insider/Gavel/Audible/Directory entitlements, account rollout cohorts, capability flags, provider evidence and kill switches. Add **Directory Routing** for authorized troubleshooting and audits, not an unrestricted cross-customer contact browser.

Track started/completed/failed monitoring sessions, handoff latency and success, queued/acknowledged/expired guidance, transfer attempts/acceptance/no-answer, authorization denials and usage cost. Separate event metadata from private message bodies. Do not use call content for general marketing attribution or model training without separately approved policy.

No price or quota is silently changed. A proposed commercial mapping may include the four features in paid tiers, but the owner must approve availability and limits. `configuration/live-controls.proposed.json` keeps production activation and automatic extra billing off. Track listener/participant/AI/phone-leg usage because conferencing changes the earlier simple-screening economics; do not pass additional usage to Square as unannounced charges.

## 9. Privacy and release conditions

“Silent” describes the operator's audio, not an exemption from notice, consent, line ownership or access controls. Use a reviewed jurisdiction-appropriate monitoring policy. Where a call cannot establish the required notice/consent, keep the optional monitoring feature off and follow the configured alternative. Recording has its own legal requirements and remains a separate switch; review it with qualified counsel. [LC09]

Example disclosure for review, not a universal legal solution: **“You’ve reached an AI assistant. An authorized team member may listen or join to help with your call.”** Add recording/transcription wording only when those activities actually occur and have the required authorization. Handle refusal by disabling optional monitoring or providing the approved alternative, not by hiding the listener.

Each feature is a requested product commitment but a **planned** capability until its integration tests pass. The release sequence and implementation prompt are in `prompts/13-live-call-controls.md`. API/data requirements are in `docs/20-live-call-data-api.md`. Reference tests validate only pure policy/state rules, not working telephony.


---

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


---

# 21 · Live-call topology and provider adapter decision

**Decision LC-ADR-01 · v1.1 · Proposed implementation; real-call evidence required**

## Context and selected design

Insider needs a receive-only operator path; Gavel needs an independently removable AI path and a human voice path; Audible needs a private command path; Directory needs independently controlled destination attempts. A shared logical call must outlive the replacement of an AI, monitor, human or destination participant.

Use a **conference-first topology for Live Call Controls-enabled calls**. Do not have the caller's single call leg execute `<Connect><Stream>` and `<Dial><Conference>` concurrently. Twilio documents a separate TwiML Application participant with `To=app:<APP_SID>`; the application can return `<Connect><Stream>` for its own AI leg. This supports a candidate topology without an extra self-dialed public phone number. [LC01–LC05]

```text
External caller ─── caller leg ─── Twilio Conference ─── human / target leg
                                        │      │
                               muted monitor   independent AI app participant
                                      leg      (TwiML Application)
                                                       │
                                                <Connect><Stream>
                                                       │ WSS
                                              Redial voice gateway
                                                output/input gates
                                                       │
                                                  xAI session

Audible composer ── authenticated API ── command owner ── AI adapter
Directory UI/AI tool ── authorized route command ── dial/consult/bridge worker
```

This diagram is an architecture proposal based on provider documentation, not a deployed design. Verify region/account support, media direction, participant IDs, codec, costs and latency on the exact configured provider account.

## Ingress and participant construction

1. Validate the inbound webhook signature and derive workspace/line from the authorized number mapping. Create the logical call, policy snapshot, consent state and topology version.
2. Perform required pre-call disclosures/consent steps before admitting optional monitoring or retained recording/transcription. Never confuse a completed prompt with affirmative consent where required.
3. Generate an opaque per-call conference identifier. It is not a public password or arbitrary user-supplied name. Persist provider account, caller CallSid and conference mapping; subscribe to join/leave/mute/hold/start/end events.
4. Put the caller in the conference and idempotently create one AI application participant. The participant's app parameters contain a short-lived opaque session reference, not raw caller data or reusable credentials. Validate the TwiML app callback signature and server-side mapping before returning streaming TwiML.
5. The AI participant's stream uses an authenticated WSS endpoint and nested stream parameters. `<Stream url>` does not accept query strings; its `<Parameter>` mechanism is different from TwiML Application destination parameters. [LC10]
6. Establish the xAI session with the selected verified format; map provider events; admit the AI audio path only when the correct caller/AI conference state is confirmed. Keep AI controls/cost bounded.
7. Set lifecycle flags deliberately: monitors, AI and outgoing replacement participants must not end the conference when leaving. Caller departure should trigger cleanup of remaining legs through reconciled state; do not depend only on a browser event. Twilio documents that `endConferenceOnExit=true` ends the conference for everyone. [LC02]

Treat conference creation/start and joining as asynchronous. The first participant can be waiting rather than in an active mixed conversation. Use bounded setup timeout and a deterministic provider-side fallback; do not promise callers that a silent wait is a connected AI.

## Audio path rules

The conference AI participant receives the other permitted participants' mixed audio; validate no unwanted self-echo and do not assume this track identifies speakers individually. The AI's transcript covers only the permitted AI phase, not automatically the entire post-Gavel human call.

Conference mute prevents AI output but does not by itself prevent the AI from receiving others. For Gavel privacy, close the gateway input gate and remove the AI participant/close its session. For Insider silence, provider-side mute and authorization block observer speech. For Audible privacy, never convert raw guidance into media or a caller message. For a private consultation, isolate the destination before briefing it.

Twilio Media Streams bidirectional transport exposes the inbound track and supports sending media, mark and clear messages; it is not a universal multi-track conferencing API. Keep stream IDs tied to the appropriate participant and fencing epoch. `clear` removes queued playback but cannot recall audio already heard. [LC03, LC04]

The selected xAI documentation verifies instructions and text input but this review did not establish every cancel/truncate message by name. Implement a provider abstraction `stopGeneration()` with an evidenced mapping when supported. Gavel's hard barrier must still work by closing output/input gates, clearing transport buffers and removing the AI, even when model cancellation is not acknowledged. [LC08]

## Provider adapter capabilities

Store capabilities per provider **and per connection/topology**, not as a single universal Twilio=true badge:

| Capability | Needed for | Evidence before enablement |
|---|---|---|
| `conference_ai_participant` | All four in shared topology | AI app participant joins, streams and leaves without ending caller |
| `listen_only_participant` | Insider | Both directions audible to monitor; its speech inaudible |
| `hard_ai_detach` | Gavel | Output cleared, input removed, session closed, caller survives |
| `human_endpoint` | Gavel | Actual two-way speech with supported web/native endpoint |
| `text_guidance` | Audible | Session-bound delivery and truthful acknowledgement |
| `interrupt_guidance` | Audible optional timing | Measured interruption plus stale-playback prevention |
| `saved_phone_transfer` | Directory | Ring/accept/bridge/failure cleanup |
| `custom_phone_transfer` | Directory custom numbers | Human approval, spend/loop checks and evidence |
| `extension_transfer` | Directory extensions | Tested approved IVR sequence and recipient acceptance |
| `warm_brief_and_accept` | Directory warm transfer baseline | Brief not heard by caller; accept/decline works |
| `warm_live_consultation` | Optional advanced transfer | Separate media isolation and return-to-caller test |
| `sip_or_queue_transfer` | Directory enterprise routes | Connector-specific interoperability and continuation behavior |

A basic carrier forwarding configuration only delivers the inbound call. It does not establish these capabilities or direct access to the carrier account. A non-Twilio adapter must pass equivalent tests and may support only a subset.

## Directory implementation patterns

### Standard phone/internal-user transfer

Resolve the destination into a server-owned endpoint. An outbound target leg is created with idempotent operation tracking and a defined timeout. For a warm brief, keep it outside the caller mix, play the approved minimal summary, gather deliberate acceptance, and only then join the caller conference. If a target was already created within a conference, hold/mute it before any private exchange and prove isolation; “muted” alone does not stop it hearing the conference.

### Extension transfer

Conference Participants creation does not document a `sendDigits` option in the reviewed schema. Use the supported outgoing Call `SendDigits` path or `<Dial><Number sendDigits>` path, with a trusted pre-join flow or connector that leads into the caller's conference after dialing the extension. The exact bridging approach must be proven in the implementation spike; do not add fictitious SDK arguments. [LC01, LC06, LC07]

Maintain base number, extension and dial sequence as different fields. A switchboard answer and a completed DTMF send are not sufficient to mark a transfer accepted. Use target acceptance or a documented destination-specific policy, and expose voicemail/uncertain outcomes honestly.

### SIP and externally released transfers

Configured SIP routes need domain allowlists, transport/authentication, codec and ingress checks. A SIP REFER may release Redial's media control; model this as `transferred_out`, close remaining monitor/AI sessions and disable unavailable controls. Do not imply a terminated Redial bridge can still listen or take over an external PBX call. [LC11]

## Control ownership and recovery

The voice gateway owns real-time input/output. A serialized call coordinator owns participant changes. Postgres stores operation state, version/epoch and an outbox. Use direct bounded command delivery to the active coordinator, not a slow campaign queue for Gavel. Each worker checks the latest fencing epoch immediately before external effects.

Database transactions are not distributed provider transactions. Acknowledge requests with operation IDs; record desired state; call provider; reconcile observed state; publish completion only when the invariant is proven. Handle crash after a provider change but before the local commit. Do not redial because an HTTP client retried.

On provider/API uncertainty, keep the least-privileged audio state and use a bounded fallback. If an AI is already muted and detached, do not optimistically unmute the human before verifying the destination is the correct participant. A stale worker cannot resurrect ended calls or old AI sessions.

## Cost and rollout

Conference participant duration, TwiML application-leg usage, Media Streams, inbound/outbound legs, observer paths and AI sessions may produce separate provider costs. Reconcile actual usage records for this topology before applying the earlier screening-only cost estimate. Keep customer meters distinct from provider-cost ledger entries to avoid charging the same second multiple times as separate unnamed fees.

Roll out to controlled test lines first. Proposed order: conference+AI baseline → Insider → Gavel → Audible → saved/custom Directory → extension/brief-and-accept → mobile device validation → SIP/groups/advanced consultation. Keep each capability off until its evidence is recorded. No live phone or provider configuration was changed by this documentation update.


---

# Redial · Live Call Controls content

**Draft copy for v1.1.** Publish capabilities as available only after their provider/device and privacy gates pass. These are proposed product descriptions, not evidence of a launched feature. Keep existing pricing unchanged pending a commercial decision.

## Shared website section

**Eyebrow:** LIVE CALL CONTROLS

**Headline:** Your agent answers. You stay in control.

**Subheading:** Listen to the conversation, step in yourself, guide your agent privately, or connect the caller with the right person—all from one Redial call workspace.

**Availability note:** Available on supported Redial call connections. Feature access, device support and provider usage vary by plan and configuration.

**Primary CTA:** Explore live call controls

## Insider · /features/insider

**Eyebrow:** INSIDER · LIVE LISTENING

**Headline:** Hear the conversation. Without interrupting it.

**Description:** Listen to your agent and caller in real time while your microphone stays out of the conversation. Stay informed, send a direction with Audible, or use Gavel when you are ready to speak.

**Card copy:** Listen live while your agent handles the conversation.

**Button:** Insider · Listen live

**Active state:** Listening live · Your microphone is not sent.

**Exit:** Stop listening

**Note:** Authorized access and the applicable monitoring notice/consent policy apply. Listening does not automatically save a recording.

## Gavel · /features/gavel

**Eyebrow:** GAVEL · CALL TAKEOVER

**Headline:** When it is your call to take, take it.

**Description:** Move from AI assistance to a direct conversation with your caller. Redial prepares your connection, stops the agent and hands the call to you without asking the caller to dial again.

**Card copy:** Stop the agent and take over the conversation.

**Button:** Gavel · Take over

**Pending states:** Preparing your connection… / Silencing agent… / Connecting you…

**Success:** You are speaking · Agent disconnected.

**Failure before handoff:** We could not connect your device. Your agent is still handling the call.

**Failure after AI detachment:** Your connection was interrupted. The caller is in the configured fallback.

**Note:** Handoff depends on a ready, supported calling endpoint. Do not publish “instant,” “zero latency” or “never drops a call” claims.

## Audible · /features/audible

**Eyebrow:** AUDIBLE · PRIVATE AGENT GUIDANCE

**Headline:** Guide the call without joining the conversation.

**Description:** Send your agent a private direction while the call is happening. Ask for a detail, suggest a callback time or point the conversation toward the right next step.

**Card copy:** Message your agent with real-time call direction.

**Button:** Audible · Guide agent

**Composer label:** Private direction to your agent

**Placeholder:** Ask which project they are calling about…

**Helper text:** This goes to your agent, not directly to the caller. The agent may use it in its response. Do not include secrets.

**Default timing:** Next turn

**Send label:** Send direction

**Acknowledged label:** Agent connection acknowledged receipt—not confirmation of action.

**Unavailable:** The agent is no longer on this call.

## Directory · /features/directory

**Eyebrow:** DIRECTORY · SMART CALL TRANSFERS

**Headline:** Get callers to the right person.

**Description:** Give your agent a clear path to the people who can help. Transfer to saved phone numbers, approved custom numbers, internal users and supported extensions or phone systems, with hours, confirmation and fallback rules you control.

**Card copy:** Connect callers to approved numbers, people and destinations.

**Button:** Directory · Transfer

**Search:** Search people, teams, numbers or extensions…

**Custom-number action:** Enter a one-time number

**Confirmation:** Transfer this caller to {destination_label} at {formatted_number} using {transfer_method}?

**Warm option:** Brief the recipient and ask them to accept before connecting.

**No answer:** No one accepted. Choose another approved destination or take a message.

**Unsupported extension:** This extension has not passed its routing test yet.

## App onboarding

**Title:** Meet your live call controls

**Body:** Use Insider to listen, Gavel to take over, Audible to guide your agent, and Directory to connect the caller. Available controls depend on this line's permissions and tested connection.

**CTA:** Open the demo console

Demo label must remain visible; no real calls or messages are placed by starting the demo.

## FAQs

**Will the caller hear me while I use Insider?**
Your microphone is excluded from the conversation while you listen. Monitoring still follows the line's access and notice/consent settings.

**What happens to the AI when I use Gavel?**
Once your connection is ready and the handoff completes, Redial disconnects the agent from the conversation. The agent does not keep listening by default.

**Is Audible a text message to the caller?**
No. It is a private direction to the active agent. The agent may use your direction in what it says or does, so do not send sensitive secrets.

**Can Directory call a custom number?**
An authorized member can request a one-time destination after confirmation and routing checks. The caller and AI cannot independently bypass the approved destination policy.

**Can I transfer to an extension?**
Supported extension routing uses a main phone number or compatible phone system. Each route needs a working dial sequence and test before it is offered as available.

**Does this work with any mobile call?**
The call must reach a supported Redial connection. Installing the app does not let Redial control every ordinary carrier call.

## Release announcement draft

**Subject:** Meet Insider, Gavel, Audible and Directory

**Preheader:** Four ways to stay in control while Redial handles the call.

**Body:** Your agent can handle the conversation without taking you out of the loop. With Redial Live Call Controls, use Insider to listen live, Gavel to step in, Audible to send a private direction, and Directory to connect the caller with the right person. Open an eligible active call to see the controls available on your connection.

**CTA:** Explore your call controls

Send only after release to an appropriate audience with required email consent/preferences. Do not announce a capability as launched merely because this draft exists.


---

# Live Call Controls · source register

Reviewed September 18, 2026 (America/Phoenix). These primary-provider sources support technical design choices. They do not certify a working Redial integration, lawful monitoring in every jurisdiction or provider prices. Earlier W-series sources are retained in `sources.md`; only the LC sources were revisited for this update.

## LC01 · Twilio — Conferences Participants subresource

https://www.twilio.com/docs/voice/api/conference-participant-resource

Participant mute/hold/update and phone/SIP/client/app endpoints; does not prove Redial implementation.

## LC02 · Twilio — TwiML Conference

https://www.twilio.com/docs/voice/twiml/conference

Muted participant semantics, lifecycle flags and conference callbacks.

## LC03 · Twilio — Media Streams overview

https://www.twilio.com/docs/voice/media-streams

Bidirectional inbound-track and single-stream limits; outbound DTMF not supported on bidirectional stream.

## LC04 · Twilio — Media Streams WebSocket messages

https://www.twilio.com/docs/voice/media-streams/websocket-messages

Media playback buffering, mark and clear controls. Not a guarantee of zero residual network audio.

## LC05 · Twilio — AI agent through a TwiML Application conference participant

https://www.twilio.com/en-us/blog/developers/tutorials/product/connect-twiml-app-twilio-conference

Conference-first AI application participant architecture; reviewed with official help article on Connect Stream.

## LC06 · Twilio — TwiML Number

https://www.twilio.com/docs/voice/twiml/number

sendDigits extensions, pre-bridge instructions and call progression semantics.

## LC07 · Twilio — Make outbound phone calls

https://www.twilio.com/docs/voice/tutorials/how-to-make-outbound-phone-calls

Outgoing Call SendDigits and timing; verify final SDK/schema and IVR interaction before use.

## LC08 · xAI — Speech to Speech

https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech

Session instructions, text conversation input, tool result flow. This review did not verify every cancel/truncate event.

## LC09 · Twilio — Recordings resource, legal considerations

https://www.twilio.com/docs/voice/api/recording

Recording consent and legal-review caution; not a complete analysis of silent live monitoring law.

## LC10 · Twilio — TwiML Stream

https://www.twilio.com/docs/voice/twiml/stream

Blocking stream behavior and nested custom parameters; Stream URL does not support query parameters.

## LC11 · Twilio — TwiML SIP

https://www.twilio.com/docs/voice/twiml/sip

SIP routing and connector-specific configuration; not proof of arbitrary PBX compatibility.

## LC12 · Twilio — Bidirectional conference streams through a TwiML app

https://help.twilio.com/articles/45314613523867

Official help text describes Conference Participant app endpoint with Connect Stream; full page rendering requires JavaScript.

## LC13 · Twilio — TwiML app conference support announcement

https://www.twilio.com/en-us/changelog/added-support-of-adding-a-twiml-app-directly-to-a-conference

October 6, 2025 announcement of app:<APP_SID> participant support; does not confer product readiness.

## Unverified items

No real live call, mute/unmute, audio cancellation, xAI guidance delivery, extension routing, mobile build or provider bill was tested. The exact xAI cancellation mapping remains an adapter verification task. No current price research was performed for this update; the existing catalog is unchanged and conference costs require a new pilot reconciliation.

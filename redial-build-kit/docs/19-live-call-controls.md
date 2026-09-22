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

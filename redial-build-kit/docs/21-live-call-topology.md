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

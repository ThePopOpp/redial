# Build prompt · Redial Live Call Controls

Use this prompt to extend the existing Redial VS Code project. It adds a feature set; it does not authorize production deployment, live dialing, new charges or changes to other company repositories.

---

Implement **Redial Live Call Controls** using the existing Next.js, TypeScript, shadcn/ui, Supabase, Twilio, xAI, Square and Coolify architecture. Preserve the four exact feature names:

**Insider** — authorized silent live listening to the AI agent and caller.
**Gavel** — an authorized human takes over the existing call and the agent is stopped and removed.
**Audible** — private text guidance delivered to the active AI session during a call.
**Directory** — agent/member transfers to authorized saved or one-time custom phone numbers, extensions, internal users, departments and compatible SIP/PBX routes.

Read `redial-build-kit/README.md`, `AGENTS.redial.md`, `docs/19-live-call-controls.md`, `docs/20-live-call-data-api.md`, `docs/21-live-call-topology.md`, `contracts/live-call-controls.ts`, `configuration/live-controls.proposed.json`, `automation/live-call-controls-skill.md` and `research/live-controls-sources.md`. Also inspect existing call/routing, RLS, auth, entitlements, events, provider adapters, mobile and extension code. Do not create a second app or replace current working architecture without evidence.

## Start with an inventory

Identify the current call topology, Twilio application roles, media gateway, agent session lifecycle, provider capabilities, role/line grants, call states, observer paths, callback/transfer code, client/native SDK versions and existing tests. Record what is implemented, mocked, missing or unsupported. Read the two approved reference repositories only for proven reusable patterns. Never copy their production data, credentials, company domains or business logic.

## Architecture requirement

For calls with this suite enabled, implement a shared conference-backed logical call with independent caller, AI and human/destination legs. Twilio supports adding an AI TwiML Application via a Conference Participant `To=app:<APP_SID>`; that app supplies `<Connect><Stream>` to the gateway. Verify current documentation, account/region behavior and SDK schemas. Do not run `<Connect><Stream>` and `<Dial><Conference>` simultaneously on the same caller leg. Basic screening-only topology may coexist but must not falsely advertise this suite.

The AI, monitors and departing controllers must not terminate the conference when they leave. Derive all provider IDs and line scopes server-side. Use short-lived operation-bound endpoint tokens, signed callbacks, per-call versioning, idempotency and fencing. Media stays in the voice service, not Next.js page handlers, Supabase Realtime or an extension worker.

## Implement by evidence-gated increments

A. Add domain contracts, runtime validation, state transitions, line grants, event names and migration proposals. Reuse existing models. Add unit tests, tenant-isolation integration tests and provider-adapter fixtures. Keep all production feature flags off.

B. Build a labeled, mock-backed Live Calls console and Directory management UI using the existing Redial design. Reuse `/app/call-console/[id]`. Add the four named buttons with subtitles, participant/status panels, per-action unavailable reasons, private Audible composer and transfer destination sheet. Separate leave-monitor, leave-my-call and end-everyone actions. Keep mocks visibly separate from provider-backed operation status.

C. Prove the conference+AI baseline on an owner-authorized test line. Validate media direction, start/stop, AI detachment, fallback, lifecycle events and costs before adding user media.

D. Implement Insider with a provider-enforced listen-only role. The user's microphone must not reach either caller or AI. Revoked membership must terminate existing monitor access. Leaving Insider must leave the original call running. Do not silently enable call recording.

E. Implement Gavel as a single serialized transition: prepare muted human endpoint → verify deliberate acceptance/readiness → fence AI output and tools → stop AI input → clear buffered playback → detach the AI participant → verify provider state → unmute the one winning human → publish completion. Disable raw unmute bypasses. If already listening, reuse the participant when supported. Failure before readiness keeps AI handling; failure after AI detachment uses bounded fallback, not an undisclosed AI reconnection. Do not claim zero interruption or undo audio already played.

F. Implement Audible with authenticated current-agent-session-bound messages, proposed 1,000-character maximum, server sequence, next-turn default and expiry. Preserve base instructions. Distinguish queued/submitted/acknowledged from actually observed behavior. Do not speak the raw message, masquerade as caller speech, send it by SMS or allow it to change privileges. Optional interrupt mode needs a verified adapter. Test against the selected xAI schema; do not assume undocumented cancel/truncate events.

G. Implement Directory: save/test/version destinations, line permissions, individual phone and internal-user transfer first; then a deliberate one-time custom-number flow. Add ring/accept/bridge/fail/cancel states, minimal private brief-and-accept, hours and fallback, spend caps and route-loop prevention. The agent calls a scoped Directory tool with destination IDs, not arbitrary URLs or unaudited numbers. Custom dialing requires separate permission and an action-bound confirmation. Extensions store a base phone and DTMF route separately. Use supported Call/Number DTMF APIs, not fictitious Conference Participant `sendDigits` fields or synthesized speech. Test actual PBX/IVR behavior before enabling extensions/SIP/groups.

H. Add authorized business-dashboard metadata and permissioned support access, content/feature pages, entitlement configuration and separate provider cost segments. Keep prior monthly/annual prices and existing quotas unchanged; do not silently enable new billing or overages.

I. Add native mobile control screens and device-tested audio where supported. In the Chrome extension, Audible/Directory can use APIs; Insider/Gavel initially open the web console. Do not run persistent call audio in the MV3 service worker. Keep absent native or extension capabilities visibly unavailable rather than mocked as working.

## Verification

Cover wrong tenant/line; no audio grant; expired/revoked token; both sides heard by Insider with no microphone leak; duplicate sessions; two Gavel requests; transfer-versus-Gavel conflict; queued AI speech after Gavel; AI hearing human audio after removal; stale AI tool call; Audible targeted at old agent; premature acknowledgement; injected privilege escalation; caller-provided transfer number; extension reaches voicemail; busy/no answer; loop through fallback; caller hangup during transition; provider timeout after side effect; failed/late callback; user disconnect; all leg cleanup; account usage reconciliation; mobile lock/background/network switch; extension worker suspension.

Use the shipped isolated reference tests as examples only. Passing them does not prove live media, RLS, Square, native apps or legal compliance. Add real integration tests in the application and record evidence.

Begin with the inventory and smallest reviewable A/B increment. Do not attempt all increments in one uncontrolled change. Report changed files, commands actually run, tests passed/failed, required configuration, untested paths and the next gate. Never present a simulated call as a successful production integration.

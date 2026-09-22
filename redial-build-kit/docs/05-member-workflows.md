# 05 · Member workflows and stateful UX

## Signup → verified activation
1. Visitor chooses a connection goal: use a new Redial number, forward calls from an existing mobile, or bring a programmable provider.
2. Compatibility questionnaire records country, carrier, device/OS, plan type, forwarding mode and intended answering endpoint. Unsupported paths are not silently accepted.
3. Create a verified account and private workspace. Select a plan; show external costs before requesting payment. Free/BYO never means free provider usage.
4. Record billing terms and optional communications consents separately. Process Square enrollment; keep “payment pending” distinct from “service ready.”
5. Verify number ownership and the ability to control the route. Allocate or connect a number once, with a per-account provisioning cap and cleanup of abandoned reservations.
6. Configure a destination that will not forward back into Redial. Use a browser/app endpoint or separately verified non-forwarding number.
7. Configure greeting, processing/recording preferences, screening mode, fallback and notification preferences. Supply a safe default script.
8. Run a test call with an explicit confirmation inside the logged-in app. Test success and failure destinations. Record the tested configuration version.
9. Enable the route and show **Ready**, **Limited**, **Paused**, **Needs setup** or **Degraded** based on evidence—not only a boolean toggle.

A checkout completed before a failed setup requires a clear refund/support route. Avoid charging a customer for a capability the compatibility wizard already knows is unsupported.

## Incoming call → decision
Normalize the delivered metadata; authenticate the provider; map tenant/line; load a policy snapshot; check configuration, budgets and denial rules. A caller name, number match, carrier label or claimed urgency is a signal, not proof of identity or legitimacy.

In front-door mode, the rules can decide whether to screen before ringing the permitted destination. In conditional-forwarding mode, the user's phone may already have rung, and Redial acts only on calls the carrier forwards. The UI must display this distinction alongside the selected mode.

The voice assistant discloses its role and follows the configured legally reviewed audio-processing notice/consent flow. It gathers name, purpose, a callback number when needed and a concise message. Low confidence produces a qualified label and a safe fallback rather than a definitive fraud allegation.

## Call detail → action
Provide timeline, summary, caller-provided information, policy reason and supported transcript/recording access. Mark inferred facts separately from caller statements. Actions: mark unread, label/correct, create callback, save minimal contact, allow/block, request deletion and download permitted content. A block should require confirmation and have an undo path.

Call back opens a verified, human-operated calling flow or a device dialer. It must show which number will be presented, cost/usage impact and selected line. Do not create an unattended AI outbound call from a generic “callback” button.

## Callback scheduling
Collect date, time, timezone, optional time window, assignee, note and notification method. Store instants in UTC plus the intended IANA timezone. Display correctly through daylight-saving transitions. At execution, re-check membership, consent, number and plan. A callback task is a reminder unless explicitly designated and approved as an automated action in a later release.

Calendar integrations use least-privilege authorization. First release can create internal callback tasks without a calendar vendor. Calendar write support later requires duplicate-event prevention, update/cancel reconciliation, external IDs and conflict handling.

## Screening rule editor
Preview a matrix: trusted contact, blocked number, unknown caller, unavailable caller ID, caller-claimed urgency, outside hours, provider degraded and quota exhausted. Explain precedence before activation. Persist a versioned draft, validate route compatibility, then publish atomically. Existing calls keep the policy snapshot they started with.

Pause means stop AI screening and use the configured safe fallback. It does not automatically disable mobile-carrier forwarding. Show a prominent forwarding reminder and device-specific reversal instructions when appropriate.

## Household invitation
Owner purchases a household plan and invites an adult by email. Invitee verifies identity, accepts membership and chooses how much line access to share. Billing owner can see seat/line counts and spending, not conversation text by default. Each person retains privacy settings and can revoke content access. Owner removal of a member triggers a clear line/number ownership and billing transition, not silent loss of calls.

## Support and delegated access
Members can create tickets without granting transcript access. A separate, time-limited grant specifies the line/call, purpose and staff role. Staff must supply a reason to use it. Every access is logged and visible to the member. Expired grants stop downloads and agent retrieval, not just UI links.

## Cancellation and offboarding
Cancellation is available without a retention maze. Show effective billing end, refund policy, data export/retention, active forwarding destinations and number ownership. Save the request and execute the supported provider cancellation operation idempotently. Keep paid access through the recorded period unless the owner chooses an immediate termination supported by policy.

Before releasing any Redial number, provide repeated notice, forwarding reversal guidance and an authorized port/retention choice. Do not strand calls merely because a renewal failed. Keep bounded, clearly disclosed routing grace with abuse controls; its duration is an owner policy. Account deletion removes nonrequired personal data after legal retention and safety checks, while minimal financial/audit evidence may have a separate legally reviewed retention period.

## v1.1 · In-call member workflows

From an eligible live call: Insider joins listen-only and leaves without ending the original call; Gavel prepares a connected endpoint, silences/removes AI and then permits human speech; Audible queues private directions scoped to the current AI session; Directory connects approved targets with actual accept/bridge confirmation and fallback. Insider does not automatically grant Gavel or transcript access. Gavel stops AI listening by default. A stale push/deep link rechecks call state and authorization. Failed handoff/transfer never silently triggers unapproved dialing or AI reconnection. See docs 19–21.

# M3 · One real telephony path


Read telephony, policy, API and security specs. Build a separate voice gateway with one Twilio transport and one xAI voice adapter using current official documentation and the pinned compatible SDKs. Validate signed ingress/WSS, map the provider account/number to a line, apply a versioned policy/consent/budget, and record lifecycle events. Do not trust client-supplied verification flags.

Use a dedicated approved test number. Implement message-taking first with a deterministic fallback, outbound-destination restrictions and loop protection. Verify audio encoding/framing, barge-in/buffer clearing, disconnects, no-speech and bounded duration. Do not implement “listen in” or universal transfer using an assumed topology. Prove the actual call-control sequence before enabling it.

Persist a useful summary and show it only to permitted line readers. Reserve/reconcile usage for the real model session and every call leg. Record actual test IDs, estimated versus provider cost, and any unmet consent or transport requirement.

Acceptance: successful real inbound message plus tested failure paths; no loop; bounded cost; private inbox; no false claim that conditional forwarding screens all unknown cellular calls.

## v1.1 integration dependency

Read `prompts/13-live-call-controls.md` and docs 19–21. Include Insider (silent listening), Gavel (stop agent/takeover), Audible (private direction) and Directory (approved destinations) in this surface's implementation plan. Preserve their permission/media boundaries and truthfully gate unsupported providers/devices. Existing billing prices are unchanged; no feature is considered working merely because its UI exists.

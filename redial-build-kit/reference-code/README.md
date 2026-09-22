# Isolated policy example

This folder contains dependency-free JavaScript to demonstrate one deterministic routing decision boundary. It is **not** a telephony bridge, caller identity verifier, billing system, RLS implementation or production authorization service.

Run from this folder with a supported Node.js version:

```bash
node --test policy.test.mjs
```

`decideCall(context)` accepts facts that production server code must independently establish. Never trust client-supplied `transportVerified`, `ownershipVerified`, contact matches, budget or destination flags. It does not perform signature checks, database queries or provider requests. It emits a requested action; a separately authorized executor must revalidate state and execute it exactly once.

The `fallback` action is deliberately abstract. Resolve it only to a previously approved, bounded, no-AI route. It does not grant permission to record or transcribe a call. A route cycle never returns `ring_member`. The example illustrates an explicit VIP override and does not treat caller-claimed urgency as authority.

The included tests cover only these pure functions. They do not establish that Twilio, xAI, Square, native apps, provider fallback or the VPS is correctly configured.


## v1.1 · Live Call Controls reference

Run `node --test reference-code/live-controls.test.mjs` from the build-kit folder. The module `live-controls.mjs` is a pure, dependency-free demonstration of trusted-input authorization gates, handoff sequencing, audio/tool fences, guidance state and Directory checks. It performs no provider, database, media, microphone or network operations. Production must independently derive/validate all context, enforce RLS, implement idempotency/leases and verify observed provider state.

Do not wire the exported functions directly to untrusted request JSON. Passing these tests is not proof of a working Insider/Gavel/Audible/Directory integration.

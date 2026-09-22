# Redial build kit change log

## v1.1 · September 18, 2026 · Live Call Controls

Owner-requested additions: **Insider**, **Gavel**, **Audible** and **Directory**. The exact names and core functions are preserved.

Added detailed product requirements, provider topology, data/API/permission contracts, per-feature acceptance cases, website/onboarding/launch copy, an agent skill, IDE implementation prompt, disabled feature configuration and typed contracts. Updated affected architecture, route, member, staff, billing, security, mobile/extension, roadmap and master-start documents. Added isolated control-policy reference tests. Regenerated the combined blueprint and HTML documentation reader.

### What changed architecturally

Full-suite calls use the proposed conference-first topology with an independent AI application participant. Insider is provider-muted monitoring. Gavel prepares the human, fences AI audio/tools and removes AI input/output before completing handoff. Audible is private text guidance with truthful delivery status. Directory resolves approved endpoints and includes custom-number confirmation, extension routing, warm brief-and-accept, fallback and cost/loop controls.

### What did not change

No monthly/annual price or base usage allowance was changed; the original plan JSON is preserved. No real app, database, call, payment, provider configuration, repository, domain or VPS was modified. Original Claude Design references are unchanged. The additions are specifications and pure reference tests, not production integrations. Existing research was retained; the new LC-series provider documentation was reviewed specifically for this update.

### Applying the update

The complete v1.1 ZIP replaces the **documentation build-kit folder only**, not the Redial application. If the local `redial-build-kit` folder has been edited since v1.0, compare changes using the source v1.0 files and the included v1.1 manifest; merge local edits instead of blindly overwriting. Keep a backup. Do not copy the top-level kit over the application's `app`, `src`, migrations, .env or package files.

The separate Live Call Controls Markdown is a standalone reading copy of docs 19–21. The focused build prompt is `prompts/13-live-call-controls.md`. The master blueprint assembles the entire updated specification. Shared TypeScript interfaces and reference JavaScript are intentionally not installed into the live app by this delivery.

### Validation status

See `qa/README.md` and validation JSON for commands actually executed. The reference state tests are not evidence of real mute, transfer, native audio, RLS or deployment behavior.

# Independent QA and security review


Act as an independent reviewer, not the implementation agent. Compare code and behavior against `docs/15-security-and-launch-gates.md` and `docs/18-roadmap-and-acceptance.md`. Run tests when tools/environments permit and explicitly list unrun checks.

Attempt cross-tenant reads/writes, role escalation, invitation abuse, unauthorized recording/export access, webhook replay, idempotency conflict, out-of-order billing events, double charge/refund, number release on cancellation, call-routing cycles, unbounded AI/phone spend, malicious extension messages and prompt-injection tools. Verify household payer versus transcript access and campaign suppression immediately before sends.

Report severity, concrete reproduction/evidence, affected files/flows, likely impact and minimal remediation. Check mobile/extension capability and store claims against actual tests. Scan user-facing copy for invented statistics, unsupported carrier support and “unlimited” economics. Confirm active production agents cannot access root/Docker/secrets by default.

Acceptance: prioritized findings with reproducible tests, no unsupported certification, and a release recommendation tied to actual evidence.

## v1.1 integration dependency

Read `prompts/13-live-call-controls.md` and docs 19–21. Include Insider (silent listening), Gavel (stop agent/takeover), Audible (private direction) and Directory (approved destinations) in this surface's implementation plan. Preserve their permission/media boundaries and truthfully gate unsupported providers/devices. Existing billing prices are unchanged; no feature is considered working merely because its UI exists.

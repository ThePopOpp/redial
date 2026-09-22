# Member workflows and usable controls


Implement the member-workflow specification against real APIs. Complete compatibility-first onboarding, ownership verification, route test, policy simulator/publish, inbox/detail, corrective labels, contacts/list management, callback date/time/timezone and privacy/notification controls.

Expose route/capability constraints at the point of action. Unknown mode and Every call mode must follow the documented precedence rather than contradictory “contacts always bypass” text. Pausing AI must explain whether carrier forwarding remains enabled. No access-code scripts, silent recording or unverified urgency transfer.

Household controls must separate payer/admin/member/line grants. Support access is time-limited and scoped. Cancellation/offboarding includes number/forwarding/export steps. Use actual state transitions with versions and error handling—not toasts that pretend a command succeeded.

Acceptance: full new-member path, real backend changes, permission and stale-state tests, responsive screens and truthful fallback/status copy.

## v1.1 integration dependency

Read `prompts/13-live-call-controls.md` and docs 19–21. Include Insider (silent listening), Gavel (stop agent/takeover), Audible (private direction) and Directory (approved destinations) in this surface's implementation plan. Preserve their permission/media boundaries and truthfully gate unsupported providers/devices. Existing billing prices are unchanged; no feature is considered working merely because its UI exists.

# Redial project instructions

Read `redial-build-kit/AGENTS.redial.md`, `01-BUILD-ORDER.md` and the relevant numbered docs. Use the complete v1.1 scope, including Insider, Gavel, Audible and Directory. Current evidence and remaining gates are in `docs/`; M1 is not complete.

- Inventory and preserve existing work before editing. This workspace initially had no Git repository. Do not claim commits or cleanliness without checking.
- Keep all `redial-build-kit/` originals unchanged. `npm run verify:kit` compares all 92 files with the initial hashes. Working decisions, provenance and evidence belong outside the kit.
- Approved business repositories are read-only references. No source-company code was imported; confirm ownership/licenses and record provenance before future imports.
- Use pinned npm dependencies and the lockfile. Keep the documented ESLint compatibility limitation visible until resolved.
- `/demo` is public synthetic data, never a login or a fallback for failed real data. `/app` and `/ops` remain closed until verified server identity, current workspace membership, and separate staff role + MFA are implemented. Never authorize through client state or user-editable metadata.
- Voice sockets and call coordination belong in a separate persistent gateway, not Next page handlers. Workers own asynchronous durable jobs. Line permissions, consent, capabilities, quotas and provider evidence gate live controls.
- Household billing owner is not a content/audio grant. Insider silence is provider-enforced. Gavel must detach AI input/output/tools. Audible is private current-session guidance. Directory uses approved destinations and separately approved custom dialing. No production enablement from a fixture or UI click.
- No live charges, real test dialing, forwarding changes, campaigns, number provisioning/port/release or production deployment without specific authorization. Current scope includes a password-protected development deployment on the owner's Coolify VPS; see `docs/DEVELOPMENT-DEPLOYMENT.md`. This does not authorize production activation or bypass the M1 identity gates.
- Run lint, typecheck, build and relevant browser/reference checks. Browser tests require a build first. Keep stage evidence truthful; never substitute reference tests for RLS, live audio, commerce or native-device evidence.

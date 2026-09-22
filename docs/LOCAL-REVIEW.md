# Local review build

Expanded in response to the request to build the project and start a dedicated local review server. The original kit and the first increment were inventoried before expansion; the starting application hashes are in `evidence/pre-review-build-baseline.json`.

## Review surface

The runnable web application includes the public site and four feature pages; member overview, searchable call inbox and detail, callbacks, screening policy editor/evaluator, assistant editor, Directory, contacts, people and line-grant review, setup wizard, connections, membership, settings, support, and responsive companion previews. Operations includes overview, customers, revenue/refunds, support replies, service readiness, capabilities, CRM pipeline, campaigns, content, assistant scopes, approvals, tasks, audit and environment settings.

These pages use real local state transitions and persistence with synthetic records. A support reply appears on the member screen; changing a campaign invalidates its earlier approval; plan review creates an illustrative ledger entry; a contact edit survives a reload. The four control simulations share one call state, so Gavel and Directory cannot both own a pending transition. Audible guidance is bound to the current AI session, expires after 60 seconds, and is excluded from the caller transcript and audit payloads. Insider departure leaves the simulated caller and AI present.

## Local architecture and limits

- Synthetic workspace route handlers expose `/api/demo/session` and `/api/demo/commands`. Strict Zod schemas reject extra authority fields and limit supported actions. Contact numbers are restricted to fictional NANP 555-01xx; addresses use `@example.test`. Do not enter real personal information in synthetic workspace free text.
- The landing form uses a separate `/api/onboarding` store for the user's own setup details. Completed submissions appear in explicitly labeled local member/admin views, scoped to this browser's submission. They are never inserted into synthetic demo records. See [ONBOARDING-HANDOFF.md](ONBOARDING-HANDOFF.md) for routes, retention, management and the remaining real-auth boundary.
- A random HTTP-only, SameSite=Strict cookie identifies a local review, not a member identity. The cookie is restricted to `/api/demo`; sessions expire after eight hours. Loopback Host checks and matching Origin are required for writes; forwarded headers do not establish trust. Microphone/camera remain disabled and all pages are noindex.
- Synthetic JSON records live under ignored `.redial/reviews/`. Atomic replacement, per-session in-process serialization, optimistic versions and bounded idempotency records prevent lost updates and duplicate replay in this **single-process local server**. This is not a distributed transaction store, tenant database or production authorization layer. Expired records become unreadable immediately and are pruned in bounded batches when new sessions open.
- `/app/*` and `/ops/*` still require real identity implementation and redirect to unavailable sign-in. `/demo/ops/*` is explicitly public synthetic operations review, never a staff authorization bypass.
- No Twilio, xAI, Supabase, Square or Resend client is configured. No provider request, payment, email, number change, carrier command, production migration or deployment occurred. No Docker daemon or development credentials were available. There is no real audio or native app/extension build; companion screens are responsive web previews.
- Prices remain the five unchanged v1.1 proposals. Simulated payments create no entitlement. Recording, real checkout, real monitoring and external campaigns remain unavailable. Domain and reference tests are not provider evidence.

## Ordered milestone status

M0 remains complete. This work broadens **M1 review surfaces**, with local workflow scaffolding that anticipates later stages. It does not bypass the original ordered acceptance gates or mark M2–M9 complete. Remaining work includes real development auth, workspace membership and staff MFA; Supabase schema/RLS/private storage and allow/deny tests; durable voice gateway/workers and real call evidence; sandbox commerce/webhook reconciliation; native/extension clients and device evidence; provider-tested controls; operational agent/sending permissions; release and independent security review.

M1 authentication is the next acceptance gate. Later provider integrations must follow the order in `IMPLEMENTATION-PLAN.md`. The user's request to build broadly authorizes local implementation, not production service changes or fabricated integration success.

## Review guide

1. Open `/demo/overview`, then search the call inbox and open a message.
2. Add an example contact or a callback; reload to check persistence.
3. Save a screening policy and evaluate caller scenarios.
4. In `/demo/live`, join/leave Insider, queue Audible guidance, advance Gavel through its two barriers, and try Directory acceptance/failure. Restart the scenario to compare outcomes.
5. Review a plan in Membership, then inspect/refund the example payment in Operations → Revenue.
6. Create a support request, reply from Operations → Support, and return to member Help.
7. Submit a campaign for review, approve it, then edit its text and observe the approval invalidation. Sending remains unavailable.
8. Open Settings to export or reset this local review.

## Running and stopping

`npm run build` creates the local optimized build. `npm run review` runs it in the foreground at **http://127.0.0.1:4317**; Ctrl+C stops that foreground process. `powershell -File scripts/start-review.ps1` starts a hidden local process after checking the port and HTTP readiness. It refuses to replace an existing listener. Pass `-Port 4318` to choose a different address. The process identity and logs are recorded in `.redial/server.json`, `.redial/server.stdout.log` and `.redial/server.stderr.log`. Verify the recorded process belongs to this workspace before stopping it. No other project's process is stopped by these scripts.

Validation results and screenshots are recorded in `evidence/local-review-results.json` and `evidence/review-*.png`; the Playwright test server uses separate port 3210 and does not deploy anything.

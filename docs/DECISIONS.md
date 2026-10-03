# Working decision log

## 2026-10-01 - The schema reset silently removed the backend role's grants

- The first real call reached the gateway, passed signature validation, and then failed with `permission denied for table phone_numbers`. The caller heard the gateway's own fallback line. `service_role` held SELECT on zero tables in `public`, while `authenticated` held it on twenty-six.
- Cause: `drop schema public cascade` on 2026-09-26. Recreating the schema restored its own ACL, which was checked at the time, but default privileges live in `pg_default_acl` keyed by role and schema, and dropping the schema deleted those rows. A stock Supabase project carries `alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role`; that is why a new table is normally reachable by the backend without any grant being written. Every table created after the reset carried exactly the grants its migration wrote and nothing more.
- It stayed hidden because `service_role` kept `bypassrls`, a cluster-level role attribute the drop could not touch, and because every member-facing path was granted explicitly and tested. The row-level-security suite proved what members and anonymous visitors could reach, and said nothing about the role the worker and the gateway actually connect as. The billing worker would have failed the same way on its first webhook.
- `202610010001_service_role_grants.sql` grants the backend role on existing objects and restores the default privileges, so a future migration does not have to remember.
- The restored defaults are deliberately narrower than stock Supabase: `anon` and `authenticated` are omitted, so a new table is closed to client roles until a migration grants it. Every migration here already grants explicitly and revokes first, and the isolated harness behind `test:database` is plain Postgres with no default privileges at all. Restoring the stock grants would make production more permissive than the thing the suite proves.
- `service_role` is now created in `supabase/tests/bootstrap.sql`, and the suite asserts the backend role can read and write what the gateway and worker need, plus a sweep that every table in `public` is readable by it. That last assertion is the one that would have caught this before a caller heard it.
- The sweep passes the table oid to `has_table_privilege` rather than a formatted name. The text form resolved a relation that does not exist in this schema; the oid form avoids search-path resolution entirely and names each offender instead of counting them, so the cause was not pursued further.
- Reset procedure, corrected: dropping and recreating `public` must restore the schema ACL, its owner, **and** the default privileges. The first two were done and verified in September; the third was missed.

## 2026-09-26 - Voice gateway, and xAI over SIP rather than a media bridge

- The owner's two production applications were reviewed as references and the findings recorded in `reuse-manifest.json`. The decisive one: their working xAI voice integration is `<Dial><Sip>` to `sip.voice.x.ai`, not a WebSocket media-stream bridge. Twilio and the assistant negotiate media directly, so no audio passes through Redial, and the packet mapping, resampling and barge-in work that kit doc 06 warns is unproven does not arise. Assistant screening became a configuration value instead of a subsystem.
- Two behaviours in those references are deliberately not carried over. Neither voice webhook validates a Twilio signature, and both default to `record-from-answer-dual`. Redial validates every webhook before reading a parameter, and recording is off unless a line enables it.
- The signed URL comes from `REDIAL_GATEWAY_ORIGIN`, never from `X-Forwarded-Host`. Behind Coolify a caller controls that header, so deriving the URL per request would let them choose the string being verified. The signature algorithm is implemented directly rather than taken from the Twilio SDK, so the gateway carries no provider dependency and the comparison is constant time.
- The gateway is a third deployment unit rather than routes in the web application. A provider webhook can reach it, which is a different exposure profile from a tier behind Supabase auth, and voice work must not be restarted by a web deployment.
- Two switches gate bridging and both default off. `REDIAL_GATEWAY_ENVIRONMENT=test` never connects a call to a real handset, and `REDIAL_GATEWAY_BRIDGE_CALLS` is separate again. With either off the gateway still answers, screens and takes a message; it simply never rings a phone. That is a deployable, useful state, and it is the one a fresh deployment lands in.
- The member must press a key to accept. Falling through on no keypress is what lets the destination's voicemail answer on their behalf and report the call as connected, which would silently defeat the entire product.
- Loop prevention is enforced twice: a trigger on `endpoints` at configuration time and again in the gateway at call time, because a route can change after setup and a provider callback confirming delivery is not evidence. A destination equal to the forwarding source, the line's own Redial number, or the caller is refused. A destination is never rung before `verified_at` is set.
- A dialled number resolving to zero rows, or to more than one, refuses the call. Routing by whichever row came back first would route by luck.
- `mode = 'ai'` without a SIP assistant takes a message rather than connecting the caller to nothing, and the database refuses to store that combination at all.
- Caller speech reaches a `<Say>` in the member's whisper, so it is stripped of control characters and angle brackets and bounded before it is ever interpolated. Without that a caller could inject TwiML by saying it.
- A caller who says nothing is still offered on. Silence is not evidence of a junk call, and treating it as one drops legitimate callers who hesitate. A low-confidence transcript is passed to the member as-is rather than acted on: the gateway does not classify.
- Routing decisions live in `services/voice-gateway/routing.mjs` as pure functions taking their inputs explicitly, so the loop guards, the accept rule and the outcome mapping are provable without a phone, a provider or a clock. A live call is the worst place to discover a routing bug.
- Evidence: 30 gateway tests including an end-to-end call driven through a real HTTP server with genuine Twilio signatures, and 103 database assertions.

## 2026-09-26 - Recovery link wording, rate limits and branded auth email

- A reported "password reset is broken" was not a fault. The auth log shows `/recover` 200 at 19:10:54, a second request refused at 19:11:08 with `over_email_send_rate_limit`, a successful `/verify` 303 plus a PKCE `/token` 200 at 19:12:33 that logged the account in, and then a second click on the same message at 19:23:11 returning `One-time token not found`. The link worked; the error came from reusing it. Two things made that hard to see, and both are fixed.
- `resetPasswordForEmail` discarded its error, so a refused request still redirected to `notice=email`, which says to check the inbox. A rate limit now gets its own notice. The wording describes the request rather than the account, so it still does not reveal whether an address is registered.
- A failed recovery exchange redirected to `/sign-in?notice=expired`, which tells someone to sign in with the password they came to replace. A recovery failure now lands on `/forgot-password` with a notice saying the link is single use and offering a new one. The non-recovery path is unchanged.
- Supabase Auth email templates are branded and kept in `docs/EMAIL-TEMPLATES.md`. They are table-based with literal hex colours and inline styles, because Outlook renders with Word's engine and no client supports custom properties. `DM Serif Display` is replaced by Georgia rather than loaded as a web font. The light palette is used unconditionally, since most clients force a light background and the dark theme inverts into something unreadable. Every template states that the link works once, which is the confusion above, met before it happens.
- Leaked password protection was recorded as an open item on the assumption it was a toggle. It is a Pro Plan feature, so it is not available on this project's current plan. Recorded as a plan decision rather than a configuration task.
- The Supabase phone provider was enabled during setup with Twilio credentials. No code path in this application uses phone sign-in, so enabling it published an unauthenticated SMS-sending endpoint on the Auth API with no product behind it. That is the standard SMS-pumping target and the charges land on the connected Twilio account. Recommended off until a phone flow is actually built and authorized.

## 2026-09-26 - Authenticator enrollment shows a QR code

- The enrollment screen printed only the base32 setup key, so every operator had to type it into their authenticator by hand. Supabase already returns `data.totp.qr_code` from `mfa.enroll`, so the QR is rendered from that. It is an inline SVG data URI: nothing is fetched, and the secret never appears in a request URL. `next/image` is deliberately not used for the same reason, and because it cannot optimize a data URI anyway.
- The setup key stays on screen beneath the QR rather than being replaced by it. A desktop authenticator cannot scan the screen it is displayed on, and that is the case where manual entry is the only route.
- `.mfa-qr` forces a light panel in both themes. A QR inheriting the dark background would render dark modules on dark and simply not scan.
- Enrollment now clears the operator's own unverified factors first. Reloading the page before verifying left one behind, and they accumulated until Supabase refused another. Only unverified factors are removed, so a working authenticator is never revoked by this path. That also makes a stable `friendlyName` safe, so the authenticator entry reads `Redial operations` instead of an ISO timestamp.
- The screen now says plainly that losing the authenticator without the setup key needs an administrator to clear the factor. There is no backup factor and no self-service recovery: every staff surface requires `aal2`, so a lost factor locks the account out of `/ops` entirely and the only fix is deleting the row from `auth.mfa_factors` with a privileged session. A second factor and a recovery path remain open work.

## 2026-09-26 - Billing schema and the worker deployment unit

- Square, not Stripe. No Stripe product ID, webhook type or customer portal appears in the schema, because Square's objects and limits are different and a Stripe-shaped design would encode assumptions Square does not honour.
- Money is integer minor units plus an explicit ISO currency in every table. There is no floating point and no bare `amount` column.
- Billing state is not access state, and the schema enforces the separation rather than describing it. `entitlements` carries its own `valid_from`/`valid_until` and is the table features read; nothing consults `subscriptions.status` to decide what a workspace may do. Provider status, internal state, entitlement interval and usage interval are four columns in three tables because they disagree routinely - an ACTIVE Square subscription is not proof the latest invoice settled.
- `subscriptions` was widened, not replaced. Migration 1's `billing_read` policy and the existing staff projections keep working untouched, which is the same reasoning that made `support_access` a redefinable function in the capability migration.
- The catalog is published, not merely present. `billing_products`, `plan_versions` and `prices` are readable by `anon`, but only rows at `availability = 'available'`, and this migration publishes nothing. The alternative - relying on the table being empty - would turn the first unapproved draft price into a public claim. `src/lib/plans.ts` stays the display-only proposal it says it is, and no price from kit doc 08 was seeded.
- Two provider constraints are check constraints rather than comments. A `free` cadence must be zero and may carry no Square variation ID, because Doorstep is an internal free entitlement rather than a $0 paid subscription. A Square-mapped price may not fall below 100 minor units, because Square's documented minimum paid subscription is one major unit.
- Seven tables carry row level security with no policy and no grant, which is the deny-all they should be: `billing_customers`, `disputes`, `billing_operations`, `usage_events`, `usage_reservations`, `webhook_inbox` and `job_runs`. They hold provider identity, risk cases, per-call meter rows and worker leases. The advisor reports each as `rls_enabled_no_policy`; that is the intended state, matching `staff_capabilities`.
- Aggregate usage is visible to the billing roles; per-call usage is not visible to anyone signed in. A billing-only member who could read `usage_events` would learn a line's call history from its meter, which is exactly what the line grant model refuses them elsewhere.
- Requesting a refund and approving one are different capabilities. `request_refund` needs `billing_write`, bounds the amount by the unrefunded balance under an advisory lock so two concurrent partial refunds cannot exceed the charge, and refuses a payment that has not settled. `approve_refund` needs `refund_approve`, which only `owner` holds, and refuses a self-approval. Approval queues a `billing_operations` row; nothing in the database talks to Square.
- `staff_customer_overview` lost its `to_jsonb(s)` subscription field. With provider identifiers now on `subscriptions`, that expression would have handed a Square subscription handle to every role holding `customer_read`, which includes `growth` and `analyst`. Both billing projections now build an explicit object, and a test asserts the handle does not appear in either.
- The worker is a separate deployment unit at `services/worker`, built from its own Dockerfile against the same pinned lockfile, and is the only unit permitted to hold `SQUARE_ACCESS_TOKEN`, `SQUARE_WEBHOOK_SIGNATURE_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. A test now asserts `check-launch-config` refuses each of those names in the web environment, so the boundary cannot be dropped silently.
- Webhook ingress moved to the worker, and that follows from the boundary rather than being a preference: verifying a Square signature needs the signature key, and the web tier may not hold it. The web tier therefore cannot accept a Square notification at all.
- The signature is computed over the exact configured notification URL concatenated with the raw request body. The URL is configuration, never rebuilt from forwarded headers, because behind Coolify a caller controls `X-Forwarded-Host` and could choose the string being verified. The body is kept as received; a test proves a JSON round trip breaks the signature.
- A signature failure is dead-lettered immediately and never retried. Forged bytes do not become valid later, and retrying would convert a forged request into repeated work.
- Claims are leases with an expiry, not booleans. A worker that dies mid-event would otherwise strand it forever. `attempts` increments at claim time, so a crash loop still reaches the retry ceiling instead of spinning.
- Two independent switches guard live commerce, both off by default. `SQUARE_ENVIRONMENT=production` refuses to start without `REDIAL_SQUARE_PRODUCTION_AUTHORIZED=yes`, so a copied environment file cannot begin charging real cards. `REDIAL_WORKER_PROVIDER_CALLS` separately gates outbound calls.
- What the worker does not do is gated, not stubbed. Creating a subscription, sending a refund to Square and granting entitlements are unimplemented; the webhook handler raises rather than returning, so an event is recorded and retried and finally dead-lettered with a reason instead of being marked processed as though it had an effect. Marking it processed is the one failure mode that would lose money quietly.
- Evidence: `test:database` covers the 16 new tables with allow and deny assertions and now runs 87 named assertions plus 46 denial branches, up from 47. `test:launch` runs 35 tests including 18 for the worker. Lint now covers `services`.

## 2026-09-26 - Supabase schema reset and the first platform owner

- The development project's public schema did not hold a partial application of `supabase/migrations`. It held an unrelated schema. Three of its six tables (`profiles`, `setup_submissions`, `feedback`) are created by no migration in this repository; `lines` and `workspace_records` were absent; `platform_staff.role` permitted `administrator|support` and `memberships.role` permitted `owner|member`, matching neither migration 1 nor the capability migration. The migration ledger held one entry, `20260925223848 account_access`, matching no filename here. This is recorded because it changes the remedy: nothing in `supabase/migrations` had ever run against this project, so the failure was not a transaction boundary lost to the SQL editor's statement-at-a-time auto-commit, and resuming was appending to a schema that was never ours.
- Reset rather than reconciled. Every one of the six tables held zero rows, and `auth.users` lives in a separate schema that the drop does not touch, so there was no data to weigh against a clean slate. Reconciling by hand would have left column and constraint drift that no test could see.
- A `ddl_command_end` event trigger, `ensure_rls`, backed by `public.rls_auto_enable()`, existed in the project and in no migration. It was dropped explicitly before `drop schema public cascade`, because the cascade would otherwise remove the function while the trigger was still armed for that same statement. It was not recreated: an RLS safety net that exists only in one project makes that project diverge from CI, the isolated `test:database` harness and every fresh environment, and each migration enables row level security on its own tables explicitly. `supabase/tests/permissions.sql` remains the guard that actually runs.
- `public` was recreated owned by `pg_database_owner`, not by `postgres`, with the stock Supabase grants including `usage` to `PUBLIC`. Creating it under `postgres` would have diverged from a stock project's ACL for no benefit.
- The five migrations were applied one `apply_migration` call per file, in filename order, each in its own transaction. The `begin;`/`commit;` wrapper inside each file was stripped in transit and left unchanged on disk, since the migration API supplies the transaction and an inner `commit;` would end it early. Result: 14 tables, row level security on all 14, 33 `staff_capabilities` rows, 10 `private` functions, and `npm run test:database` green at 47 assertions against the same files.
- The standing `public.rls_auto_enable()` advisory is closed, and was a false positive besides. A function declared `returns event_trigger` cannot be invoked outside event-trigger context whatever the grant: `select public.rls_auto_enable()` fails with `0A000: trigger functions can only be called as triggers`. The `execute` grant to anon/authenticated was untidy, not reachable. The reset removed the function, so the finding is gone rather than suppressed.
- Two advisor findings remain and are both intended. `staff_capabilities` has row level security enabled with no policy, which is the deny-all it should be: `anon` and `authenticated` are revoked from the table and the matrix is read only through `security definer` projections. Fourteen `security definer` functions are executable by `authenticated`, which is the projection design recorded in the entry below; all fourteen re-check authority in their own body (`private.staff_capability`, `private.line_access`, `private.member_of`/`manager_of`, or a self-scoped predicate), and the staff ones sit behind `private.staff_access()` and its `aal2` requirement. The linter cannot see an internal guard. Neither is suppressed; both are documented so they are not re-litigated.
- `jw@redial.si` is the first platform owner, created from `supabase/bootstrap-owner.sql` with the address supplied to the session rather than written into the file. The template keeps its placeholder deliberately: it is reusable, and a personal address committed into it would invite a second owner being created by editing and re-running it. The verification select returned exactly one row. A staff row still grants nothing until TOTP is enrolled, because `private.staff_access()` requires `aal2` in the database.
- The stale `20260925223848 account_access` ledger row was left in place. Its objects are gone, and the row is now the only surviving record that the unrelated schema was ever applied. This repository does not push with the Supabase CLI - there is no `supabase/config.toml`, `test:database` pipes the files into a throwaway Postgres, and `print:migrations` exists for manual application - so a remote-only ledger entry misleads no tooling here.
- Leaked password protection is disabled in Supabase Auth. Recorded as an open item; it is a dashboard setting, and the project-scoped MCP exposes no Auth configuration tool.

## 2026-09-26 - Staff capabilities, the ops console, and account settings

- `platform_staff` widens to `owner|admin|support|finance|growth|analyst`, and capabilities move into a `staff_capabilities` table rather than role strings inside policy bodies. `private.support_access()` is redefined as `staff_capability('support_read')`, so every existing policy on `workspace_records` and `support_messages` inherits the new roles without a policy or test rewrite.
- Cross-tenant staff reads are `security definer` projections, not widened table policies. Two reasons decided it: a policy cannot write an audit row, and a widened policy would expose every column to arbitrary PostgREST filters. No projection returns call summaries, transcripts or recordings, and opening a customer record writes `staff.customer_viewed`.
- `promote_staff` refuses a self-change, an unknown role, an unconfirmed account, and any change that would leave zero active owners. The first owner is still created by a privileged session; there is no UI for that and there should not be.
- The ops console becomes a section registry (`src/lib/ops/sections.ts`) with one folder per section, replacing a 20-line catch-all that `notFound()` anything but `/ops/support`. `requireStaff(capability)` runs on every page rather than only in the layout, and a missing capability is `notFound()` so a finance operator does not learn that staff administration exists. Sections needing the billing schema or the worker are absent rather than rendered as empty panels.
- Account settings at `/account` carry the display name, password change, a global-scope sign-out and the recorded terms acceptance. Email change and account deletion are deliberately not offered: the email is the identity calls and membership attach to, and deletion must reverse call routing safely first. Both say so on the page instead of failing quietly.
- Two test corrections, neither weakening an assertion. `landing.spec.ts:57` is a form test and now runs under reduced motion, so it no longer depends on 3D scene timing that varies with the renderer; the Three.js journey and its reduced-motion and WebGL-loss paths stay covered by their own tests. `shell.spec.ts` accepts 404 as well as 307 for private paths, because a path that no longer exists 404s from the router; both still must refuse anonymous access and never reflect the `next` parameter.
- CI gained software WebGL (`--enable-unsafe-swiftshader`, `--use-angle=swiftshader`) and a 90s test budget. GitHub runners have no GPU, so `three-scene.ts` never set `data-rendered` and that assertion was failing on capability rather than behaviour. `landing.spec.ts:57` had already been failing on `origin/main` at `a73fe79`, before this branch existed.
- Verification: lint, typecheck, the optimised build, all 81 browser tests, 5 dashboard integration tests, 15 node tests and the RLS suite, which grew from 29 to 45 unique assertions covering the capability matrix, MFA on every projection, the absence of call content in the customer projection, the audit row, and the last-owner guard. No migration was applied to a hosted project and no provider was contacted.

## 2026-09-26 - Public legal documents aligned with A2P 10DLC

- Owner decisions recorded: the legal entity is **Qallus**; the SMS programme carries account/security notices, call notifications and billing reminders, and **no marketing messages**; the owner chose to publish without external legal review, which is noted here rather than hedged in the documents themselves.
- Add `/legal/privacy` and `/legal/terms` as ordinary `(site)` pages. Content is written to match what the service actually does: AI answers and discloses itself, recording off by default, transcripts 90 days on paid and 7 days free, line-level access so a household payer cannot read another member`s calls, and Square holding card data rather than Redial.
- A2P 10DLC vetting fetches the policy URLs directly, so both pages are exempted from the development password gate in `src/proxy.ts` via `publicPaths`, exempted from `X-Robots-Tag: noindex` in `next.config.ts`, and allowed in `robots.ts`. Everything else stays gated and unindexed. The pages contain no customer data, so the exemption adds no exposure.
- The clauses 10DLC specifically checks are present and deliberate: an explicit statement that mobile numbers, opt-in information and consent records are never sold or shared for third-party marketing; the message categories; message frequency varies; message and data rates may apply; STOP and HELP; a customer care address; and carrier non-liability for undelivered messages.
- Two Redial-specific statements are carried as callouts rather than buried: the mobile opt-in non-sharing clause, and that Redial is not a telephone service and cannot reach emergency numbers.
- Governing law is set to Arizona. Contact addresses `support@redial.si` and `privacy@redial.si` are referenced by both documents and by the messaging programme; those mailboxes must exist before A2P registration. No postal address is asserted, because none was supplied.
- Verification: lint, typecheck and the optimised build pass; both pages prerender statically. With `REDIAL_DEPLOYMENT=development`, `/legal/privacy` and `/legal/terms` return 200 without credentials while `/`, `/pricing` and `/app` return 401, and authenticated access is unchanged. `/legal/*` carries no `X-Robots-Tag` while `/pricing` still carries `noindex, nofollow`. 15 node tests and all 81 browser tests pass. No provider was contacted, no campaign was registered and no message was sent.

## 2026-09-25 - Reconcile the Supabase dashboard and Coolify deployment tracks

- Two computers diverged from `fb31575`. This workstation held an uncommitted Supabase identity/dashboard track (auth, `/app`, `/ops`, four migrations, the RLS suite, carrier setup, contact import, phone simulator); `origin/main` held a committed Coolify deployment track (`config/runtime.mjs`, access gate, Resend/Hostinger diagnostics, CI, container tests, teaser email). The local work was committed first as `36093c6`: `src/proxy.ts`, `Dockerfile`, `.dockerignore` and `.env.example` existed untracked locally and tracked on the remote, so a merge or forced checkout would have destroyed files held in no commit.
- `src/proxy.ts` is merged rather than chosen, because both jobs are required. Order is load-bearing: content-free `/api/health/live` first, then `readRuntime()` failing closed with 503, then the Basic-auth/Host perimeter, then the Supabase session refresh scoped to authenticated paths. A rejected request costs no Supabase round trip and a failed password never refreshes a session cookie. The matcher widens to `/:path*` for the perimeter; the proxy is still not an authorization grant.
- Deployment files resolve to the remote: pinned `node:24.15.0-bookworm-slim`, `scripts/start-container.mjs`, the allowlist Docker context, `REDIAL_BUILD_STANDALONE` and `outputFileTracingExcludes`. `.env.example` is rewritten into web, worker and operator blocks so the secret boundary is visible in the template.
- `REDIAL_SITE_URL` replaces `APP_BASE_URL` as the single configured origin, shared by `config/runtime.mjs`, the access gate, `appOrigin()` and the launch gate. `APP_BASE_URL` remains a deprecated fallback for one release. Health endpoints consolidate on `/api/health/live` and `/api/health/ready`; the Supabase auth-reachability probe folds into readiness alongside the data-volume write probe, and the duplicate `/api/health` and `/api/ready` routes are removed.
- `config/runtime.mjs` gains a loopback escape for `REDIAL_SITE_URL` and `SUPABASE_URL` when `REDIAL_DEPLOYMENT=local`, without which the browser-test Supabase double and local development both fail validation. Hosted modes remain HTTPS-only and still fail closed, as the deployment tests assert. The launch gate reports under the new key name and extends its forbidden-secret set to `SQUARE_*`, `TWILIO_API_SECRET` and `OPENROUTER_API_KEY`; provider secrets stay blocked in the web environment.
- `package-lock.json` had to be regenerated inside the pinned Linux image: npm on Windows omits the OS-gated `@img/sharp-wasm32` subtree, so `npm ci` failed in the container on missing `@emnapi/core` and `@emnapi/runtime`. The repaired lockfile adds exactly those four entries, removes none, and drifts no direct dependency version.
- Validation on the merged tree: lint, typecheck, 15 node environment/access/launch tests, all 75 reference tests, all 81 browser tests, 29 RLS assertions against a throwaway Postgres container, 5 dashboard integration tests against the HTTP double, the 92-file kit integrity check, the Docker image build and the container smoke test all passed. No migration was applied to a hosted project, no provider was contacted, no DNS or Coolify change was made, and no live call, email or charge occurred.
- Note: this file already contained one non-UTF-8 byte in an earlier heading before this change. Existing bytes were left untouched rather than rewritten.

## 2026-09-25 - Personal first-look email

- Create an Outlook-oriented email teaser with Redial's existing brand, an actual app phone mockup, all four v1.1 controls, and buttons to the homepage and `/demo/live` simulator. Keep editable HTML and plain text alongside a generated copy/paste preview and unsent EML with a CID image. No recipient list, sender credentials, tracking or send action is added.
- Preserve the working app. The image uses the existing local Three.js screen with a fictional caller; presentation changes were applied only in the capture browser. Personalization remains explicit `[First name]` and `[Your name]` placeholders.
- Desktop/mobile preview, copy payload, links, image loading and MIME image integrity were verified. Actual Outlook rendering remains untested. Public HTTPS currently returns a self-signed certificate error; this is an author-only readiness note, not part of the copied email. See `EMAIL-TEASER.md`.

## 2026-09-25 - Resend primary with Hostinger SMTP fallback

- Record the owner's email choice: Resend primary, `smtp.hostinger.com:465` with implicit TLS as fallback. Add `REDIAL_EMAIL_FALLBACK_PROVIDER=smtp` alongside `REDIAL_EMAIL_PROVIDER=resend` in the environment template and ignored workstation deployment file. Preserve the prepared Supabase key and development access password.
- Validate both providers' required credentials when fallback is selected. Provider checks independently inspect Resend and SMTP without sending mail, and continue to inspect fallback if the primary check fails. Report only redacted statuses.
- Sender address, Resend key and Hostinger mailbox credentials are still missing. Do not infer a mailbox from the domain or configure IMAP/POP for outgoing mail. Automatic message failover belongs to the later durable delivery implementation; no queued message, Auth setting or external service was changed.
- Validation: lint, typecheck, all 12 environment/access/email diagnostic tests, the Docker build and container smoke checks passed; all 92 kit originals remain unchanged. Provider response tests use mocks and send no messages. The prepared deployment file reports the missing sender and credentials as expected. Browser UI is unchanged.

## 2026-09-25 ? Protected Coolify development preparation

- Inventory began on main at fb31575, matching GitHub. Existing untracked .codex/, .vscode/, and docs/3d-phone/ were preserved and excluded from the deployment change. The original 92-file kit remains unchanged.
- The owner requested a Coolify development deployment for redial.si and confirmed the new Supabase project is development. This extends the previous local-only scope to a protected development site; it does not authorize production activation. Draft hostname is dev.redial.si pending the owner's choice.
- Use a pinned multistage Docker image and runtime-only provider configuration. Keep local review behavior and ports intact. Permit hosted preview APIs only with an exact configured origin/Host, Basic development access, secure cookies and a dedicated persistent volume. This shared preview password is not member/staff authentication. One process/instance is required by the existing file store.
- Supabase MCP and a read-only Auth endpoint check verified the development project's publishable key. The key and generated development password were saved only in Git-ignored .env.coolify.local. Supabase has no public tables or applied migrations. Existing rls_auto_enable() privilege advisories need review during the identity/RLS increment; no database writes were made.
- Add pinned Nodemailer 10.0.10 and explicit read-only provider diagnostics. Twilio and email credentials are not available; neither is described as connected. No emails, test calls, webhooks or service provisioning were performed. Managed Supabase Auth SMTP remains separate from app environment variables.
- Preserve the UI and update storage acknowledgments to say preview server instead of this computer. Form submissions still share one browser-scoped record between the member/admin preview views. They do not become real Supabase accounts.
- See DEVELOPMENT-DEPLOYMENT.md for Coolify configuration, provider variables, validation evidence, remaining M1 gates and rollback limits. Publish on development/coolify-foundation; no automatic VPS deployment is added.


## 2026-09-22 — Keep onboarding inside the zooming phone

- Replace the final outline-to-card transition with one solid-phone zoom containing the actual onboarding form. Preserve all earlier story effects, existing form behavior and local-only service boundaries. The clean pre-edit baseline is Git commit `87e3880`.
- Keep a single mounted form and project it onto the phone screen until its normal document position matches. Remove the decorative form duplicate, separate introduction and upward card reveal. Keep controls inert while moving; retain entered values on rewind and restore ordinary layout for reduced motion or WebGL loss.
- Preserve the device frame around lower fields after zooming, including long mobile forms, with a solid CSS rim at the endpoint. Lint, typecheck, optimized build and the 92-file kit integrity check passed. The final combined browser suite passed 18/18. Evidence and responsive review steps are in `PHONE-FORM-ZOOM.md` and `evidence/phone-form-zoom/`. No dependency, storage, provider or production changes.

## 2026-09-22 — Initial GitHub publication

- The user explicitly authorized committing and pushing this project to `https://github.com/ThePopOpp/redial.git`. Read-only inspection found no existing local Git history and no remote refs. Initialize `main` and use that exact URL as `origin`; preserve all existing project work.
- Publish application source, pinned dependency manifests, tests, the original kit and recorded development evidence. Existing ignore rules exclude `.redial/` account/session data, credentials, dependencies, build output, caches and transient browser results. The publication scan found no credential patterns or oversized files among the included files; this is a targeted check, not a comprehensive security audit.
- Add `.gitattributes` rules preserving original kit and evidence bytes across platforms. Correct the README's completed-setup retention description and document the local account/admin routes. No runtime, provider or production changes are part of this publication; the natural-voice replacement remains pending a voice choice.
- Before committing: lint, typecheck, optimized build, all 75 reference checks and the 92-file kit integrity check passed. Browser evidence from the completed implementation remains in `docs/evidence/`; this documentation/Git preparation did not change application behavior.

## 2026-09-20 — Screen Calls in Inter 900

- Keep the full SCREEN CALLS background label and Screen Calls chapter label. Load the installed Inter 900 font face in `src/app/layout.tsx` and set `.story-feature-word` to weight 900 in `src/app/story-interactions.css`. Preserve the existing glow-to-blur animation.
- Adjust responsive type sizing for the heavier glyphs after the first browser run exposed slight tablet overlap. Both existing readability checks then passed across six desktop/tablet/mobile sizes in light and dark mode. Lint, typecheck, build and all 92 kit hashes passed; no new tests or dependencies were added.
- Preserve the two pre-edit files and hashes in `evidence/pre-screen-calls-weight-source/`; final browser report and screenshots are in `evidence/screen-calls-weight/`. Refreshed only the verified project server at `http://127.0.0.1:4317/`. No service or onboarding behavior changed.

## 2026-09-19 — Slower story and persistent local setup handoff

- Expand carrier choices with a shared form/schema list, rename the screening label to Screen Calls, and increase native story scroll distance approximately threefold. Preserve reversible effects, chapter shortcuts, reduced motion and light/dark styling.
- The local app has no connected identity backend. After an unanswered optional clarification, implement the requested completion handoff as explicit local member/admin views at `/local/account` and `/local/admin`, using one canonical submitted record. Keep `/app` and `/ops` closed and personal setup details out of synthetic `/demo` data.
- New final-step acknowledgment permits persistent submitted storage until deletion. Unsubmitted drafts still expire after eight hours. Preserve stable account identity, optimistic versions, atomic saves, member-visible review updates, draft/submission separation and deletion of both views. Older completed drafts require resubmission for persistent storage.
- Preserve pre-edit sources under `evidence/pre-onboarding-handoff-source/`. Implementation, limits and verification are documented in `ONBOARDING-HANDOFF.md`; no production service, carrier routing or provider configuration changed.

## 2026-09-19 — Extend the reveal to every feature card

- Apply the approved small-card hold, phone fade and glowing card ascent to all eight feature chapters. Keep the final phone/onboarding transition. Preserve the prior sources/tests in `evidence/pre-complete-reveal-source/` before editing.
- Fold transcript, Insider and Audible controls until their cards expand; keep them inert while hidden and preserve full static-mode controls. Align transcript scroll timing with the visible reading interval, and complete Insider/summary tracing before their reveals.
- Remove the SCREEN mask that obscured the lettering. Place the complete glowing word above screening copy, with responsive spacing so it avoids both the phone and text. Preserve the subsequent zoom/blur/fade.
- Lint, typecheck, build, original-kit verification and 22 relevant browser checks passed. The final short-screen refinement passed both mobile theme/accessibility checks; 48 local desktop/tablet scene inspections passed. Refresh only this project's verified listener on port 4317. Evidence and file details are in `COMPLETE-CARD-REVEAL.md`.

## 2026-09-19 — Phone-first reveal trial

- Limit the revised sequence to incoming and screening. Preserve nine relevant sources/tests with hashes in `evidence/pre-staged-reveal-source/`. Hold small cards while presenting the device, then fade its case/screen/shadow as the card grows, glows and rises. Shared deterministic scroll curves preserve reverse playback.
- Finish the first outline/material pass before the card reveal. Replace SCREEN's muted immediate blur with crisp luminous lettering, bloom, then zoom/slide/blur/fade. Use a feathered mask behind desktop copy and violet glow in light mode.
- Unfold the screening sample controls with the card; keep hidden controls inert. Explicit screening playback begins at the greeting and cancels a pending scroll seek. Preserve all later chapter behavior and local-only service boundaries.
- Lint, typecheck, build, 92-file kit verification and 20 relevant browser checks passed. Three final compositing/mobile checks and 24 desktop/tablet scene inspections passed in both themes. Refresh only the project-owned server on port 4317. See `STAGED-REVEAL.md` and `evidence/staged-reveal/`.

## 2026-09-19 — Readable, interactive phone overlays

- Preserve the existing cinematic sources under `evidence/pre-interactive-story-source/`, then enlarge all eight callout cards and add scroll-driven growth/ascent with a longer readable interval. Trial the sliding/blurred background word only in screening, as the user requested.
- Interpret the request's references to both the second section and Insider as audio samples in both. Use an original offline-generated fictional WAV with synchronized captions/cues, explicit playback opt-in, seekable transcript, pause/mute/leave handling and an unavailable state. No actual call media, microphone, external speech service or provider integration.
- Add three Audible instruction choices with matching scripted replies. Keep the private instruction separate from caller transcript content. Reuse the existing button primitive and light/dark tokens; use a styled native range control with keyboard support for sample seeking.
- Initial 56-check regression: 55 passed, one new test failed due to an incorrect selector. Corrected the test; all eight interaction checks passed. Five-width live inspection, preserved reports and screenshots are in `evidence/interactive-story/`. See `INTERACTIVE-STORY.md` for asset provenance and behavioral limits.

## 2026-09-19 — Reference-directed cinematic motion

- Reviewed all six user-provided references visually, emphasizing Oryzo's material-to-schematic transition. Preserved the six existing landing sources and their hashes under `evidence/pre-motion-source/` before changes. No reference-site code or media imported.
- Extend the existing pinned Three.js/native-scroll implementation with an offline studio environment, physical materials, progressively drawn contours, descending camera arcs, pointer parallax, a decorative cursor halo, glass highlights and chapter lighting. No new dependencies or production services.
- Derive screen transitions, transcript words, guidance, waveform bars and handoff steps from scroll. Keep Gavel's AI-removal-before-human ordering and Directory's acceptance-before-continuation ordering. Retain reversible motion, a native cursor, reduced-motion/fallback content, theme toggles, fixed navigation and actual HTML form controls.
- The initial 48-check regression run passed 47 checks and exposed a Directory screen overflow. Corrected its spacing; all 11 affected motion/onboarding checks passed on rerun. Final lint, typecheck, build and 92-file kit verification passed. Final Edge inspection and screenshots are in `evidence/motion/`; implementation/provenance is in `MOTION-REFINEMENT.md`.
- Reloaded only the verified project-owned local server on port 4317. Existing service boundaries and outstanding M1 integration gates remain as documented.

## 2026-09-19 — Navigation stays visible on scroll

- User requested a fixed top navigation with the light/dark toggle inside it. Keep the existing header toggles and pin the website and dashboard top bars. The cinematic landing uses a viewport-fixed header with matching 80px/70px content space; public and member/staff headers use sticky positioning to preserve their responsive height and existing column layouts.
- Changed `src/app/globals.css`, `src/app/landing.css` and `src/app/review.css`. Add scroll clearance for public/dashboard anchors and preserve the existing Three.js timeline and onboarding offsets. Menus stay above page content; modal dialogs stay above navigation. No dependency, service, schema or configuration changes.
- Existing browser run: 42 checks passed; two callback keyboard checks exposed a timing race in the test's immediate End/Enter sequence. Updated `tests/appearance.spec.ts` to wait for the selected and target options to receive focus. Both targeted reruns passed; no application workaround or disabled assertion was needed.
- Lint, typecheck, optimized build and the 92-file kit integrity check passed. Live Edge verification on port 4317 confirmed 32 scroll positions across landing, public pricing, member and operations routes at 360/390/768/1440px, theme toggles reachable in both modes, and mobile menu/Escape behavior after scrolling. Evidence: `docs/evidence/navigation/scroll-check.json` and `callback-rerun.json`. The original build kit and production services remain unchanged.

## 2026-09-19 — Three.js call journey and onboarding

- Follow the user's new request for a reversible scroll-driven landing page and the supplied seven onboarding screenshots. Preserve the previous home source under `docs/evidence/pre-landing-source/`; existing member/operations work remains in place.
- Use pinned Three.js 0.186.0 with a native scroll timeline, WebGL phone geometry and CSS3D-rendered React screen content. No scroll-hijacking library, autoplay audio, third-party model or CDN is needed.
- Implement real local setup persistence separately from synthetic review records. Permit the user's own name/email/line information in this explicit setup form, with validation, an eight-hour expiry and deletion. This does not change the original rule against real personal data in `/demo` fixtures.
- Retain visual patterns from the screenshots while avoiding unsupported carrier activation codes, invented provider detection or fake test-call pass states. A saved setup request never means service activation.
- Include reduced-motion and WebGL-unavailable paths. Keep all provider/production changes outside this local scope. See `LANDING-EXPERIENCE.md` for implementation and evidence.

## 2026-09-19 — Expanded local review

- The later user request expands the local review scope beyond the first increment. Preserve the 92-file kit and inventory/hash the working application before expansion. No Git repository or production configuration was created.
- Add full member/operations review surfaces with synthetic stateful workflows. Keep `/app` and `/ops` closed. The later milestone interfaces do not constitute later milestone acceptance; development identity remains the next integration gate.
- No provider credentials were present and Docker's daemon was unavailable. Continue independent local UI/domain work with explicit simulation labels. Do not infer authorization to alter production services or invent provider evidence.
- Use strict Zod 4.6.5 command validation, lucide-react 1.47.0 icons, server-only 0.0.1, and pinned dependencies. Original business reference repositories remain read-only; no source-company code was imported.
- Persist fictional review state in a session-isolated local JSON store with 8-hour expiry, same-origin/loopback checks, atomic saves, optimistic versions and idempotency. This store is intentionally limited to a single local process; it is not the Supabase domain store or real auth.
- Start a dedicated loopback review server on port 4317 without touching existing listeners on 3000/3001. No production deploy is part of running an optimized local Next build.
- Detailed behavior, boundaries and remaining acceptance gates are in `LOCAL-REVIEW.md`. The earlier first-increment evidence remains historical evidence rather than being overwritten with new claims.

## 2026-09-19 — M0 / first M1

- Preserve all 92 kit files byte-for-byte. No Git repository existed; do not fabricate a commit/baseline diff or initialize/push a remote. Add only app and working records outside the kit.
- Use npm (installed 11.12.1), Node 24.15.0 and a root Next App Router app. New application boundary is appropriate because there are no existing app files. Avoid a full scaffolding CLI over the nonempty root.
- Choose Next 16.3.5, React/React DOM 19.3.0, Tailwind 4.3.3 and TypeScript 5.9.3; npm save-exact and a new lockfile. Registry and official Next installation/support/security docs were checked. No source app upgrades or installs.
- Keep UI assets local through font packages; no Google Fonts network dependency at build or runtime. Use Redial graphite/violet/pink, serif display, sans body and mono metadata. Review contrast on the rendered pages.
- Selective reuse assessment only: no source-company module copied. Official shadcn Button may be adapted with its MIT notice and provenance. No copied company data, contacts, domains, auth, provider endpoints, catalog or deployments.
- Separate public `/demo` fixtures from `/app` and `/ops`, which deny access until real auth is implemented. A locked staff entry is the smallest safe staff boundary; it is not a completed authenticated staff dashboard.
- No provider integration or fake success controls. The v1.1 named features are described as planned; call console and Directory operations follow M2/M3a. Prices remain proposed; checkout disabled by omission.
- npm registry requests initially failed with EACCES under network restrictions. Approved read-only registry access succeeded. Install/check evidence will record any further environment limitations.
- Tooling exception: ESLint 9.39.5 is end-of-life, but Next 16.3.5's bundled React/import/a11y plugins reject ESLint 10.11.0 (invalid peers and getFilename runtime error verified locally). Restored exact ESLint 9.39.5 for this local increment instead of suppressing rules or overriding peers. Upgrade the compatible lint toolchain before release; runtime Next/React remain current. See https://eslint.org/version-support/.
# 2026-09-22 dashboard data increment

Implemented Supabase-backed member forms for personal and business workspaces, scoped line grants, Auth callbacks, and a separate MFA-gated staff support inbox. Details, environment names, test boundaries and Coolify preparation are in [DASHBOARD-SUPABASE.md](DASHBOARD-SUPABASE.md). Runtime uses user sessions and RLS, never a service-role client or demo fallback. Existing kit and source references remain unchanged.

This is an initial data-core increment, not full v1.1 completion: bounded typed JSON records hold member drafts until the corresponding normalized provider domains are implemented. Existing verified accounts can accept in-app invitations; invitation emails/token expiry are deferred. No fixture or saved setting activates providers. No production deployment or provider mutation was performed. Earlier closed-route documentation describes the prior baseline; configured routes now require real server-verified identity, current membership, and separate staff role/MFA. M1 and later milestone gates remain open.

## 2026-09-22 � Contact import from phone

Adapted the user-requested Channel Cast interaction as original Redial code: authenticated QR handoff, explicit phone picker, local vCard review, selected/all imports and transactional line-scoped persistence. Source provenance, exact dependency versions, migration, evidence and device limitations are in [CONTACT-PHONE-IMPORT.md](CONTACT-PHONE-IMPORT.md). No source-company code was copied or changed. No production or provider action was performed.


## 2026-09-22 � Animated phone setup simulator

Added a seven-step Android/iPhone walkthrough modal to demo and authenticated Contacts. It demonstrates QR, sign-in, optional home-screen shortcut and contact selection without invoking device APIs or writing data. See [PHONE-SETUP-SIMULATOR.md](PHONE-SETUP-SIMULATOR.md) for sources, boundaries and evidence. Two walkthrough and four dashboard browser tests passed; seven existing workflow tests also passed. No deployment, dependency, migration or live-service changes.



## 2026-09-25 ? Provider setup and live-launch preparation

Added a separate incoming-call wizard for Mint, T-Mobile, Verizon, AT&T and Other providers. Provider documentation is distinguished from actual Redial compatibility; no universal carrier code or inherited MVNO support is assumed. A member can save only a line-scoped draft, not verification or activation evidence. Dedicated-number, conditional and all-call paths remain pending an assigned, tested destination. Country/device/OS/plan are captured to support later compatibility review.

The current web app is not a voice engine. Added an explicit Connections implementation checklist, redacted offline config checker and a deployment/pilot/rollback runbook in `docs/LIVE-LAUNCH-PREPARATION.md`. Separate gateway and worker implementation remains required; no placeholder service is presented as ready. Provider and privileged database keys remain outside the web environment. Tests and open release gates are recorded in `docs/release-evidence/2026-09-25-carrier-setup.md`. Existing work and all kit originals were preserved.


## 2026-10-02 — Reconciling two computers, and an auth request ceiling

This workspace was 23 commits behind `origin/main` and carried uncommitted work
from 2026-09-25 15:30–15:38 that had been superseded. The other computer solved
the same ground differently and better, so `main` is the surviving line. The
uncommitted work is preserved verbatim on `local/account-access-wip` (4ddc94f)
rather than discarded, because it was never reviewed and may still hold ideas
worth taking. It is reference only; it does not build against current `main`.

Four of its paths could not have coexisted with `main`: `auth/callback/page.tsx`
against `route.ts`, a catch-all `ops/[[...path]]` shadowing the explicit ops
routes, `docs/3d-phone` against `docs/3D-Phone` on a case-insensitive
filesystem, and a second migration-numbering scheme. This is why the branch is
kept whole instead of partially merged.

One piece of it was genuinely additive and has been taken: an application-level
ceiling on authentication requests. `main` relied entirely on Supabase's own
Auth limits, which are persistent and per-project but leave each deployment free
to spend attempts against them without restraint. `src/lib/auth/rate-limit.ts`
adds fixed one-minute windows — 120 per process, 8 per identity — keyed on a
SHA-256 hash of the address so no address sits in process memory in the clear,
and bounded at 2000 entries so a flood of unique identities cannot grow the map.

Deliberate limits: it is per-process, not distributed. The web unit runs a single
instance today, so a shared store would buy nothing; if that unit ever scales
past one replica, each process would grant the full allowance independently and
this has to move to Postgres or Redis. Recorded here because the ceiling will
look stricter than it is once replicas exist.

Signing out is never throttled — being unable to end a session is worse than any
abuse the limit would stop. `/account/password` previously showed "could not be
updated" for every notice, which would have misdescribed a throttled attempt as
a failed one, so it now distinguishes the two.

Evidence: typecheck, lint and build pass. 141 existing tests pass (75 reference,
66 node). `verify:kit` confirms all 92 kit originals still match the M0 baseline.
The limiter's behaviour was verified in isolation against the compiled module —
per-identity cutoff, case-insensitivity, independence between identities, the
global ceiling, window expiry and hashed keys. That verification is not a
committed regression test: this repository has no unit harness for `src/`
TypeScript, and adding one was out of scope for this increment. It remains an
open gap.

No provider, deployment, migration or live-service action was performed. The M1
identity gates remain open.


## 2026-10-02 — Call logs, recordings and transcription

The dashboard already had a call inbox and a transcript panel, both gated
correctly, and nothing had ever written a row to either. The only inserts into
`calls` and `transcript_segments` in the whole repository were in
`supabase/tests/permissions.sql`. The gateway records `call_screenings` while a
call is in flight; the member-facing log is `calls`; the two were never bridged,
so a real call would always have shown an empty inbox.

A worker job now projects finished screenings into `calls`. It runs in the
worker and not on the webhook path, because a projection failure must never be
able to affect a live call. Only terminal screenings are projected: publishing a
call still in progress would show a duration of zero and an outcome about to
change. Provider outcomes that do not map are left unmarked for a later version
rather than guessed. Clock skew is clamped, so a provider timestamp cannot
produce a negative or absurd duration. The contact name is resolved once at
projection time and stored, so a contact renamed later does not rewrite history;
that matches how a phone's own call log behaves.

### The hole this closed

`twiml.mjs` already emitted `record="record-from-answer-dual"` whenever a line
set `recording_enabled`, with no status callback. A single UPDATE to that flag
would have started two-party capture at Twilio while this side held no
reference, no consent record and no deletion deadline — audio we could neither
show, delete, nor justify. The flag defaulted to false, so nothing had been
captured, but it was one statement away.

Four changes make that unreachable rather than merely unlikely:

- `consent_events` is append-only, per line and per purpose. Recording and
  transcription are separate purposes, because a member may accept a written
  record of a call and refuse the audio, and the law treats them differently.
  Withdrawal is a new row, never an edit; a consent record that can be edited
  afterwards is not evidence.
- A trigger on `line_routing` refuses `recording_enabled` or
  `transcription_enabled` without a current consent record for that purpose.
  This is a trigger and not a policy deliberately: `service_role` carries
  `bypassrls`, which skips policies and not triggers, so the gateway and the
  worker are held to it too. There is an RLS assertion for exactly that.
- A second trigger turns the capture off when consent is withdrawn, so a
  withdrawal stops the capture rather than recording a preference about it.
- `recordings.consent_event_id` is NOT NULL, so a recording with no consent is a
  state the database cannot represent.

### Recordings

Audio stays at Twilio. Redial stores a reference, the consent, a duration, a
retention deadline and a deletion state — not a second copy. The kit prefers
identifiers and access logs over fanning sensitive media across services, and
every copy is another thing a deletion run has to reach.

`read_recording` is a new line capability and `read_transcript` never implies
it. Thirty days by default, per the kit; a member's shorter retention preference
is honoured and a longer one is not, because quietly extending the life of a
recording is the one direction that breaks the promise they were shown.

Expiry is enforced in the policy as well as by the sweep, so a recording past
its deadline is unreadable whether or not the purge has run. Provider-side
deletion is irreversible and a provider mutation, so it waits for
`REDIAL_WORKER_MEDIA_DELETION=enabled`; while that is off the worker still marks
expired audio and the policy still refuses it. A failed deletion is recorded as
failed rather than retried silently, because audio we believe is gone but is not
is the one state nobody should mistake for success.

Playback goes through the gateway, which holds the Twilio credentials; those
must not sit in a browser-facing container. The web application proves the
member's own right to the row through row-level security — a row coming back
*is* the authorization, so the route never re-implements the capability check —
and the gateway then asks the database again before a byte moves, because a
grant revoked after the page rendered still has to stop the transfer. Every
download, served or refused, is logged. `may_read_recording` takes a user id and
is therefore granted to `service_role` only; reachable by a member it would be
an oracle for other people's access.

### Transcription

`transcript_segments` is populated from the gateway's transcription webhook.
Twilio posts one body per recording, so these are length-bounded chunks and the
speaker is recorded as `Call`: attributing turns the payload cannot distinguish
would be invention. Nothing in this repository runs speech-to-text.

The call summary is a speech-to-text result, not a verified statement, so
`calls.summary_confidence` travels with it and the inbox says when a line was
heard poorly instead of presenting a bad transcription as what the caller said.

### Deliberately not done

- **Transcripts are stored as plain text.** `docs/09-data-and-access.md` calls
  for encrypted bodies. Doing that properly is a key-management decision —
  pgsodium is deprecated and application-level encryption would make the
  existing retention policy unreadable to the database — so it is named here
  rather than half-built. This is an open gap, not a finished requirement.
- **Voicemail audio is still unreferenced.** `takeMessage` points its
  `recordingStatusCallback` at `/twilio/message`, which only settles the call,
  so a voicemail recording also sits at Twilio with no row. It is not stored in
  `recordings` because that table requires a consent event and voicemail has a
  different legal footing: the caller is prompted and chooses to leave a
  message. The right model needs legal input rather than a guess. Open gap.
- **`call_summaries` as its own table.** The kit specifies one; `calls.summary`
  is still a column. Not worth a migration until summaries have a model and
  prompt version to record.
- **No provider enablement.** No recording was switched on, no transcription was
  requested from Twilio, no deletion was sent, and no call was placed. The
  gateway's own `test`/`disabled` defaults are untouched.

### Evidence

131 row-level-security assertions pass in the isolated Postgres harness
(`npm run test:database`), up from 112. The 19 new ones cover the consent guard
for both a member and the backend role, owner-only consent, withdrawal turning
capture off, recording consent not implying transcription, a recording being
impossible without consent, `read_transcript` not reaching audio, retention and
deletion hiding a row, cross-tenant isolation, and revocation removing access.

105 node tests pass, up from 66. Typecheck, lint and build are clean. 81 browser
tests and 75 reference tests pass. `verify:kit` confirms all 92 kit originals
still match the M0 baseline.

Not run: nothing exercises the gateway's new webhooks against a real Twilio
callback, and no recording has been captured, served or deleted end to end. The
projection, the deletion planner and the webhook acceptance rules are unit
tested; the wiring between them and a live provider is not. M1 identity gates
remain open.

## 2026-10-02 — Brand selects, a hosted dead end, and the account-type catalog

Three unrelated things, done together because the first two were found while
looking at the third.

### The setup wizard was using raw native selects

`src/components/dashboard/carrier-setup.tsx` was the only file left in `src/`
still rendering `<select>`. Every other control in the product goes through the
Radix composition in `src/components/ui/select.tsx`, which is themed from the
same tokens as the rest of the design system. The native element is not: its
dropdown list is drawn by the operating system, so on Android it rendered with
the OS blue highlight and ignored both the light and dark palettes.

All four are now the shared `Select`: country, mobile provider, phone type and
forwarding condition. The dead `.carrier-instructions select` rule is gone, and
each field became `<label htmlFor>` pointing at the trigger. A `<button>` is a
labelable element, so clicking the label still opens the list, which is the
affordance the native control gave for free.

The one Playwright assertion that drove the native element — `selectOption('GB')`
— now clicks the trigger and the option. That is not a worse test: it exercises
the listbox a member actually sees.

### `/local/account` 404s on the hosted deployment, by design

Opening an account on `redial.si` ended at a bare 404. The route is fine and has
existed since the first commit; `src/proxy.ts` returns a bodiless 404 for any
`/local` path whenever `REDIAL_DEPLOYMENT` is not `local`. That rule is correct
and stays: those two pages read whatever onboarding submission the browser
holds, they have no authentication, and one of them is called "admin".

The defect was that the product still linked there. The onboarding completion
screen offered "Open my local account" and "Open local admin dashboard", and the
workspace navigation carried "Your submitted setup" and "Submitted setup review".
All four were guaranteed dead ends on any hosted deployment.

The flag is resolved per request and never baked. One image serves every
deployment and `REDIAL_DEPLOYMENT` is a runtime variable, so a `NEXT_PUBLIC_`
value would have been fixed at build time with whatever the builder had — which
is `local` by default, exactly the wrong answer. `/api/onboarding` now returns
`localPreview` alongside the saved draft, and `/demo/layout.tsx` reads the
runtime and passes it to the shell.

This hides links to a surface that is not reachable. It does not give the hosted
deployment a member account: that still waits on the M1 identity gates.

### Account types and refundable deposits

The billing schema from `202609260002` already modelled a catalog properly —
products, versioned plans carrying `features` and `limits`, prices with a
cadence and a Square mapping and a draft/available/retired lifecycle. Nothing
could write any of it. There were read projections for staff and no create,
publish or retire path, so the five plan names in the product existed only as a
hardcoded map in `src/lib/review/commands.ts` and all four catalog tables were
empty in the development project.

`202610030001` adds the Super Admin side and the deposit ledger.

**`catalog_write` is a new capability, not `billing_write`.** `billing_write`
moves money and is held by finance. Setting the price of a plan decides what
every future customer pays, so it is separate and goes to owner and admin only.
Finance and analyst keep `billing_read` and see the result.

**A published plan version is frozen.** Versions only protect an existing
subscriber if the version they were sold cannot be edited afterwards, so once a
version leaves draft its `features` and `limits` are immutable and a change
means a new version. Availability moves one way: draft, available, retired. The
same holds for a price — withdrawing an offer is a retirement, not an edit.
Both are triggers rather than policies, because `service_role` carries
`bypassrls`, which skips policies and not triggers.

**A deposit is its own ledger, not a column.** Money the member has handed over
and can still get back is neither a payment against an invoice nor revenue. A
single balance figure cannot say where it came from, what consumed it, or how
much is still refundable, and those are the questions a dispute asks. So
`credit_entries` is append-only in signed minor units: the balance is the sum,
no row is ever rewritten, and a correction is a new entry. Edits and deletes are
refused by trigger.

The refundable amount is simply the balance. Money an invoice has already
consumed has left the ledger, so a member can never be refunded more than they
currently hold. The balance cannot go negative — an overdraft nobody agreed to —
and the check takes a per-workspace advisory lock first, because without it two
concurrent drawdowns each see a sufficient balance and both commit. One currency
per account, because summing mixed currencies is not a balance.

### Live charging is authorized; it is not yet wired

The owner explicitly authorized taking live payments through Square, overriding
the standing "no live charges" rule in `AGENTS.md`. Recorded here because that
rule should only ever be set aside in writing.

Nothing in this increment moves money. It stops at the catalog and the ledger.
Checkout belongs in `checkout_operations`, which already holds the quote, the
terms version, the expiry and the provider identifiers, and which the worker
drives because the worker owns provider calls and holds the webhook signature
key. That work still needs `SQUARE_ACCESS_TOKEN`, `SQUARE_WEBHOOK_SIGNATURE_KEY`,
`SQUARE_WEBHOOK_URL`, `SQUARE_ENVIRONMENT`, `REDIAL_SQUARE_PRODUCTION_AUTHORIZED=yes`
and `REDIAL_WORKER_PROVIDER_CALLS=enabled`, none of which are set.

A concern worth keeping visible: the M1 identity gates are still open. `/app`
and `/ops` have no verified server identity, workspace membership or separate
staff MFA. Charging a real card through a system that cannot yet prove who a
customer is produces payments that are hard to attribute and harder to dispute.
The recommendation is that the identity gates land before the first real charge,
whatever the authorization allows.

### Evidence

144 row-level-security assertions pass in the isolated harness, up from 131. The
13 new ones cover a member and support staff both refused the catalog, the owner
holding `catalog_write`, a price refused publication ahead of its plan, a
published plan and a published price both immutable and unable to return to
draft, a deposit raising the balance, a replayed idempotency key refused, the
balance refusing to go negative, a second currency refused, and the ledger
refusing an edit and a delete — the last three asserted against a privileged
writer, because `authenticated` holds no UPDATE on these tables at all and that
would have proved only the missing grant.

81 browser tests, 107 node tests and the reference suite pass. Typecheck, lint
and build are clean. `verify:kit` confirms all 92 kit originals still match.

Not run: no Square call, no checkout, no charge, no deposit taken from a real
card. The migration is applied to no project by this entry.

## 2026-10-02 — The catalog becomes real: Super Admin screens and a plan step

Applied `202610030001` and `202610030002` to the development project, built the
Super Admin side of the catalog, and gave the setup form a step where someone
chooses their account type.

### Seeded, because an empty catalog is indistinguishable from a broken one

The five plan names that existed only as a hardcoded map in
`src/lib/review/commands.ts` are now rows: Doorstep BYO, Concierge BYO, Estate
BYO, Concierge Managed, Estate Managed, each with a version 1 describing what it
includes and a published price. No price carries a Square plan variation, so
none of them can reach a provider.

This was inserted directly rather than through the new RPCs, which was the only
option: those functions require a staff session with MFA, and seed data has no
session. The consequence is that the seed carries no audit row. Everything after
it goes through the RPCs and is audited.

### `/ops/catalog`

Reading follows `billing_read`, so finance and analyst see what is on offer and
get a short note saying why the forms are absent. Changing anything needs
`catalog_write`, and every server action re-checks on the write rather than
trusting the render — the same pattern as `promoteStaff` — with the database
function checking a third time.

Features and limits are entered as JSON. They are open-ended by design: what a
plan includes changes faster than a column would, and the database already
bounds their size and shape.

### A step for the account type

The setup form is eight steps now. Step seven asks which account type someone
wants and, for a paid one, has them acknowledge the deposit.

**The choice is optional and the step cannot trap anyone.** First draft made it
required, which meant any deployment with nothing published — including the
preview server the browser tests run against — could not complete setup at all.
That is the wrong failure mode for a form that takes no money. The account type
here is a recorded preference; the binding choice happens at checkout, where
there is an authenticated member and a real quote. The deposit acknowledgement
stays conditional on actually choosing a paid plan, because that one is a
disclosure rather than a preference.

It is stored as the product code, not the plan version id: a version can be
superseded between someone saving a setup request and an administrator acting on
it, and what they chose was the plan, not that revision of it.

`/api/plans` serves the catalog behind the same access gate as everything else
and writes no filter of its own. `plan_version_public_read` and
`price_public_read` already restrict both tables to `available`, so a draft
cannot come back through that path even if the query forgot to ask.

### A hole the advisors found, in work from an hour earlier

`workspace_credit_balance(w uuid)` took a workspace id and was `security
definer`, so it ran with the owner's rights and answered for any workspace the
caller named. The `credit_read` policy was doing its job on the table and the
function walked straight past it: a signed-in member could ask for a stranger's
balance and get a number back.

The rule this broke is already written down for `may_read_recording` — a
function that takes an identifier instead of reading `auth.uid()` has to
re-check the caller itself — and it was not applied here. It now answers only
where `private.billing_access` passes, and returns null rather than zero,
because zero is an answer and this function has no business confirming that a
workspace exists.

Worth noting what did *not* catch this: 144 row-level-security assertions, a
clean typecheck, lint, build and 81 browser tests. Policy tests check policies.
Nothing was asserting that a security-definer function respects the boundary its
table's policy draws, and that is exactly where this class of bug lives. The new
assertion covers it for this function; the pattern deserves a sweep.

The same pass revoked `execute` on six trigger functions. Postgres refuses to
run one outside a trigger, so none was ever callable, but every other function
in this schema states who may call it.

### Evidence

146 row-level-security assertions, up from 144. Typecheck, lint and build clean;
81 browser, 107 node and 75 reference tests pass; 92 kit originals unchanged.
Security advisors: the anon security-definer warning is gone entirely, and the
signed-in list fell from 37 to 31.

### Still open

- **Checkout and the deposit are not wired.** `checkout_operations` has the
  quote, terms version, expiry and provider identifiers and is driven by the
  worker. It needs `SQUARE_ACCESS_TOKEN`, `SQUARE_WEBHOOK_SIGNATURE_KEY`,
  `SQUARE_WEBHOOK_URL`, `SQUARE_ENVIRONMENT`,
  `REDIAL_SQUARE_PRODUCTION_AUTHORIZED=yes` and
  `REDIAL_WORKER_PROVIDER_CALLS=enabled`. None are set. No charge has been made.
- **Staff cannot see a customer's credit balance.** The member-facing function
  correctly refuses them. `staff_workspace_billing` should carry the balance,
  with `billing_read` and an audit row; it does not yet.
- The M1 identity gates remain open, and the recommendation from the previous
  entry stands: they should land before the first real charge.

## 2026-10-02 — A recorded one-party basis, and an honest connection card

### The connection card was untrue in both directions

The dashboard's Connection status read `provider_connections`, a table nothing
in the repository has ever written — the only reference anywhere was the
`select` that rendered it. So Twilio, xAI, Square and Resend reported "Not
configured" however the environment was set, and setting a credential in
Coolify could never change it. Supabase reported "Account and database
connected" from a hardcoded string, whether or not the project was reachable.
One half understated the truth and the other invented it.

It reads the runtime now. The important part is what it cannot do: provider
credentials belong to the worker and the voice gateway, which are separate
Coolify applications with their own environments, and `config/runtime.mjs`
refuses to start the web container if a worker secret appears in it. So the card
reports what the web tier actually holds and names the unit that owns the rest,
rather than implying a provider health check it is in no position to perform.

xAI and Square read "Not implemented", which is the honest answer rather than a
configuration state: no deployment unit owns `XAI_API_KEY`, no gateway code
calls it, and no Square client exists.

### One-party recording, as a recorded basis

The owner's decision. Arizona is a one-party-consent state: a party to a call
may record it without the other party agreeing, under both A.R.S. and federal
law. Requiring a consent event there was asking for a record of something that
had not happened — the member had obtained no agreement, so a row reading
`granted: true, channel: ivr_announcement` would have been a false statement
sitting in the evidence table.

What stays is the row. Capture is still impossible without one, it is still
append-only, still written only by the line owner, still audited, and still
revocable — a withdrawal is a newer row and the existing trigger turns the
capture off. What changes is that the row now says *which* basis was relied on,
so an audit can tell a disclosure from a jurisdiction claim instead of finding
both recorded identically.

`legal_basis` is `all_party_consent` or `one_party_recording`. A one-party row
must carry `channel = 'no_disclosure'` and a `jurisdiction`, and a consent row
must carry a real channel and no jurisdiction; a check constraint enforces the
pairing, so neither can be dressed as the other. The jurisdiction is mandatory
because the basis is a claim about a particular place's law, and a claim with no
place attached cannot be checked by anyone later.

`record_one_party_basis` is a separate function rather than another argument on
`record_capture_consent`. They are different assertions and the caller should
have to say which one it is making; an optional parameter would let the weaker
claim be made by default.

The dashboard states the position plainly and deliberately does not phrase it as
"no consent needed". The rule turns on where the *other* party is: several
states require every party to agree, and the stricter state's law generally
governs an interstate call. For inbound screening that is the common case, not
the edge case.

### Evidence

151 row-level-security assertions, up from 146. The five new ones cover a
one-party basis claiming no disclosure, satisfying the capture guard, being
revocable with the capture stopping, refusing a missing jurisdiction, and
refusing to claim a disclosure when rewritten by a privileged writer.

81 browser, 107 node and 75 reference tests pass. Typecheck, lint and build
clean. 92 kit originals unchanged.

### Build order from here

The owner set it: the xAI assistant on the voice gateway, then Square checkout
and the deposit, then the Media Studio, then the dashboard shell. The first is
the one that makes an incoming call actually get answered, and it is also the
only one with no implementation at all today.

## 2026-10-03 — The assistant answers, behind the plan it was sold with

### AI screening is a third purpose, not a mode of recording

What a caller says has to leave Redial and reach a model provider before an
assistant can decide anything. That is a disclosure of call content to a third
party, and agreeing to a recording is not agreeing to it: a member may want
their calls screened by fixed rules and not handed to a model at all. So
`ai_screening` is its own purpose with its own basis, its own switch, its own
withdrawal, and the same trigger as the other two. A recording basis does not
enable it, which has an assertion of its own.

### A coin toss was deciding whether capture was permitted

`private.consent_active` read the newest row by `created_at desc, id desc`. The
tiebreaker is a random uuid, and `created_at` defaults to `now()`, which in
Postgres is the transaction clock — so any two events written in one transaction
shared it exactly and ordered arbitrarily. In production each decision is its own
statement and the ambiguity never surfaced. It was still a coin toss sitting in
the authority for whether a line may record, which is not a thing to leave
there. A monotonic `seq` settles it; insertion order is what "newest" meant all
along. Found because a test wrote two events in one transaction and the result
changed between runs.

### The assistant is layered on the rules, never instead of them

`decideTurn` takes the rule-based plan the gateway already computed and returns
it unchanged for every refusal: the switch is off, the line has not enabled it,
the plan is not entitled to it, there is no credential, the provider failed, the
reply was unparseable, or the model picked an action it was not offered. The
free tier and the failure path are therefore the same code, which is the cheapest
way to keep the failure path exercised rather than theoretical.

The model chooses from a closed set and writes one sentence. It is never asked
for a destination. The endpoint comes from `chooseDestination`, which is pure,
already tested, and enforces the loop and ownership guards — so a model that
returns nonsense can make a call less useful but cannot make it go somewhere it
should not. When it says connect and the guards say there is nowhere safe, the
guards win and the refusal is recorded.

A declined caller is still offered voicemail. The assistant's judgement is not a
verdict and it is wrong often enough that a hard hangup would lose real callers.

Timeouts are bounded at four seconds by default because Twilio abandons a slow
webhook and the caller hears silence. There is no retry: a retry inside a live
webhook spends the caller's patience twice, and the fallback is already good.

Resolving the profile is wrapped in a try/catch at the call site as well as
returning null from the store. A gateway test caught this — a fake store without
the method threw, and the caller got "sorry, something went wrong". Nothing about
an enhancement may be able to end a call.

### Tiers, on the plans that already existed

The owner's decision: layer AI onto the five existing plans rather than
restructure them. Version 2 of each now carries `ai_model`, `ai_turns` and
`ai_minutes`, and version 1 is retired with its prices. A published version is
immutable, so this went through the versioning rather than around it: nobody's
terms get rewritten. Doorstep and Concierge BYO get the rules; Estate and both
Managed plans get the model. `line_assistant_profile` resolves the line's two
switches and the workspace's tier in one round trip, because a caller is on the
line while it runs.

### The caller notice is the owner's to switch off

Also the owner's decision, made against the recommendation recorded with it. The
greeting tells the caller an AI is answering, defaulting on, and the line owner
may turn it off. The database does not refuse it; the dashboard warns at the
point of choosing, because an all-party state needs the announcement and the
stricter state's law generally governs a call that crosses a line. For inbound
screening that is the common case.

### Evidence

157 row-level-security assertions, up from 151. 118 node tests, up from 107 —
the eleven new ones cover every fallback path, the output bounds, the guards
outranking the model, and a declined caller still reaching voicemail. 81 browser
and 75 reference tests pass; typecheck, lint and build clean; 92 kit originals
unchanged.

Not run: no call has been placed, no webhook has been exercised against Twilio,
and no request has been sent to xAI. `REDIAL_GATEWAY_ASSISTANT` is `disabled` by
default and no `XAI_API_KEY` is set anywhere.

## 2026-10-03 — redial.si goes public

The owner's decision, made after the recommendation against it was recorded:
the development password gate comes off and the site is reachable without one,
complete or not.

### What the gate was holding up, and what still holds

`checkAccess` only challenges when `REDIAL_DEPLOYMENT=development`. In `public`
it checks the request host against the configured origin and, for mutations,
the request origin — CSRF protection, not authentication. So removing the gate
removes the only thing standing in front of the site as a whole.

What does not change: `/app` redirects to sign-in through `verifiedAccount`,
`/ops` redirects to staff sign-in through `requireStaff` and is invisible
without a verified second factor, `/local` is still a bodiless 404 on any hosted
deployment, and every table a signed-in member can reach is still bounded by the
157 row-level-security assertions. `/demo` becoming public is what `/demo` is
for.

The concern that stands: `docs/DEVELOPMENT-DEPLOYMENT.md` and `AGENTS.md` both
say `/app` and `/ops` remain closed until the M1 identity work is verified, and
that verification has not happened. The code paths exist and are tested; nobody
has walked them against the live project. That is now a public surface rather
than one behind a password.

### One thing that could not simply be flipped

`POST /api/onboarding` writes a file per setup request, and a completed
submission is written with `expiresAt: null` because a member's saved setup
should not evaporate. Behind the gate the password was the limit. Public, that
is an anonymous unbounded write onto a mounted volume, and the first symptom of
abuse would have been the whole application unable to write anything.

`MAX_STORED_SETUPS` caps it at 500. Crude, and it is the honest bound: it
refuses the 501st *new* request rather than letting the volume decide when to
stop. Someone continuing their own saved setup is never refused, however full
the store is, because the cap is only consulted when no record already exists
for that browser.

A per-identity rate limit was considered and not added. The only identity
available is a forwarded header, which this codebase deliberately does not trust
for anything else, and a limit keyed on a spoofable value reads like protection
without being any.

### Also

The development password was exposed in a terminal transcript during this
session: a `curl` printed `%{redirect_url}`, which carries the credentials
passed with `-u`. It is being retired with the gate rather than rotated.

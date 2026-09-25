# Dashboard and Supabase setup

This increment connects the member dashboard to Supabase Auth and PostgreSQL. It supports personal and business workspaces. No hosted project, domain, provider account or production deployment was changed. M1 and later acceptance gates remain open.

## What is connected

- Email/password registration, confirmation callback, sign-in, password recovery, password change and sign-out. Requests verify the user on the server; session cookies are HTTP-only and secure on HTTPS.
- Workspace creation/switching, owned lines, invitations to existing verified accounts, acceptance, revocation and explicit line grants. A billing role does not grant call content.
- Persistent contacts, Directory destination drafts, callback reminders, screening drafts, assistant drafts, preferences and support requests. Updates use revision checks; stale edits fail instead of overwriting a newer revision.
- Call summaries and retained transcripts read from scoped database tables. Each requires its own permission. There is no fixture fallback.
- Separate staff access and TOTP MFA, plus support replies visible in the member inbox. Staff membership cannot be set through account metadata or the dashboard.
- Read-only connection/subscription status and metadata-only workspace activity.

Numbers are workspace line records, not provisioned phone numbers. Directory records are proposals, not approved dialing destinations. Callback times are entered in UTC and remain stored reminders; no notifications or automatic calls are sent. Retention preferences do not yet run deletion jobs. Live Insider, Gavel, Audible and Directory execution requires the separate persistent voice gateway and provider evidence. Checkout, webhooks, email delivery, workers, native clients, exports and account deletion remain later integrations. Real operations currently provides support only; the larger `/demo/ops` simulator is not a production operations backend.

## Environment variables

The active template is `.env.example`; `.env.local` remains ignored and preserves your existing entries. Set these at runtime locally or in Coolify:

| Variable | Value |
| --- | --- |
| `APP_BASE_URL` | Exact origin, initially `http://127.0.0.1:4317`; later `https://YOUR_DOMAIN`, with no path or query |
| `SUPABASE_URL` | Your project's HTTPS API origin |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` key, or legacy `anon` JWT; secret/service-role keys are rejected |
| `NEXT_TELEMETRY_DISABLED` | `1` |

The web app does not need a service-role key. Supabase calls run on the server with the signed-in user's session and RLS. Missing configuration keeps real access closed. Invalid configuration fails rather than enabling a demo session. Runtime variables let the same Docker image serve your eventual domain without baking account configuration into browser assets. `REDIAL_STANDALONE=1` is set internally during Docker builds only.

## Prepare a development Supabase project

1. Apply `supabase/migrations/202609230001_dashboard.sql`, then `202609230002_support.sql`, then `202609230003_contact_import.sql`, in order using the project's SQL editor or your normal migration workflow. These are initial migrations for a new schema: inspect existing objects first if using an existing project. Do not run `supabase/tests/bootstrap.sql` or the permission test fixtures on a hosted project. See [phone contact import](CONTACT-PHONE-IMPORT.md) for QR and vCard behavior.
2. Enable email/password authentication and email confirmation. Set Site URL to `APP_BASE_URL`. Allow the exact callback URLs `APP_BASE_URL/auth/callback` and `APP_BASE_URL/auth/callback?recovery=1`. Keep the default email confirmation/recovery links that follow the supplied redirect. This implementation uses PKCE: open the emailed link in the browser that initiated registration/reset.
3. Configure your own SMTP sender and auth rate limits before external testing. Redial's generic email notice does not prove delivery. Recovery, confirmation and delivery still need a real project test.
4. Add the three runtime settings, restart Redial, and open `/sign-in`. Create and confirm an account, then create a personal or business workspace. Each starts with an owned line.
5. To invite someone, they first register and verify their own account. An owner/admin creates an invitation by email. The invited person accepts it inside their dashboard; this increment sends no invitation email. Invitations do not provide active access before acceptance. Owners can revoke them. Time-limited invitation tokens and new-user email invitations are not implemented.

## Staff bootstrap and MFA

After a staff user has a verified account, an authorized project administrator may insert its exact Auth user UUID into `public.platform_staff` using a privileged database session. Choose `support`, `finance` or `admin`; never use editable user metadata. Example for a development support operator:

```sql
insert into public.platform_staff (user_id, role, active)
values ('REPLACE_WITH_VERIFIED_AUTH_USER_UUID', 'support', true);
```

Sign in through `/staff-sign-in`; enroll a TOTP authenticator using the displayed setup secret and verify its six-digit code. Database support access requires `aal2` as well as an active support/admin role. Finance does not gain support content. This does not grant staff access to call transcripts or audio. Staff enrollment, recovery and revocation must still be exercised against your actual Supabase Auth instance.

## Coolify configuration (prepared, not deployed)

Use the repository-root `Dockerfile` build pack and port **3000**. Set your HTTPS domain in Coolify and use the same origin for `APP_BASE_URL` and Supabase redirects. Configure the variables above as runtime variables. The image uses pinned Node/npm, a lockfile install, a standalone Next server and a non-root runtime user. `.env*`, local state and Git history are excluded from the build context.

Use `/api/health` for container liveness. `/api/ready` returns 503 when Supabase is not configured or Auth is unreachable; a 200 only establishes Auth reachability, not database migrations, RLS correctness or provider readiness. Do not cache authenticated pages, callbacks or server-action responses at the reverse proxy/CDN.

Real dashboard records live in Supabase. The separate demo/local-onboarding flows still use `.redial` filesystem storage and are not migrated into authenticated accounts. Container replacement discards those local drafts unless separately persisted. They must remain clearly labeled previews. Do not treat the public local-admin preview as staff authorization. Before public launch, retire or explicitly isolate the local-only onboarding surfaces and complete the release gates.

No database migration runs automatically at container startup. Take backups and test restores in your normal release workflow before any later production migration. Web hosting alone does not run voice sockets or workers.

## Verification and remaining evidence

Completed locally on 2026-09-22 (2026-09-23 UTC): lint, typecheck, optimized build, all 92 kit hashes, all 75 reference checks, 17 named PostgreSQL assertions plus denial checks, 72 existing browser checks and two dashboard contract tests passed. Desktop and 390px dashboard screenshots were inspected. The Docker image built successfully and its isolated runtime returned health 200, unconfigured readiness 503 and sign-in 200. The first concurrent browser run lost two trace files because both configurations shared an artifact directory; after assigning dashboard artifacts a separate directory, the sequential final runs passed. No real Supabase, SMTP, staff MFA, provider, backup/restore or production-deployment evidence is claimed.

The local review server was rebuilt and restarted at `http://127.0.0.1:4317` (PID recorded in `.redial/server.json`). `/sign-in` remains configuration-gated until you supply Supabase settings and apply the migrations. `/demo/overview` remains explicitly synthetic.

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run verify:kit
npm.cmd run test:reference
npm.cmd run test:database
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm.cmd run test:e2e
npm.cmd run test:dashboard
docker build -t redial-dashboard:local-check .
```

`test:database` creates and removes an isolated PostgreSQL Docker container with no published port. It executes the actual migrations and permission assertions, including cross-workspace reads, billing/content separation, scoped grants, membership revocation, immutable scope, revision conflicts and staff MFA. Its small Auth schema emulates JWT context; it does not validate Supabase's hosted Auth issuance or gateway configuration.

`test:dashboard` drives the built app with Playwright against a separate local Auth/PostgREST contract test service. It checks sign-in, workspace creation, saved/reloaded/edited records, responsive navigation, denied operations access, session revocation and database failure without demo fallback. The test service is not imported into the app. These tests do not prove real SMTP, Supabase Auth, MFA or live-provider behavior.

Next gate: run confirmation/reset, two independent member accounts in different workspaces, explicit sharing/revocation, staff TOTP, support replies and persistence after container replacement against a development Supabase project. Retention workers, field-level sensitive-data handling, full invitation lifecycle, backup/restore and the remaining kit acceptance gates are still open. The existing ESLint 9 compatibility exception remains documented in `docs/M1-EVIDENCE.md` and must be resolved before release.

Implementation references: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), [Auth redirects](https://supabase.com/docs/guides/auth/redirect-urls), [Coolify Dockerfile builds](https://coolify.io/docs/applications/builds/dockerfile). Existing kit originals and landing edits were preserved; no external business source code was imported.


## Incoming-call setup preparation

Apply `202609250001_carrier_setup.sql` after the three dashboard/support/contact migrations. Numbers & setup now supports provider-aware, line-scoped setup drafts with optimistic concurrency. Saving a draft never changes line status or carrier settings. Connections lists the remaining implementation gates. See [live-launch preparation](LIVE-LAUNCH-PREPARATION.md) and [local evidence](release-evidence/2026-09-25-carrier-setup.md) before staging or planning a phone test.

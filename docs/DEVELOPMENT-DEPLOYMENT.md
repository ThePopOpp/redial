# Redial development on Coolify

This packages Redial for hosting behind a password gate. **The owner has chosen `https://redial.si` as the deployment target.** `dev.redial.si` also resolves and can be used for a second, separate Coolify application when a staging tier is wanted; both point at the VPS. Change the Coolify domain and `REDIAL_SITE_URL` together, never one alone — the access gate compares the request Host against the configured origin and will refuse every request if they disagree.

The landing page, phone animation, seven-step form, shared member/admin setup views, and synthetic control dashboard are preserved. Hosted writes now require the exact configured hostname, HTTPS origin, and development password. Cookies are Secure, HttpOnly, and SameSite=Strict. The password gates the entire website, including its API; only a content-free liveness endpoint is public.

**This is not customer authentication.** `/app` and `/ops` remain closed. The `/local/account` and `/local/admin` routes are two views of the same browser's preview submission, not separate authenticated accounts. The next M1 increment still needs Supabase identity, workspace membership, RLS and separate staff MFA before real customer onboarding. Insider, Gavel, Audible, Directory, billing, provider routing, and outgoing mail remain simulations or unavailable.

## Coolify application

1. Create an application from `https://github.com/ThePopOpp/redial.git`, branch **`main`**. The deployment foundation is included on `main` so the owner's existing Coolify application can keep its locked default branch. Choose **Dockerfile** as the build pack, repository root (`/`) as the base directory, `/Dockerfile` as the Dockerfile path, and port **3000** inside the container. Do not set a custom start command. Port 3000 is container-internal; leave host port mappings empty.
2. Set the domain to **`https://redial.si`**. Its `A` record already points at the VPS. Add `AAAA` only if IPv6 is actually routed. Coolify's reverse proxy must preserve Host and redirect HTTP to HTTPS. Expose only the reverse proxy's web ports publicly; do not publish the application port directly.
3. In **Environment Variables**, add the values from the root `.env.example` as **runtime** variables. Keep them out of build arguments. A prepared, Git-ignored `.env.coolify.local` exists on the development workstation with the Supabase project URL, publishable key and a generated preview password. Transfer it through Coolify's private environment editor; do not paste it into GitHub, logs, or chat.
4. Add persistent storage mounted at **`/app/.redial`**. Use a dedicated volume for this development application. The container runs as UID/GID **1000:1000**; a bind mount must be writable by that user. Do not mount the project source, an existing application volume, or a production backup.
5. Run **one application instance**. The current preview store uses process-local locking and JSON files; it is unsuitable for replicas or overlapping writers. Disable rolling/overlapping deployments for this application and stop the old instance before the replacement starts against the same volume.
6. Deploy. The Dockerfile provides a liveness check at `/api/health/live` on port 3000. Open the HTTPS URL and use the generated development username/password. Then visit `/api/health/ready` in that authenticated browser: it checks configuration and write access to the data volume.

The image uses pinned Node 24.15.0, pinned npm 11.12.1, locked dependencies, a multistage standalone Next build, and a non-root runtime. The Docker context uses an allowlist; `.env*`, `.redial`, editor configuration, reference assets and Git metadata never enter the build. No provider credentials are required at build time. `NODE_ENV=production` means the optimized Next runtime; `REDIAL_DEPLOYMENT=development` controls the deployment boundary.

## Environment settings

| Variable | Development value / purpose |
| --- | --- |
| `REDIAL_DEPLOYMENT` | `development`; other hosted modes fail startup |
| `REDIAL_SITE_URL` | `https://redial.si` (exact origin, no path; must equal the Coolify domain) |
| `REDIAL_DEV_USERNAME` | Preview login, e.g. `redial-review` |
| `REDIAL_DEV_PASSWORD` | Unique secret, at least 24 characters; prepared file contains a generated 43-character value |
| `REDIAL_DATA_DIR` | `/app/.redial`; mount persistent storage here |
| `SUPABASE_URL` | `https://jjdqeojubmwvxjfcljpk.supabase.co` — owner-confirmed development project |
| `SUPABASE_PUBLISHABLE_KEY` | Enabled `sb_publishable_...` key from that project; no service-role/server key needed in this increment |
| `TWILIO_ACCOUNT_SID` | Development account/subaccount's `AC...` SID |
| `TWILIO_AUTH_TOKEN` | Matching account/subaccount token; keep server-side |
| `REDIAL_EMAIL_PROVIDER` | `resend` for the owner's selected development setup; `disabled` and standalone `smtp` are also supported |
| `REDIAL_EMAIL_FALLBACK_PROVIDER` | `smtp` for Hostinger fallback; `disabled` to omit fallback. SMTP fallback requires Resend primary. |
| `EMAIL_FROM` | `hello@redial.si`. The Resend domain is verified: `resend._domainkey.redial.si` is published, and `send.redial.si` carries Resend SPF and the Return-Path MX. |
| `RESEND_API_KEY` | Set for Resend; prefer sending-only access for eventual delivery |
| `SMTP_HOST` | `smtp.hostinger.com` for Hostinger Email |
| `SMTP_PORT` / `SMTP_SECURE` | Owner-selected Hostinger settings: `465` / `true` (implicit TLS) |
| `SMTP_USER` / `SMTP_PASSWORD` | Full mailbox address and mailbox password, not the Hostinger account password |

Leave both Supabase values empty to omit it; leave both Twilio values empty to omit it. Partial provider configuration fails validation. SMTP requires TLS and certificate verification. Provider secrets are never `NEXT_PUBLIC_*` values. No feature flag or environment variable in this increment enables live call handling.

The owner selected **Resend primary, Hostinger SMTP fallback**. Both `.env.example` and the prepared `.env.coolify.local` record that choice. Add `EMAIL_FROM`, `RESEND_API_KEY`, `SMTP_USER` and `SMTP_PASSWORD` in Coolify before deploying with those settings. The missing values deliberately fail validation; no placeholder credential or sender address is treated as working. For a preview with no email configuration, set both email provider variables to `disabled`. IMAP/POP settings are not needed for outgoing mail.

This records and validates the fallback configuration; it does **not** implement automatic message failover. The later delivery worker needs durable message state and provider reconciliation before retrying through another provider, so an ambiguous Resend timeout does not send a duplicate through SMTP. Managed Supabase Auth's SMTP configuration is separate and does not inherit these application fallback settings.

## Applying the schema

Apply migrations **one file at a time**, in filename order, each as its own statement batch. The supported routes are `psql -1 -f <file>` per file, or one `apply_migration` call per file through the project-scoped Supabase MCP.

**Do not paste a concatenated buffer into the Supabase SQL editor.** The editor runs a pasted buffer statement by statement and commits each one, so the `begin;`/`commit;` wrapper inside each migration does not protect it: a failure half way through leaves the schema partly applied, with no transaction to roll back. The wrapper only works where the whole file is submitted as a single batch.

For the same reason, when sending a migration through `apply_migration`, strip the leading `begin;` and trailing `commit;` in transit and leave the file unchanged on disk. That API supplies its own transaction, and an inner `commit;` ends it early.

To read the whole schema in order - for review, or to pipe to `psql` - generate it rather than keeping a second copy:

```sh
node scripts/print-migrations.mjs > schema-to-apply.sql
```

Redirect the script directly. `npm run print:migrations > file` writes npm's banner lines into the file ahead of the SQL, and Postgres fails with `syntax error at or near ">"`; use `npm run --silent` if you prefer going through npm. The generated file is git-ignored.

`npm run test:database` applies the same sequence to a throwaway container, one file at a time, and runs the row-level-security suite against the result. That is the check that proves a migration set is coherent before it reaches a real project.

Then create the first platform owner with `supabase/bootstrap-owner.sql`, substituting the address at run time rather than editing the placeholder into the file. The account must have confirmed its email, and signing in at `/staff-sign-in` will require enrolling an authenticator before anything is visible.

## Worker application

`services/worker` is a second Coolify application, separate from the web container and built from its own Dockerfile against the same pinned lockfile:

```sh
docker build --file services/worker/Dockerfile --tag redial-worker:development .   # npm run build:worker
```

It is the only deployment unit permitted to hold `SQUARE_ACCESS_TOKEN`, `SQUARE_WEBHOOK_SIGNATURE_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. `npm run check:launch` fails the **web** environment if any of those names appear there, and `tests-node/launch-config.test.mjs` asserts each one is refused, so the boundary cannot be dropped without a test failing. Do not copy the worker's variables into `redial-web`.

Square webhooks point at the worker, never at the web application. Verifying a Square signature needs the signature key, the web tier may not hold it, and so the web tier cannot accept a Square notification at all. Set `SQUARE_WEBHOOK_URL` to the exact HTTPS notification URL configured in Square: the signature is computed over that string concatenated with the raw body, and the worker will not derive it from forwarded headers, because behind a reverse proxy a caller controls those.

Two switches gate live commerce and both default to off. `SQUARE_ENVIRONMENT=production` refuses to start unless `REDIAL_SQUARE_PRODUCTION_AUTHORIZED=yes` is also set, so a copied environment file cannot start charging real cards. `REDIAL_WORKER_PROVIDER_CALLS` separately gates outbound provider calls.

**What the worker does today:** accepts and verifies Square notifications, records them durably with deduplication, expires usage reservations, stale checkout quotes and abandoned leases, and reads approved billing operations.

**What it does not do:** create subscriptions, send refunds to Square, or grant entitlements. Those are gated rather than stubbed. A received event is recorded and verified, then retried and finally dead-lettered with a reason, rather than being marked processed as though it had an effect. No live charge, refund or subscription is possible from this increment.

## Voice gateway application

`services/voice-gateway` is a third Coolify application, separate from the web container and the billing worker, built from its own Dockerfile against the same pinned lockfile:

```sh
docker build --file services/voice-gateway/Dockerfile --tag redial-voice:development .   # npm run build:voice
```

Coolify: build pack **Dockerfile**, path `/services/voice-gateway/Dockerfile`, base directory `/`, container port **3002**, domain **https://voice.redial.si**, no persistent storage. It holds no data of its own.

It is a separate unit because a provider webhook can reach it. That is a different exposure profile from the web application, which sits behind Supabase auth, and from the worker, which is reachable only by Square. None of the three shares a container.

### Signature validation

Every webhook is checked before a single parameter is read, using `TWILIO_AUTH_TOKEN` as the signing key. Twilio signs the full request URL with the POST parameters appended, keys sorted. The URL is taken from `REDIAL_GATEWAY_ORIGIN` and never rebuilt from `X-Forwarded-Host`: behind a reverse proxy a caller controls that header and could choose the string being verified. A request that fails the check gets a 403 and no TwiML.

### Two switches, both off by default

| Variable | Default | Effect |
| --- | --- | --- |
| `REDIAL_GATEWAY_ENVIRONMENT` | `test` | `test` never bridges a call to a real handset, so the webhooks can be exercised before anyone's phone is in the path. |
| `REDIAL_GATEWAY_BRIDGE_CALLS` | `disabled` | Connecting a screened caller to a real destination. Requires `live` as well. |

With either switch off the gateway still answers, still screens, and still takes a message. It simply never rings a handset. That is the posture to deploy in first.

### How a line answers

Routing is per line in `line_routing`, not per deployment.

- `simple` asks who is calling and why, then offers the call to a verified destination with a whisper. The member must press 1; no keypress is a decline, so the destination's voicemail cannot answer on their behalf and report the call as connected.
- `ai` connects the caller to the assistant at `line_routing.ai_sip_uri` over SIP. Twilio and the assistant negotiate media directly and no audio passes through this process. `ai` with no URI configured takes a message rather than connecting a caller to nothing.
- `voicemail` takes a message without screening.

Recording is off unless a line sets `recording_enabled`. That is a legal decision in two-party-consent states, not a preference.

### Loop prevention

A destination is refused if it equals the number the carrier forwards from, the Redial number for that line, or the caller. It is enforced twice: a database trigger on `endpoints` at configuration time, and again in the gateway at call time, because a route can change after it was set up. A destination is also never rung until `verified_at` is set; ringing an unverified number on a caller's behalf turns screening into a dialer for someone else's traffic.

### Twilio configuration

On the number, set the Voice webhook to `https://voice.redial.si/twilio/voice` as **HTTP POST**. Leave the fallback URL empty until there is a tested fallback; a fallback that is not tested is a second untested path, not a safety net.

The number must exist in `phone_numbers` with `status = 'active'`, and the member's own mobile must exist in `endpoints` with `is_forwarding_source = true`. A dialled number resolving to zero rows, or to more than one, is refused rather than routed by whichever row came back first.

## Supabase Auth configuration

Set these in the Supabase dashboard under Authentication → URL Configuration. They are **not** application environment variables.

| Setting | Value |
| --- | --- |
| Site URL | `https://redial.si` |
| Redirect URLs | `https://redial.si/auth/callback**` and `http://127.0.0.1:4317/auth/callback**` |

The trailing `**` matters. The application sends people to `/auth/callback` for confirmation and to `/auth/callback?recovery=1` for password reset, and Supabase matches the whole URL including its query string. A bare origin such as `https://redial.si` does **not** match either, and an entry pointing at a path the application does not serve, such as `/login`, matches nothing at all. When no redirect matches, Supabase silently falls back to the Site URL, the confirmation code is never exchanged, and registration and password reset both fail without an error the person can act on.

`http://127.0.0.1:4317` is the loopback origin `npm run review` serves and the default `appOrigin()` returns. Use `http://127.0.0.1:3000/auth/callback**` instead if you work against `npm run dev`. Supabase matches the host literally, so `localhost` and `127.0.0.1` are different entries. Remove the loopback entry before launch.

Set custom SMTP in the same Authentication section, separately from the application's `REDIAL_EMAIL_*` variables, which Supabase does not read. Use Resend SMTP with `hello@redial.si` as the sender: the domain is verified, `resend._domainkey.redial.si` is published, and `send.redial.si` carries Resend SPF and the Return-Path MX, so DKIM aligns. Supabase's built-in mailer is limited to a handful of messages an hour and cannot carry invitations.

## Deployment modes

`REDIAL_DEPLOYMENT` selects the access boundary:

| Mode | Behaviour |
| --- | --- |
| `local` | Loopback only. No gate. The `/local/*` preview pages are reachable. |
| `development` | Exact Host match plus HTTP Basic authentication over the whole site. `/local/*` returns 404. |
| `public` | Exact Host match, no shared password. Supabase authentication protects `/app` and `/ops`. `/local/*` returns 404. `REDIAL_DEV_USERNAME` and `REDIAL_DEV_PASSWORD` must be unset, and configuration fails if they are present, so a leftover password cannot look like protection it is not providing. |

In every hosted mode the access gate compares the request `Host` against `REDIAL_SITE_URL`. Change the Coolify domain and that variable together or every request is refused with 403.

## Supabase, Twilio, and email checks

From Coolify's application terminal:

```sh
node scripts/check-environment.mjs
node scripts/check-providers.mjs
```

From the workstation, using the prepared environment file:

```powershell
node --env-file=.env.coolify.local scripts/check-environment.mjs
node --env-file=.env.coolify.local scripts/check-providers.mjs
```

The first command validates configuration and prints only status labels. The second makes explicit, read-only checks: Supabase Auth settings, Twilio account credentials/status, and email provider checks. With the selected setup, it reports **Resend primary** and **SMTP fallback** separately and checks SMTP even if the Resend check fails. It never sends email, dials, purchases a number, modifies a provider or prints provider response bodies. SMTP authentication does not prove delivery or sender acceptance. A Resend sending-only key cannot list domains; the check reports that limitation and exits unsuccessfully. Verify the domain in Resend's dashboard; doing so does not grant this key permission to list domains. Do not broaden a sending key's permissions just for this check.

Supabase project access was verified on September 25, 2026. Its public schema and migration history are empty. Security Advisor reported execute privileges for `public.rls_auto_enable()` under anon/authenticated; review that helper when implementing schema/RLS. No Supabase schema, grants or Auth configuration was changed here.

**Supabase Auth email is configured separately.** Variables in Coolify do not configure the managed Supabase service. When implementing sign-in, set its Site URL and explicit redirect allowlist to the chosen development origin and implemented callback routes, then configure custom SMTP in Supabase Auth. Use either Hostinger's mailbox SMTP credentials or Resend's documented SMTP credentials there. Preserve Hostinger MX records when adding Resend DKIM/SPF records; follow the sender provider's DNS values rather than inventing records.

Do not point Twilio webhooks at this password-protected Next preview. Signed telephony webhooks and persistent media sockets belong to the later dedicated gateway. No gateway routes are supplied by this increment.

## Verify, deploy and recover

```powershell
npm run lint
npm run typecheck
npm run test:deployment
npm run test:reference
npm run verify:kit
npm run build
docker build --tag redial:development .
npm run test:container
```

The container smoke test creates uniquely named temporary resources on a random loopback port. It checks unauthenticated denial, allowed-host/origin checks, health endpoints, secure cookies, shared form views, non-root execution and stored form data after restart. It removes only its own container, volume and temporary environment file. Existing servers on 3000, 3001 and 4317 are not changed by this test.

GitHub Actions runs the checks and selected browser regressions without provider secrets. It does not deploy to a VPS. The owner's Coolify development application tracks `main`; that branch name does not make the application a production release. Keep `REDIAL_DEPLOYMENT=development` and the password gate enabled. Any automatic deployment must target only this development application until release gates are complete.

September 25 local evidence: lint, typecheck, optimized local and Docker builds, 8 environment/access tests, all 75 reference tests, all 70 browser tests, and the 92-file kit integrity check passed. Container tests verified both shared form projections and persistence across restart. The configured credential values were absent from generated browser assets, and the prepared environment file was excluded from the container. Supabase's read-only key check passed; Twilio, email delivery, public DNS/TLS, VPS deployment and GitHub-hosted CI are not covered by that result.

For a development rollback: record the running commit/image, stop the application, take an access-controlled backup of the data volume, redeploy the previous passing commit against the same volume, and check readiness and a saved test submission. Keep the generated preview password stable across ordinary restarts; changing it intentionally requires reviewers to authenticate again. This increment has no database migrations to reverse. Persistent volume deletion is not part of rollback. Single-VPS hosting is not high availability, and offsite backups and a restore exercise remain operator tasks.

Use fictional data while customer identity and retention controls are unfinished. Drafts expire after eight hours; completed submissions stay on the development server until deleted. Both preview views depend on the originating browser cookie. Losing that cookie does not delete server data or grant another reviewer access.

Deployment still needs the owner's Coolify application target, DNS access/records, Twilio credentials, verified sender address, Resend API key, and Hostinger mailbox credentials. The email-provider choice is resolved. No production service, DNS, live call, or email delivery has been changed or tested.

## Missing Dockerfile in the first deployment

The owner's September 25 deployment fetched `main` at `fb315753057e9de031dfa35c66293d83a9301448` and failed before any application build: `failed to read dockerfile: open Dockerfile: no such file or directory`. That commit predates the Dockerfile and deployment foundation, which were initially pushed only to `development/coolify-foundation`.

Bring the existing deployment commits onto `main` with a fast-forward and deploy the latest `main` commit. The next deployment log must show a newer commit than `fb31575`. If Coolify still imports the old commit, check its source revision/commit pin and use the latest branch revision; clearing the build cache cannot add a file missing from the selected Git commit. Keep the Dockerfile build pack and root paths above. Do not paste only the Dockerfile into the older application: the image also requires the runtime configuration, startup scripts, access checks, and lockfile changes from the same foundation.

After the image builds, startup still validates the runtime variables and writable data volume. A subsequent configuration error is separate from the missing-file failure. A local build or GitHub push does not prove the VPS deployment succeeded.

September 25 branch-fix verification: lint, typecheck, all 12 deployment tests, the 92-file kit integrity check, the Docker image build (including the optimized Next build), and the isolated container smoke test passed. The container test covered authentication, host/origin restrictions, readiness, secure cookies, non-root execution, persisted onboarding after restart, and deletion. This fix changes deployment instructions and promotes the existing foundation; it does not change application behavior or configure the VPS.

## Official references

- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [Coolify Next.js deployment](https://coolify.io/docs/applications/framework-examples/javascript/nextjs) and [environment variables](https://coolify.io/docs/applications/configuration/environment-variables)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Hostinger email connection settings](https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email/)
- [Twilio Account resource](https://www.twilio.com/docs/iam/api/account)
- [Resend domain listing](https://resend.com/docs/api-reference/domains/list-domains) and [SMTP](https://resend.com/docs/send-with-smtp)
- [Nodemailer SMTP verification](https://nodemailer.com/smtp)

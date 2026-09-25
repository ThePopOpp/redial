# Redial development on Coolify

This increment packages the existing Redial preview for a **private development site**. Suggested URL: `https://dev.redial.si`, leaving `redial.si` available for the eventual launch. The owner can use the main domain for development by changing the Coolify domain and `REDIAL_SITE_URL` together. Neither hostname has been deployed or had its DNS changed by this increment.

The landing page, phone animation, seven-step form, shared member/admin setup views, and synthetic control dashboard are preserved. Hosted writes now require the exact configured hostname, HTTPS origin, and development password. Cookies are Secure, HttpOnly, and SameSite=Strict. The password gates the entire website, including its API; only a content-free liveness endpoint is public.

**This is not customer authentication.** `/app` and `/ops` remain closed. The `/local/account` and `/local/admin` routes are two views of the same browser's preview submission, not separate authenticated accounts. The next M1 increment still needs Supabase identity, workspace membership, RLS and separate staff MFA before real customer onboarding. Insider, Gavel, Audible, Directory, billing, provider routing, and outgoing mail remain simulations or unavailable.

## Coolify application

1. Create an application from `https://github.com/ThePopOpp/redial.git`, branch `development/coolify-foundation`. Choose **Dockerfile** as the build pack, repository root as the base directory, `/Dockerfile` as the Dockerfile path, and port **3000** inside the container. Do not set a custom start command.
2. Set the domain to **`https://dev.redial.si`**. Create a DNS `A` record named `dev` pointing to the VPS IPv4 address. Add `AAAA` only if IPv6 is actually routed. Coolify's reverse proxy must preserve Host and redirect HTTP to HTTPS. Expose only the reverse proxy's web ports publicly; do not publish the application port directly.
3. In **Environment Variables**, add the values from the root `.env.example` as **runtime** variables. Keep them out of build arguments. A prepared, Git-ignored `.env.coolify.local` exists on the development workstation with the Supabase project URL, publishable key and a generated preview password. Transfer it through Coolify's private environment editor; do not paste it into GitHub, logs, or chat.
4. Add persistent storage mounted at **`/app/.redial`**. Use a dedicated volume for this development application. The container runs as UID/GID **1000:1000**; a bind mount must be writable by that user. Do not mount the project source, an existing application volume, or a production backup.
5. Run **one application instance**. The current preview store uses process-local locking and JSON files; it is unsuitable for replicas or overlapping writers. Disable rolling/overlapping deployments for this application and stop the old instance before the replacement starts against the same volume.
6. Deploy. The Dockerfile provides a liveness check at `/api/health/live` on port 3000. Open the HTTPS URL and use the generated development username/password. Then visit `/api/health/ready` in that authenticated browser: it checks configuration and write access to the data volume.

The image uses pinned Node 24.15.0, pinned npm 11.12.1, locked dependencies, a multistage standalone Next build, and a non-root runtime. The Docker context uses an allowlist; `.env*`, `.redial`, editor configuration, reference assets and Git metadata never enter the build. No provider credentials are required at build time. `NODE_ENV=production` means the optimized Next runtime; `REDIAL_DEPLOYMENT=development` controls the deployment boundary.

## Environment settings

| Variable | Development value / purpose |
| --- | --- |
| `REDIAL_DEPLOYMENT` | `development`; other hosted modes fail startup |
| `REDIAL_SITE_URL` | `https://dev.redial.si` (exact origin, no path) |
| `REDIAL_DEV_USERNAME` | Preview login, e.g. `redial-review` |
| `REDIAL_DEV_PASSWORD` | Unique secret, at least 24 characters; prepared file contains a generated 43-character value |
| `REDIAL_DATA_DIR` | `/app/.redial`; mount persistent storage here |
| `SUPABASE_URL` | `https://jjdqeojubmwvxjfcljpk.supabase.co` — owner-confirmed development project |
| `SUPABASE_PUBLISHABLE_KEY` | Enabled `sb_publishable_...` key from that project; no service-role/server key needed in this increment |
| `TWILIO_ACCOUNT_SID` | Development account/subaccount's `AC...` SID |
| `TWILIO_AUTH_TOKEN` | Matching account/subaccount token; keep server-side |
| `REDIAL_EMAIL_PROVIDER` | `disabled` (default), `resend`, or `smtp` |
| `EMAIL_FROM` | Your verified sender address, e.g. `hello@redial.si` if you own that mailbox/domain |
| `RESEND_API_KEY` | Set for Resend; prefer sending-only access for eventual delivery |
| `SMTP_HOST` | `smtp.hostinger.com` for Hostinger Email |
| `SMTP_PORT` / `SMTP_SECURE` | `465` / `true`, or `587` / `false` with required STARTTLS |
| `SMTP_USER` / `SMTP_PASSWORD` | Full mailbox address and mailbox password, not the Hostinger account password |

Leave both Supabase values empty to omit it; leave both Twilio values empty to omit it. Partial provider configuration fails validation. SMTP requires TLS and certificate verification. Provider secrets are never `NEXT_PUBLIC_*` values. No feature flag or environment variable in this increment enables live call handling.

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

The first command validates configuration and prints only status labels. The second makes explicit, read-only checks: Supabase Auth settings, Twilio account credentials/status, and either Resend sender-domain verification or SMTP TLS/authentication. It never sends email, dials, purchases a number, modifies a provider or prints provider response bodies. SMTP authentication does not prove delivery or sender acceptance. A Resend sending-only key cannot list domains; the check reports that limitation and exits unsuccessfully until you verify the domain in Resend. Do not broaden a sending key's permissions just for this check.

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

GitHub Actions runs the checks and selected browser regressions without provider secrets. It does not deploy to a VPS. Use a known passing commit when configuring Coolify; automatic deploys should target only this development branch until release gates are complete.

September 25 local evidence: lint, typecheck, optimized local and Docker builds, 8 environment/access tests, all 75 reference tests, all 70 browser tests, and the 92-file kit integrity check passed. Container tests verified both shared form projections and persistence across restart. The configured credential values were absent from generated browser assets, and the prepared environment file was excluded from the container. Supabase's read-only key check passed; Twilio, email delivery, public DNS/TLS, VPS deployment and GitHub-hosted CI are not covered by that result.

For a development rollback: record the running commit/image, stop the application, take an access-controlled backup of the data volume, redeploy the previous passing commit against the same volume, and check readiness and a saved test submission. Keep the generated preview password stable across ordinary restarts; changing it intentionally requires reviewers to authenticate again. This increment has no database migrations to reverse. Persistent volume deletion is not part of rollback. Single-VPS hosting is not high availability, and offsite backups and a restore exercise remain operator tasks.

Use fictional data while customer identity and retention controls are unfinished. Drafts expire after eight hours; completed submissions stay on the development server until deleted. Both preview views depend on the originating browser cookie. Losing that cookie does not delete server data or grant another reviewer access.

Deployment still needs the owner's Coolify application target, DNS access/records, Twilio credentials, and email-provider choice/credentials. No production service, DNS, live call, or email delivery has been changed or tested.

## Official references

- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [Coolify Next.js deployment](https://coolify.io/docs/applications/framework-examples/javascript/nextjs) and [environment variables](https://coolify.io/docs/applications/configuration/environment-variables)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Hostinger email connection settings](https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email/)
- [Twilio Account resource](https://www.twilio.com/docs/iam/api/account)
- [Resend domain listing](https://resend.com/docs/api-reference/domains/list-domains) and [SMTP](https://resend.com/docs/send-with-smtp)
- [Nodemailer SMTP verification](https://nodemailer.com/smtp)

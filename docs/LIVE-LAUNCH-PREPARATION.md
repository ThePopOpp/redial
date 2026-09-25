# Live-call launch preparation

Status: **not ready for live calls or public launch**. Updated September 25, 2026.
This is a preparation increment, not completion of M1–M9. No number was purchased,
no carrier settings changed, no live calls/emails made, and nothing deployed.

## What you can review now

- `/demo/numbers` → **Set up incoming calls**: animated, step-by-step provider setup preview. Use fictional details. It does not persist personal information.
- `/app/numbers`: the same flow saves a private setup draft in Supabase. Requires the migrations below, a verified account, current workspace membership and line `manage_rules` permission. Personal and business workspaces use the same line-level boundary.
- `/app/connections`: implementation gates, separate from provider connection status.
- `npm run check:launch -- .env.local`: offline, redacted configuration report. A blocked exit is expected until implementation and deployment gates are resolved. It does not contact providers or enable anything. Passing syntax checks is not successful authentication or a live test.

The existing **Phone setup simulator** is a contacts/home-screen walkthrough. The
new **Set up incoming calls** flow is the separate telephony setup experience.

## Carrier coverage and user journey

The goal is broad carrier support through a hosted programmable number. Redial
only receives a cellular call if the provider delivers it to that number. A web
app install does not intercept arbitrary cellular calls.

1. Create and verify the account; choose a personal or business workspace and line.
2. Select country, provider, phone type/model, OS and plan. The current named carrier guidance is US-specific. Other countries use **Other provider** pending review.
3. Choose a dedicated number, conditional forwarding, or all-call forwarding.
4. Review the provider's official guide and obtain the reversal/voicemail procedure.
5. Save the setup draft. This is not compatibility evidence and cannot change `lines.status`.
6. **Future operator-gated flow:** verify ownership, assign the exact Twilio number, approve the consent/fallback policy and usage budget; test that number directly first.
7. Only after explicit authorization, the user changes forwarding for their own line. Test from a second phone and record actual arrival, caller ID, consent, inbox delivery, fallback and reversal evidence.
8. Activate only the tested capabilities for that exact configuration. Retest after changing the carrier, plan, destination or relevant routing settings.

| Provider | Current evidence | Current app behavior |
|---|---|---|
| Mint Mobile | Official forwarding guide includes all, unanswered, out-of-service and busy/unreachable cases | Select Mint, save the requested condition, review official instructions; no generated dialing code |
| T-Mobile | Official short-code forwarding documentation | Separate provider row; no assumption that another T-Mobile-network plan behaves identically |
| Verizon | Official forwarding FAQ | Review carrier-supported condition and plan limitations |
| AT&T | Official wireless forwarding help | Device/plan-specific confirmation required |
| Other / international | No Redial compatibility proof | Save provider details; obtain official confirmation or explore a dedicated number where available |

Documentation was reviewed on September 25, 2026. None of these rows has a
verified Redial live-call test. The UI intentionally provides no activation code
while there is no assigned, tested destination. Never forward to a demo number.
Conditional forwarding may let the mobile ring first and does not selectively
intercept “unknown” callers. All-call forwarding may bypass normal ringing and
voicemail. Never ring back to the same number forwarding into Redial.

Official references:
- [Mint forwarding](https://www.mintmobile.com/help/how-to-turn-on-off-call-forwarding/)
- [T-Mobile short codes](https://www.t-mobile.com/support/plans-features/self-service-short-codes)
- [Verizon forwarding](https://www.verizon.com/support/call-forwarding-faqs/)
- [AT&T wireless forwarding](https://www.att.com/support/article/wireless/KM1011513/)

## Accounts and items to prepare

| Item | What is needed | Status / handling |
|---|---|---|
| VPS + Coolify | Resource inventory, existing applications/ports, disk, firewall, backup target, operator access | User has VPS. Inventory before any changes; single VPS is not HA. |
| Domain / DNS | Actual domain; proposed `app.<domain>`, `voice.<domain>` and email sender subdomain | Domain value pending. Keep existing mail records intact. |
| Supabase | Separate staging and production projects, URL/publishable key, email auth, migrations, backups | User has Supabase. Managed vs self-hosted remains to confirm. |
| Twilio | Account SID/auth token in gateway only, authorized voice-capable pilot number, approved geographic permissions, account spend alerts | User has Twilio. Do not buy/port/configure a number without authorization. Trial restrictions must be checked before the pilot. |
| xAI | API account/key with Voice API access, evaluated model/voice, spending controls | Additional service required by the approved voice design. No key needed in the web app. |
| Resend | Verified sender domain, DKIM/SPF per its dashboard, sender address, restricted server API key, delivery monitoring | User has Resend. Auth SMTP and app notifications are separate integrations. |
| Square | Sandbox seller/application and webhook configuration; production only after lifecycle tests | Required for the v1.1 paid plans, not for merely reviewing the setup UI. |
| Monitoring | External HTTPS/WSS checks, private error tracking, alert recipient, on-call owner | Choose tooling before live pilot; avoid raw audio/transcripts/phone numbers in logs. |
| Recovery | Encrypted off-VPS backups, retention policy, restore drill, previous image/config references | Needed before live pilot. A backup without a restore test is not recovery evidence. |
| Phones | Mint phone plus a second caller phone, exact device/OS/plan, optional independent fallback destination | Physical tests happen only after the call engine and safe pilot route exist. |

## Deployment layout

| Coolify resource | Public entry | Credentials / responsibilities | Implemented? |
|---|---|---|---|
| Web | `https://app.<domain>`, container port 3000 | Root `Dockerfile`; runtime `APP_BASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`; server identity/RLS | Yes, staging verification pending |
| Voice gateway | `https://voice.<domain>` + secure WebSocket upgrades | Separate persistent Node service; Twilio ingress signatures, account/line mapping, xAI session, coordinator, consent, quotas and drain | **No** |
| Worker | No public listener | Durable leased jobs; call completion, bounded retry/dead-letter, Resend, retention, reconciliation | **No** |
| Supabase | Managed endpoint or secured separate deployment | Auth/Postgres/RLS; privileged runtime credentials isolated from web | Dashboard schema implemented; voice/job schema still required |

Do not create fake gateway/worker containers from the web image. They need their
own reproducible images, health/readiness endpoints, shutdown/drain behavior and
tests before deployment. The web health endpoints do not prove that calls work.
`/api/ready` currently checks configuration and Auth reachability only.

### Staging web procedure (requires separate deployment authorization)

1. Record the exact Git revision and local changes used for the image; do not pretend this dirty workspace is a committed release. Run lint, typecheck, build, database and browser checks first.
2. Create an isolated staging Supabase project. Apply, in order:
   - `202609230001_dashboard.sql`
   - `202609230002_support.sql`
   - `202609230003_contact_import.sql`
   - `202609250001_carrier_setup.sql`
3. Configure Supabase Site URL and exact `<APP_BASE_URL>/auth/callback` redirect, verified-email signup and custom auth SMTP. Verify signup/reset/invite flows and staff MFA against the real project. The HTTP test double does not prove hosted Supabase configuration.
4. Configure the root Dockerfile in Coolify, internal port 3000, non-root runtime, HTTPS domain, runtime variables from `.env.example`. Do not publish the container port directly to the internet. Do not copy `.env.local` into the image.
5. Check `/api/health`, `/api/ready`, verified sign-in, each migration-backed workflow, cross-workspace isolation, revocation, draft concurrency and correct mobile URLs. Test from the physical phone over HTTPS.
6. Leave the preview notice and call controls inactive. A successful web deployment is not permission to configure forwarding.

### Voice work still required before a pilot

- Implement the separate gateway with validated Twilio signatures on HTTP and WSS, exact public callback URL handling, tenant/line/account/number mappings and replay/idempotency defenses.
- Implement persistent call coordinator ownership/fencing, durable event ingestion and jobs. Never authorize from client state or user-editable metadata.
- Bridge verified Twilio μ-law 8 kHz frames to a documented xAI audio format; test session initialization, barge-in/clear, no-speech, disconnect, stalled audio and the 120-second proposed cap. Gate all model tools server-side.
- Implement caller disclosure/consent with a no-AI alternative, content minimization, retention and per-line permissions. No audio recording by default without an approved policy.
- Enforce concurrency, duration, daily usage and provider spend budgets before opening paid sessions. Approve account limits before any real tests.
- Persist call completion and useful messages scoped to the correct workspace/line. Implement retention and Resend notification jobs with leases, idempotency, bounded retries, dead-letter inspection and generic inbox links (no transcript in email by default).
- Configure and test an independent provider-hosted fallback that survives total VPS failure. Prevent all direct/alias/chain forwarding loops.
- Prove the conference-first topology with an independent AI participant before enabling **Insider**, **Gavel**, **Audible** or **Directory**. A direct-stream screening pilot, if separately chosen, must keep those controls unavailable.
- Implement Square lifecycle and reconciled entitlements before paid public access. Keep mobile apps, extension, growth and agent milestones in the v1.1 backlog; they are not delivered by this wizard.

Relevant provider contracts: [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams),
[Twilio webhook security](https://www.twilio.com/docs/usage/security),
[xAI voice](https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech),
[Resend email API](https://resend.com/docs/api-reference/emails/send-email).

## Evidence required for the first Mint pilot

Record test date, authorized test number reference, account/CallSid references
(in private evidence), workspace/line, carrier, country, plan, model/OS, route and
condition, configuration/policy version, outcome and measured cost. Never store
credentials or raw private call content in the repository.

| Test | Required result | Evidence now |
|---|---|---|
| Direct inbound to assigned number | Correct line, disclosure, bounded screening, inbox | Not run |
| No-answer / chosen forwarding condition | Confirm actual handset ringing, destination, caller ID and voicemail | Not run |
| All-call path, if separately requested | Intended ringing and rollback; no loop | Not run |
| Caller decline / no speech / long call | Tested alternative and finite usage | Not run |
| AI failure / database outage / VPS outage | Caller receives the approved independent fallback | Not run |
| Restart and duplicate events | No lost ownership, duplicate messages or charges | Not run |
| Wrong tenant / removed member | No call content or controls exposed | Local DB boundaries tested; live test pending |
| Email retry / retention | No duplicate notification, expired content deleted | Not implemented |
| Disable forwarding / restore voicemail | Original behavior restored on physical phone | Not run |
| Budget and cost review | All physical legs and AI usage reconciled within approved limits | Not run |

Pilot success is not universal compatibility. Add a tested registry row for each
provider/plan/device/route configuration before publishing it as supported.

## Rollback and incident checklist

1. Stop new AI admissions while allowing bounded active calls to drain; gateway implementation required.
2. Move incoming traffic to the previously tested provider-hosted fallback, using an authorized operator action.
3. If appropriate, have the line owner reverse forwarding using the verified carrier procedure and test ringing/voicemail. Pausing screening does not undo forwarding.
4. Restore the previous immutable application images/config. This migration is additive; retain draft data rather than dropping tables during an application rollback.
5. Restore Supabase into an isolated project during a drill, verify permissions and record recovery time/loss window before claiming backup readiness.
6. Review metadata-only incident evidence, costs and retry/dead-letter queues before re-enabling. Never automatically release a number during rollback.

## Local evidence for this increment

See `docs/release-evidence/2026-09-25-carrier-setup.md`. Production signoff,
infrastructure inventory, domain configuration, physical calls, billing, email,
restore and security review remain open. The existing ESLint 9 compatibility
exception remains unchanged; dependencies were not upgraded for this increment.

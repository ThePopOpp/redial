# Redial

A runnable local web review of Redial v1.1, preserving the complete build kit and its ordered acceptance gates. The member and operations workspaces use persistent synthetic data, including interactive Insider, Gavel, Audible and Directory simulations. Real authentication, provider integrations and native clients are still pending; this is not the completed production system.

## Development hosting

The project now includes a password-protected Docker deployment for Coolify, persistent preview storage, and runtime configuration checks for Supabase, Twilio, Resend or Hostinger SMTP. Start with [the development deployment guide](docs/DEVELOPMENT-DEPLOYMENT.md) and [.env.example](.env.example). The suggested hostname is `dev.redial.si`. Live customer accounts, calling and email delivery remain pending; adding provider variables does not activate them.

## Review locally

Use Node 24 (tested 24.15.0) and npm 11 (tested 11.12.1).

```powershell
npm ci --ignore-scripts
npm run build
npm run review
```

Open **http://127.0.0.1:4317/** for the Three.js call journey and seven-step onboarding form, or **http://127.0.0.1:4317/demo/overview** for the member review. Port 4317 avoids common 3000/3001 listeners. The server binds only to loopback. No environment file or provider account is required for the review. Ctrl+C stops the foreground process.

Use the sun/moon button in the header to switch between light and dark mode. Your preference follows you across the website, member workspace and operations dashboard. Forms share branded shadcn/Radix controls; callback scheduling uses a custom calendar and hour/minute/AM–PM selectors.

For a hidden background process with a port check, HTTP readiness check and local logs:

```powershell
powershell -File scripts/start-review.ps1
```

The script records its process in `.redial/server.json`; it never stops an existing listener. Use `-Port 4318` if 4317 is occupied. For live source editing, use `npm run dev -- --port 4317` instead of the optimized review server.

| Route | Review experience |
| --- | --- |
| `/` | Reversible Three.js call journey; phone zoom into seven-step onboarding |
| `/#onboarding` | Real local setup draft with validation, save/resume, review and deletion; no activation |
| `/local/account`, `/local/admin` | Shared submitted setup, review status and member-visible notes for this browser; local account previews |
| `/demo/overview` | Member overview and recent example activity |
| `/demo/calls` | Search/filter, transcripts, outcomes and callback reminders |
| `/demo/live` | Shared state simulator for Insider, Gavel, Audible and Directory |
| `/demo/screening`, `/demo/agent` | Policy editor/evaluator and assistant configuration |
| `/demo/directory`, `/demo/contacts`, `/demo/people` | Approved destinations, contact preferences and line-permission review |
| `/demo/numbers`, `/demo/onboarding`, `/demo/connections` | Setup walkthrough and truthful service-readiness states |
| `/demo/billing`, `/demo/settings`, `/demo/help` | Simulated membership, privacy preferences, export/reset and support requests |
| `/demo/ops` | Operations, support replies, simulated refunds, CRM, content, campaigns, approvals, tasks and audit |
| `/demo/mobile`, `/demo/extension` | Responsive web companion previews; no native or extension installation |
| `/app/*`, `/ops/*` | Closed until real identity, workspace access and separate staff MFA exist |

Demo edits persist for eight hours in `.redial/reviews/`, isolated by an opaque HTTP-only browser cookie. Use fictional information in `/demo`. The landing-page onboarding form stores the details you choose to enter separately in `.redial/onboarding/`, with its own cookie. Unsubmitted drafts expire after eight hours; completing the form with the storage acknowledgment saves a persistent profile shared by the local member and admin views until explicitly deleted. Neither flow creates an authenticated account or activates a service. Calls, charges, email and campaigns remain simulated; providers are not configured. Microphone/camera access stays disabled. Fonts and UI assets are local.

## Verify

```powershell
npm run lint
npm run typecheck
npm run build
npm run test:reference
npm run verify:kit
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e
```

Playwright starts/stops a separate local test server at port 3210. On systems without Edge, install Playwright Chromium with `npx playwright install chromium` and omit `PLAYWRIGHT_CHANNEL`. Windows sandbox restrictions may block browser/server teardown; use a normal local terminal. The suite covers domain transitions, API isolation/origin/idempotency/concurrency, interactive workflows, responsive layouts, keyboard navigation and selected automated WCAG checks. It does not establish provider, RLS, native-device or production security evidence.

ESLint 9.39.5 is a documented development-tool compatibility exception: Next 16.3.5's bundled plugins failed with ESLint 10 in this workspace. Resolve it before release; see [decisions](docs/DECISIONS.md).

## Working records

- [Shared form controls and appearance](docs/APPEARANCE-AND-FORMS.md)
- [Three.js landing, onboarding and validation](docs/LANDING-EXPERIENCE.md)
- [Completed setup handoff and local account boundaries](docs/ONBOARDING-HANDOFF.md)
- [Local review behavior, evidence and remaining gates](docs/LOCAL-REVIEW.md)
- [M0 inventory](docs/M0-INVENTORY.md), [reuse provenance](reuse-manifest.json), [decisions](docs/DECISIONS.md)
- [Ordered implementation plan](docs/IMPLEMENTATION-PLAN.md)
- [Historical first-increment validation](docs/M1-EVIDENCE.md)
- [Original handoff](redial-build-kit/00-START-HERE.md), preserved byte-for-byte

The next acceptance gate is real development authentication, workspace membership and distinct staff roles with MFA. Supabase/RLS, voice gateway/workers, sandbox commerce, native clients, provider-tested controls and release review follow in order. Production services have not been changed.

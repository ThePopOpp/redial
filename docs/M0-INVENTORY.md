# M0 inventory — 2026-09-19

## Starting workspace

`C:/Users/jwate/Projects/Redial/Redial GPT` initially contained only `redial-build-kit/` (92 files). No root or ancestor AGENTS.md was found. The kit's AGENTS.redial.md and ordered handoff were read. No existing application files were replaced. A SHA-256 baseline of every kit file is recorded in `docs/evidence/kit-baseline.json` for verification after implementation.

| Area | Observed baseline |
| --- | --- |
| Git | `git status --short` reports not a Git repository; no branch, tracked diff or commit exists. Do not describe this as a clean Git checkout. |
| Runtime | Windows PowerShell; Node v24.15.0; npm 11.12.1; Git 2.46.2.windows.1 |
| Framework / dependencies | No application manifest, installed dependencies or lockfile. Kit reference manifests are proposals only. |
| Routes / UI | No application routes. Three original HTML prototypes plus support.js and ios-frame.jsx are visual references, not an app. |
| Auth / tenancy | No session implementation, memberships, workspace state or staff authorization. |
| Data / storage | No application schema, migrations, RLS, private storage or Realtime configuration. |
| Providers | No implemented or configured Twilio, xAI, Square, Resend or other adapter. No call topology or endpoint tokens exist. |
| Tests | 75 isolated kit reference tests pass; no application typecheck/build command existed. |
| Deployment | No app Dockerfile, CI, Coolify config, DNS config or production credentials in this workspace. No remote service state inspected or changed. |

Baseline command: `node --test redial-build-kit/reference-code/policy.test.mjs redial-build-kit/reference-code/live-controls.test.mjs` → 75 passed, 0 failed. This proves only the kit's isolated policy/state examples. Typecheck/build at baseline: not applicable, no app manifest.

## Read-only engineering reference review

Inspected repository metadata, recursive file trees and selected source files through GitHub GET calls. No clones, customer data, environment files or source-company code were copied into the app. Neither source application was installed, built or audited comprehensively. Both repository metadata responses report `license: null`, and the inspected trees contain no license file. Confirm ownership/reuse rights before copying any source implementation.

| Repository | Pinned source revision | Lockfile-resolved versions (not locally installed) |
| --- | --- | --- |
| ThePopOpp/ctrl-p | `6237ce2c722dc9eb73860aeeb73d7fdcc044290d` | Next 15.5.18, React 19.2.6, Tailwind 3.4.19, TypeScript 5.9.3, Supabase SSR 0.10.3, Twilio Voice SDK 2.18.3 |
| Qallus/Channel-Cast-OS | `ba9e5ff50bf532e6eaaf40f323e14bfbf4b69078` | Next 15.5.20, React 19.2.7, Tailwind 3.4.19, TypeScript 5.9.3, Supabase SSR 0.10.3, Twilio Voice SDK 2.18.3 |

Both declare Next `^15.1.6`; that declaration is distinct from the lockfile values above. Do not inherit these versions: the official August security release identifies patched lines 15.5.24 / 16.3.3. See [Next security release](https://nextjs.org/blog/august-2026-security-release) and [support policy](https://nextjs.org/support-policy). The npm registry currently resolves Next 16.3.5 and React 19.3.0. The new app will pin its tested dependencies and preserve package-lock.json.

Concrete source observations:

- CTRL+P `lib/admin/server-auth.ts` verifies a bearer token with getUser and an active database role before creating a privileged client. It does not establish Redial line grants or staff MFA. Reject direct import.
- Channel Cast `lib/supabase/server.ts` has a request-scoped SSR cookie client; its middleware returns NextResponse.next when config is absent or verification throws. Reject those fail-open paths. Its login form consumes an unchecked next parameter; Redial will need a same-origin redirect allowlist.
- CTRL+P Button/Table use Radix Slot, CVA, semantic table tags and shared classes. Channel Cast sidebar groups links but is coupled to its admin navigation and defaults its role label to Super Admin. Use these as structural references; build original Redial shells and source primitives from official shadcn.
- CTRL+P extension is MV3 with a side panel and an event-driven worker. Runtime messages are cast, and the sender is ignored. Remove cookie/screenshot/product-harvest permissions and implement runtime schemas/sender validation before any adaptation.
- Both communications components contain Voice SDK registration and call callbacks. CTRL+P supplies a raw To to connect and client mute; Channel Cast has recording initially true and unrelated outbound campaigns. These are not Redial's line-scoped, provider-muted Insider or AI-detaching Gavel. Do not import.
- Channel Cast Dockerfile uses locked install and standalone stages, but runs without a USER directive and carries agent/.data assumptions. Consider the pattern at M9 only; no deployment artifact in this increment.

Exact paths, classifications, target boundaries and dependency assumptions are in `reuse-manifest.json`.

## Domain, environment and threat decisions

The entire v1.1 scope remains in the ordered plan, including Insider, Gavel, Audible and Directory. Numbered docs 00–21, entry/stage prompts and the three HTML prototypes inform the plan. Source preview runtime and unsafe demo claims are excluded.

- One Next control plane at the project root initially. Persistent voice sockets and async jobs belong in later separate services; do not scaffold unused services today.
- Later domains: identity/workspaces, line grants, screening policy, provider adapters/capabilities, consent, calls/control operations, usage, billing/entitlements and durable events. Household payer authority never implies another adult's content/audio access.
- Live controls require a versioned conference call with independent caller, AI, listener and human/destination participants. One fenced coordinator serializes takeover and transfer. Audible targets the current AI session; Directory uses approved route IDs and action-bound custom-number approval. Implementation starts after secure data and call foundations, not in M1 buttons.
- Local M1 needs no credentials, external calls, migrations or provider SDKs. Only synthetic fixtures are served. Future local/dev, staging and production credentials/data stay separate. Use localhost for this increment; no owned production domain is assumed.
- Threat priorities: forged tenant/line IDs, household/staff privilege confusion, stale/revoked sessions, caller/tool prompt injection, replayed callbacks, duplicate dialing/charges, forwarding loops, toll fraud and accidental private-content logging. M2 must demonstrate cross-tenant and grant revocation denial, not just signed-in checks.
- Member and staff route trees will fail closed until server-verified identity/membership and separate staff role+MFA exist. Public demo routes cannot confer authority. No client roles, demo cookie or environment toggle may unlock private routes.

Supabase skill reviewed for future work. Its markdown changelog endpoint could not be read by the web tool; the HTML [changelog](https://supabase.com/changelog) and [SSR client guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client) were reviewed instead. Current managed API, self-hosted gateway and Realtime changes do not require changes to this credential-free shell. Reverify docs when implementing M1 auth/M2; no Supabase SQL or SDK work occurred here.

## Smallest safe M1 increment

Build an original branded home, how-it-works/compatibility/pricing information scaffolds, an explicitly public synthetic Calls preview, and separate locked member/staff entry surfaces. Add semantic tokens, one reviewed shadcn primitive, responsive navigation, local fonts, error/loading/not-found states and indexing protection. Display the four named controls as planned information, with no call-action handlers. Keep all prices proposed and purchases unavailable.

Validate pinned install, lint, TypeScript, local production build and browser checks for demo labeling, keyboard navigation, responsive overflow, automated accessibility, and denial of private-route access even with forged role/demo input. Verify the kit hashes are unchanged. Record actual outcomes separately in M1 evidence.

This is an M1 increment, not full M1 completion. Next gate: remaining member/staff route shells plus real development auth, workspace membership, separate platform staff role+MFA and allow/deny tests before M2 data core. Follow `IMPLEMENTATION-PLAN.md` thereafter.

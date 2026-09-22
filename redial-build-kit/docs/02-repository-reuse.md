# 02 · Repository reuse and isolation plan

## Targeted observations from the connected GitHub repositories
Reviewed on September 18, 2026. These observations describe files, not a successful build or complete functionality audit.

| Repository/file | Observed | Reuse opportunity / caution |
|---|---|---|
| `ThePopOpp/ctrl-p/package.json` | Next `^15.1.6`, React `^19.0.0`, Supabase, Twilio/Voice SDK, Radix primitives, Vitest, `build:extension` | Strong first engineering reference. Versions are ranges, not installed-version evidence. |
| `ThePopOpp/ctrl-p/extension/manifest.json` | Manifest V3, side panel, service worker, `activeTab`, `scripting`, `storage`, `cookies`, ControlP host | Reuse structure, not brand, product capture permissions or account-cookie strategy. |
| `ThePopOpp/ctrl-p/extension/src/background.ts` | Side panel setup, on-demand active-tab content injection, typed worker messages and error handling | Reuse message boundaries. Replace product capture and screenshots with explicit phone-number/inbox actions. Validate senders and messages. |
| `Qallus/Channel-Cast-OS/package.json` | Next/React/Supabase/Twilio; Recharts; editor components; typecheck/test scripts | Candidate dashboard/chart/editor patterns; evaluate dependency weight. |
| `Qallus/Channel-Cast-OS/README.md` | Public/authenticated surfaces and business/agent documentation organization | Reuse documentation structure, not claims that every documented feature exists. |
| `Qallus/Channel-Cast-OS/Dockerfile` | Multi-stage Node image and Next standalone deployment for Coolify | Useful packaging pattern. Add non-root runtime, resource policies and Redial-specific volumes. Do not copy device agent and `.data` assumptions. |

The Channel Cast directory listing also exposes CRM, marketing, email, operations and dashboard areas. Their business logic was not fully reviewed. Search returning no Square matches does not establish that Square code is absent.

## Recommendation
Use **CTRL+P as the first engineering reference**, borrowing approved operations/dashboard patterns from **Channel Cast**. Start with a clean Redial application boundary instead of renaming an entire company platform. Confirm this choice after the local inventory and a build of the actual locked dependencies.

This recommendation is based on observed extension/test infrastructure and shared technologies, not a claim that CTRL+P is universally more mature or secure. A full fork may be faster only if a local audit shows low coupling and sound authorization. Do not make that assumption from the README.

## Safe import workflow
1. Commit or otherwise safely preserve the current Redial workspace state. Record dirty/untracked files; do not delete them.
2. Inspect both references read-only outside the application's runtime/import paths. Use existing authorized local clones, or clone into a ignored reference folder. Do not copy `.env`, `.git` histories containing secrets, customer uploads, production data or key material.
3. Record each candidate module's source repository, path, commit and dependencies in `reuse-manifest.json` before copying.
4. Classify modules: reusable as-is, adapt behind interface, or reject. Prefer component primitives, layout scaffolds, validation, API clients and test conventions over vertical business workflows.
5. Map original auth and data access assumptions against Redial tenancy. A source “admin” check is not automatically valid for multi-tenant members or platform staff.
6. Introduce Redial brand tokens and a single navigation configuration. Strip print catalog, ad-space/device, unrelated lending, old campaigns, original company names, hardcoded domains, dummy customers and live integrations.
7. Add tests around adapted behavior and build Redial with a new Supabase project and separate provider credentials.
8. Keep a rollback commit and review the diff. Do not change original repositories or their production integrations.

## Reuse acceptance matrix
| Candidate | Copy only when |
|---|---|
| Auth/session helpers | Server verification, redirect allowlists, cookie handling and tenant membership checks pass tests |
| Sidebar/layout | Keyboard/mobile behavior works; no source company routes or permissions remain |
| Tables/forms/dialogs | Types, validation, loading/empty/error states and accessible semantics are retained |
| Twilio client integration | Access tokens are short-lived and server minted for a verified tenant/line; arbitrary outbound dialing is impossible |
| Email templates | Redial verified sender, consent category, footer and suppression handling are explicit |
| Extension transport | Redial-only origins, explicit auth, validated messages and no cookie harvesting |
| Coolify build pattern | Actual locked framework builds; secrets absent from layers; non-root process; correct health endpoint |

## Framework version policy
Do not clone the old dependency declarations blindly. Verify the lockfile, actual resolved versions, security advisories and compatibility of Next, React, shadcn/Radix and native SDKs. Either stay on a supported patched line with a documented reason or perform a tested upgrade in its own milestone. Do not mix incompatible Tailwind generations or replace all UI components simply because a CLI template uses a newer version.

## Scope of verification
The review did not execute either application, inspect every API route, audit all RLS policies, or validate source deployment. The deliverable contains a migration/reuse plan—not a certification of either source repository.

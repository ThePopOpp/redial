# First local M1 increment — 2026-09-19

M0 inventory and a reviewable first M1 slice are complete. Full M1 remains open. No production services, source repositories, phone routes, provider accounts or customer data were changed.

## Result

Added a pinned Next 16.3.5 / React 19.3.0 / TypeScript application at the previously empty app root. Public home, how-it-works, compatibility and proposed pricing routes use Redial's graphite/violet identity and locally bundled DM Serif Display, Inter and Roboto Mono. Official shadcn Button is adapted under MIT; no business-reference code was imported.

The member-style preview is public at `/demo/calls`, with a typed synthetic message, navigable example transcript and a genuinely empty live view. Every demo is labeled. Insider, Gavel, Audible and Directory appear as planned descriptions with availability reasons, not executable call buttons. A member route always redirects to member sign-in unavailable; a staff route always redirects to the separate staff sign-in unavailable. These are fail-closed placeholders, not implemented authentication or authorization.

No credentials, migrations or provider configuration are needed. No provider SDK, service client, API write handler, checkout, recording, voice transport, deployment or campaign capability was added. Prices and quotas are display-only proposals copied accurately from v1.1. No automatic billing or live feature switch exists to turn on.

## Actual checks

| Command/check | Actual result |
| --- | --- |
| `node --version`, `npm --version`, `git --version` | Node 24.15.0; npm 11.12.1; Git 2.46.2.windows.1 |
| `git status --short` at baseline | Not a Git repository; no application commit or branch to report |
| `node --test redial-build-kit/reference-code/policy.test.mjs redial-build-kit/reference-code/live-controls.test.mjs` | 75 passed, 0 failed (isolated reference policies only) |
| npm registry queries | Next 16.3.5 / React 19.3.0 / Tailwind 4.3.3 verified; exact application versions in package-lock.json |
| `npm ci --ignore-scripts --no-fund --fetch-retries=0` | Clean locked install succeeded, 386 packages added, audit reported 0 vulnerabilities |
| `npm run lint` | Passed, 0 errors and 0 warnings after correction |
| `npm run typecheck` | Passed (Next generated route types plus strict tsc) |
| `npm run build` | Passed; local optimized Next build, no deployment |
| `PLAYWRIGHT_CHANNEL=msedge npm run test:e2e` (set as a PowerShell environment variable) | 13 passed, 0 failed/skipped/flaky, 9.5 seconds; localhost production-mode server stopped afterward |
| `npm run verify:kit` | All 92 kit files unchanged, SHA-256 and file count checked |
| Source scan for FOYER, Stripe, source-company domains, DCLogic, new Function, Babel and fetch calls | No matches in `src/` |
| Screenshot inspection | Home desktop/mobile and Calls desktop reviewed; preserved below |

Browser coverage: nine rendered routes at 360/390/768/1024/1440px with no horizontal overflow; one main heading; keyboard skip link and mobile navigation including Escape/focus return; demo message navigation; real empty state; unknown call; no credential collection; noindex and media-denial headers; no provider action endpoint; 16 anonymous/forged-token/role/demo requests across member/staff trees; zero external requests and page errors in the home-to-demo flow; WCAG 2 A/AA and 2.1 AA automated scans on all nine routes at 390/1440px with zero violations; 200% text at 720px with reduced-motion preference on four representative routes.

Automated scans do not establish comprehensive accessibility compliance. Actual browser zoom, screen-reader operation, Safari/Firefox and native devices remain untested. The large-text test is CSS text enlargement, not an OS/browser zoom test.

Evidence: [browser summary](evidence/browser-summary.json), [home desktop](evidence/home-desktop.png), [home mobile](evidence/home-mobile.png), [Calls desktop](evidence/calls-desktop.png). Complete transient Playwright JSON is in ignored `test-results/browser-results.json`. Kit preservation baseline: [hashes](evidence/kit-baseline.json).

## Failures found and resolved / limitations retained

- Initial registry access was blocked by the sandbox; approved dependency-only network access succeeded. No production credential was used.
- Initial build found an invalid Playwright request method option. Corrected to `request.post`; subsequent typecheck/build passed.
- First browser run found white text on an off-white button (CSS layering). Moved the base link reset into Tailwind's base layer; both accessibility scans then passed.
- Root loading fallback caused a streaming redirect with HTTP 200. Scoped loading to public pages; private routes now return HTTP 307, verified with forged inputs. Kept a local demo not-found view to preserve layout semantics.
- Initial sandboxed browser run stalled during Windows teardown and was interrupted. Rerun with permission to clean up its own test processes completed normally: 13 passed, exit 0.
- ESLint 9.39.5 is end-of-life. Tested ESLint 10.11.0, but Next's bundled React/import/a11y plugins rejected its peer range and failed at getFilename. Restored compatible exact 9.39.5 for this local increment, retaining all lint rules. Resolve this tooling exception before release. [Official ESLint support status](https://eslint.org/version-support/).
- `npm ls --depth=0` exits 0 but labels six platform/WASM optional support packages extraneous even after clean npm ci. The exact lockfile clean install and build work on this Windows host; dependency/platform behavior on Linux remains untested.

## Changed files and preservation

All application and working-record files are new. Full source/evidence path list: [changed files](evidence/changed-files.json). Main groups:

- Root package.json/package-lock.json, .npmrc/.gitignore, TypeScript/Next/PostCSS/ESLint/shadcn/Playwright configuration.
- `src/app/`: public pages, public loading state, public demo/layout/detail/empty/not-found, locked member/staff routes, entry surfaces, root error/not-found, robots, global tokens/styles.
- `src/components/`: brand/navigation, planned controls, locked access surface, licensed Button.
- `src/lib/`: typed original fixtures, navigation, planned feature descriptions, proposed pricing, class utility.
- `tests/shell.spec.ts`, `scripts/verify-kit.mjs`.
- README.md, AGENTS.md, THIRD-PARTY-NOTICES.md, reuse-manifest.json, docs inventory/plan/decisions/evidence.

Generated local-only directories are ignored: node_modules, .next, .npm-cache and test-results. No original file was modified, and no reference repository was pushed or cloned. Rollback removes only these newly added application/record files and generated directories, leaving the 92 kit files intact; do not remove the entire project directory.

## Next acceptance gate

Finish M1 before moving to M2: remaining member/staff layouts and routes, real development auth, persisted basic workspace membership, independent platform staff role + MFA, and server allow/deny checks including revocation. Then M2 runtime schemas/RLS/line grants and live-control increment A, M3 real call slice, and M3a topology proof. The full M0→M9 sequence is in [the implementation plan](IMPLEMENTATION-PLAN.md).

Untested/unimplemented: all live audio and four control operations, provider capability claims, Supabase/RLS/storage, Square reconciliation, actual fallback/cost evidence, mobile/extension, operational agents, deployment/backup/restore, commercial approvals and legal policies. None is claimed complete from the passing shell or reference tests.

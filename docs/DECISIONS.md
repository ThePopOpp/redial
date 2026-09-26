# Working decision log

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

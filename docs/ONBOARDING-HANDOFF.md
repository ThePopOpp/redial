# Carrier choices, slower scrolling and the local setup handoff

Implemented on 2026-09-19 (America/Phoenix). Sources and hashes from before this increment are in `evidence/pre-onboarding-handoff-source/`. The original 92-file kit remains unchanged. No dependencies, credentials or production services were changed.

## Experience

- The carrier field now contains 16 choices, including Mint Mobile, Boost Mobile, Cricket Wireless, Metro by T-Mobile, Visible, Google Fi Wireless, US Mobile, Consumer Cellular, Spectrum Mobile, Xfinity Mobile, Straight Talk and Tracfone, alongside the original major carriers and Other / not sure. One shared constant supplies the Radix Select and server schema. These choices record a preference; they do not assert forwarding compatibility.
- The chapter label and glowing background word read **Screen Calls**. Responsive sizing keeps the complete phrase above the copy without covering the phone. Glow, zoom, blur and fade remain scroll-driven.
- Story height increases from 1,000svh to 2,800svh, yielding approximately three viewport lengths per chapter, about three times the previous distance. Existing device/card phases are preserved. Native scrolling, rewind, reduced motion, WebGL fallback, chapter buttons and direct onboarding entry remain available.

Carrier naming was checked against official [Mint Mobile](https://www.mintmobile.com/), [Boost Mobile](https://help.boostmobile.com/docs/welcome-to-boost-mobile), [Cricket Wireless](https://www.cricketwireless.com/) and [Visible](https://www.visible.com/) pages. No carrier codes or activation claims were added.

## Completion and management

Step seven now uses **Finish setup**, with explicit acknowledgment of persistent local storage. Success links to the member account at `/local/account` and admin review at `/local/admin`. Links from the existing member and operations example navigation also reach those views. The synthetic `/demo` records remain separate.

The final validated submission is written once to the existing local record, including a stable account reference, all submitted fields, timestamps, review status, member-visible note and a bounded history. Both management views read that same submitted snapshot. There is no second asynchronous copy that can drift or fail separately. Local admin changes to status/note appear in the member view on navigation, focus or refresh. Available review states are Pending review, In review and Needs information; none enables calls.

Unchanged resubmission preserves the account reference and review state. Draft edits leave the submitted snapshot intact until the user finishes again. A changed resubmission retains the account reference, updates both views and returns the setup to Pending review. Concurrent writes require the latest version and stale submissions return 409. Delete removes the draft and account/review together.

## Boundaries

This is an explicitly labeled **local account and admin preview**, built within the user's local-only scope. There is no connected development identity backend. An optional backend clarification received no answer while independent work continued; the implementation therefore does not invent live sign-in or staff permissions. `/app` and `/ops` still reject unverified access. Real member/staff account synchronization remains an integration gate requiring verified identity, workspace membership, staff role/MFA and durable database authorization.

New GET endpoints `/api/onboarding/account` and `/api/onboarding/management` expose only the current browser's submitted record. PATCH `/api/onboarding/management` accepts a strict version/status/note schema; it cannot select another account, activate a line or enumerate customers. Both views use the existing opaque HTTP-only SameSite=Strict cookie scoped to `/api/onboarding`. Reads require loopback host and reject cross-site requests; mutations also require matching Origin. Responses are no-store. Writes use per-record serialization and atomic file replacement in ignored `.redial/onboarding/`.

Unsubmitted drafts retain their eight-hour expiry. New completed submissions persist until explicit deletion, with a one-year browser capability cookie. Clearing browser site data loses browser access; this is not a recoverable sign-in account. Previously completed drafts are not silently converted to indefinite retention: the user reviews and resubmits with the new acknowledgment. The store is intended for one local server process and is not a production or multi-process data service.

No email, provider connection, number provisioning, forwarding change or activation occurs. Number ownership and real route/fallback checks remain pending.

## Verification

Lint, TypeScript, optimized build and original-kit integrity checks passed. The initial 26-check browser run passed 25 checks; one extended onboarding test reloaded before a client navigation finished. The test now waits for the form route and completion state before reload. All 31 follow-up checks passed, covering landing, handoff, existing dashboard navigation and synthetic workflows. The 15 motion and interactive-story checks passed in the initial run, for 46 distinct passing checks across the two reports.

Coverage includes every carrier value, full seven-step completion, both management views, local persistence, session isolation, mutation origin checks, strict schemas, stale versions, stable account identity, draft/submitted separation, resubmission and deletion. Mobile light/dark views pass the automated WCAG checks used by this project. Screenshots confirm the full Screen Calls phrase fits at desktop and mobile sizes.

Reports and screenshots: `evidence/onboarding-handoff/`. These are local browser/domain checks, not real identity, RLS, telephony or provider evidence.

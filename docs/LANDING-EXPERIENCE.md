# Scroll-driven landing and onboarding

The root page now tells the Redial call story through a Three.js scene. The prior home source and package baselines are preserved in `evidence/pre-landing-source/`; the remaining public pages and member/operations application are retained. The original 92-file build kit is unchanged.

## Experience

Nine scroll chapters cover an incoming call, screening/disclosure, transcription, Insider, Audible, Gavel, Directory, a useful summary, and a transition into personal setup. A procedurally built dimensional phone moves, rotates and zooms through the composition. Three.js WebGLRenderer draws the case, orbit lines, particles and routing path; its CSS3DRenderer positions ordinary React phone-screen content in the same scene. No stock model, generated raster art or third-party CDN is required.

The current story uses approximately three viewport lengths per chapter (2,800svh total), giving the phone, card reveal and copy roughly three times their previous scroll distance. The screening chapter and its glowing background label now read **Screen Calls**. Native scrolling, reverse playback and chapter/form shortcuts remain available.

Core device transforms, waveform bars, text reveals and screen states derive from scroll position. Scrolling backward rewinds that same timeline; there is no automatic live call or time-dependent call outcome. The subsequent [interactive-story refinement](INTERACTIVE-STORY.md) adds explicit opt-in playback of an original fictional sample, a scroll/slider-controlled transcript and three private-guidance choices. Sample playback can advance its own transcript cursor while enabled; it never advances the page or a live call state. Chapter buttons allow navigation and the persistent header skips directly to setup. The final zoom fades the illustrated phone content before revealing the actual editable form, avoiding duplicate text during the transition.

Reduced motion uses a readable linear version of the journey with the same real form. Users can toggle motion from the story header. WebGL failure/context loss falls back to the readable version. Canvas content is decorative; headings, descriptions and form controls are ordinary accessible HTML. Rendering is paused while offscreen or hidden and skipped when scroll/pointer values have settled and no resize/theme update is pending; pixel ratio is capped. The fully revealed form does not require scene renders. Geometry, materials, textures, renderers, listeners and observers are disposed on unmount.

The subsequent reference-directed motion refinement adds studio-lit materials, drawn outline transitions, descending camera arcs, pointer depth, glass highlights, chapter lighting and staged in-device reveals. See [MOTION-REFINEMENT.md](MOTION-REFINEMENT.md) for references, behavior and verification.

## Seven-step form

The user-supplied screenshots guide the dark surface, serif/italic headings, violet selection states, segmented progress bar, back/continue navigation and save-for-later placement. The implemented stages collect:

1. Name, email, phone number, personal/business line and carrier.
2. Conditional forwarding or dedicated-number preference.
3. Review of the connection path and activation boundary.
4. Actual number-format validation and acknowledgment that real route/fallback tests remain pending.
5. Planned Redial assistant or another provider preference, plus voice direction.
6. Screening mode and an editable opening greeting that identifies the AI assistant.
7. Review and explicit confirmation to save the local setup request.

The form saves on Continue or Save and finish later. Back retains entered values. A reload resumes the saved stage; completion is persisted, and saved details can be explicitly deleted. It never collects API keys or displays unsupported detected-provider, carrier-pass or service-active claims. Screenshot forwarding codes and universal carrier/voicemail claims were not promoted into executable instructions. Number format is not ownership verification.

## Data boundary

`/api/onboarding` is a separate local-only draft endpoint. It does not insert personal setup details into the public synthetic `/demo` store. Strict Zod schemas validate input and all completed steps; matching Origin and a loopback Host are required for writes. An opaque HTTP-only SameSite=Strict cookie, scoped to `/api/onboarding`, identifies only this draft. Draft IDs and authority fields cannot be chosen in a request body. Optimistic versions reject stale updates; writes use per-draft serialization and atomic file replacement.

Records reside in ignored `.redial/onboarding/`. Unsubmitted drafts expire after eight hours; an unreferenced process timer removes expired records while the local server is running. The next onboarding read after a server restart removes expired files and restores timers for current drafts.

Finishing step seven with the revised storage acknowledgment creates a persistent submitted profile shared by `/local/account` and `/local/admin`. Those two views read one atomic record, including review status, a member-visible note and a short history. Submission cancels draft expiry; explicit deletion removes the draft and submitted record from both views. Edits remain drafts until submitted again. Older completed eight-hour drafts require review and resubmission before receiving this new retention behavior. See [ONBOARDING-HANDOFF.md](ONBOARDING-HANDOFF.md) for contracts and evidence.

This remains single-process local storage: the browser cookie can access only its own submission. It is not verified account identity, staff authorization, a global customer directory or production onboarding. `/app` and `/ops` remain closed. No email, provider request, billing action, number purchase or forwarding change is performed.

## Dependencies and references

Pinned `three@0.186.0` and `@types/three@0.186.0` were resolved from the registry. The existing stack remains pinned. Implementation used the official [WebGLRenderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html) and [CSS3DRenderer documentation](https://threejs.org/docs/pages/CSS3DRenderer.html). CSS3DRenderer's documented browser/display zoom limitation remains; reduced motion/static mode retains readable content and untransformed form controls. The local package retains the Three.js MIT license.

Validation is recorded in `evidence/landing-results.json`. Tests cover rendering and reverse scrolling, desktop/mobile views, fallback and reduced motion, full form completion/reload/deletion, strict server completion checks, draft isolation/origin/version handling, and regression coverage for existing screens. Automated accessibility scans do not establish a complete manual accessibility audit or provider evidence.

The review remains at `http://127.0.0.1:4317/`. Direct form entry is `http://127.0.0.1:4317/#onboarding`. Production services remain untouched; real auth, carrier/provider verification and service activation remain separate integration gates.

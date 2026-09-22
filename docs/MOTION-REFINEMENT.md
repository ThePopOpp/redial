# Reference-directed motion refinement

The existing landing source was inventoried and copied to `evidence/pre-motion-source/` with SHA-256 hashes before changes. This is a local presentation refinement; the original build kit, stored form workflow, navigation, dashboard, API and production services are preserved.

## References reviewed

All six user-supplied sites were reviewed in the browser at multiple scroll positions on 2026-09-19. The table records the observed visual direction and its interpretation for Redial, rather than copying those sites' implementation or assets.

| Reference | Observed direction | Redial interpretation |
| --- | --- | --- |
| [Oryzo](https://oryzo.ai/) — primary direction | Tactile cork-product close-ups; floating product over a blurred scene; transitions into traced schematic drawings | A dimensional phone dissolves into a progressively drawn outline and reforms into its glass and metal materials |
| [Auros](https://www.auros.global/) | Dark spatial compositions, particles and changing scroll scenes | Sparse depth layers, chapter lighting and a descending camera arc |
| [Dala](https://dala.craftedbygc.com/) | Pointer-reactive spatial graphics, fine lines and particles | Damped device tilt, background parallax and a trailing pointer halo |
| [Mercury](https://mercury.com/) | Photographic depth, soft environmental lighting and atmospheric haze | Studio reflections, a soft contact shadow, material roughness and controlled haze |
| [AuthKit](https://www.authkit.com/) | Layered glass panels, luminous details and small component motions | Screen reflections, shaded assistant orb, staged message cards and glowing live controls |
| [GSAP Scroll](https://gsap.com/scroll/) | Pinned scenes and scroll-scrubbed transformations | Native-scroll scrubbing of camera, materials, line drawing and screen transitions |

Reference screenshots are kept in ignored `.redial/motion-references/` for inspection. No site code, brand imagery, HDR file, model, photograph or third-party asset was imported. The device and textures are procedurally authored; the finish is a physically based illustration, not a photographic capture.

## Motion behavior

- Three.js uses a local RoomEnvironment/PMREM studio environment, physical metal and glass materials, a procedural roughness map, a shaded frame, buttons and antenna details. Soft reflections and highlights respond to the pointer.
- The phone dips into a descending arc as compositions slide between chapters. The background grid travels vertically, orbit layers shift in depth, and the small side marker tracks the story. Native page scrolling remains in control.
- The solid device fades into contours whose illuminated drawing head follows per-vertex path distance. Outline passes occur during the incoming, Insider-to-Audible, summary-to-setup and final zoom transitions. Intermediate passes return to the solid device; the final outline enlarges into the actual form.
- Phone screens crossfade with vertical movement, scale and blur. Ring ripples, orb shading, waveform bars, transcript words, private guidance text and delivery indicators follow the same scroll position.
- Gavel reveals connection readiness, then AI removal, then the human-speaking state. Directory traces the route and shows destination acceptance before continuation. Scrolling backward reverses those illustrative states, without a call timer, real audio or provider actions.
- Violet, blue, mint and amber lights distinguish the chapters. Page text retains theme tokens. The phone keeps a dark display as a product illustration; the page and real fields continue to support light and dark themes.
- Fine mouse pointers add eased parallax, moving glass reflections and a decorative halo that enlarges over links/buttons. The operating-system cursor stays visible. Touch/coarse pointers, reduced motion and the real onboarding form do not receive the halo.

The existing reduced-motion control and WebGL fallback retain a readable linear journey and usable form. Rendering is skipped offscreen, while the document is hidden, after the scene has faded into the form, and after scroll/pointer changes settle. Pixel ratio stays capped at 1.65. Scene disposal frees environment/texture/geometry/material resources and removes listeners and observers.

Implementation uses the installed, pinned Three.js dependency. Official references: [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html), [RoomEnvironment](https://threejs.org/docs/pages/RoomEnvironment.html), and [ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html). No dependency changes were needed. CSS3DRenderer's existing browser/display zoom limitation remains; real form fields are ordinary HTML outside the scene.

## Verification

Evidence is stored in `evidence/motion/`. New tests cover complete material/outline/material passes, 901 reversible timeline samples, pointer response and native cursor preservation, Gavel sequencing, progressive private guidance, full phone-control layout, touch/light-mode rendering, reduced motion and the handoff into actual form inputs.

The first 48-check regression run passed 47 checks and caught a remaining Directory display overflow. Directory spacing was corrected. All 11 affected motion/onboarding checks then passed, with no skipped checks or retries. The unchanged dashboard, theme, keyboard, accessibility, API and domain regressions passed in the first run. Reports: `full-suite-initial.json` and `affected-checks-final.json`.

Final lint, strict typecheck, optimized build and kit verification passed. All 92 original kit files still match the inventory hashes. Browser verification used installed headless Microsoft Edge; a separate production-mode server on loopback port 3210 was used by the test runner and stopped afterward.

The final review build is running at **http://127.0.0.1:4317/**. Live browser inspection checked ten desktop story positions, partial and complete line drawing, reformed materials, pointer depth, both appearance modes and the mobile form. `local-review-final.json` records this inspection; screenshots in this directory show the final compositions. No JavaScript or shader errors were observed. The browser additionally requested the pre-existing missing `/favicon.ico` (404); this is recorded in the raw console evidence and does not affect the scene. These checks are local browser evidence, not physical-device, carrier, provider or service-activation evidence.

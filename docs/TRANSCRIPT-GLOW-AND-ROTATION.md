# Transcript glow and dimensional phone transitions

The requested Read the room / Without picking up chapter now has a rounded, blurred multicolor perimeter. It blooms on chapter entry, holds through the transcript card, and fades before Insider. The glow is decorative and pointer-inert. Mobile uses the same effect with a smaller radius; reduced motion omits it.

Feature transitions into chapters 2 through 7 now turn the phone roughly 120 degrees around its vertical axis with a smaller pitch and roll. The visible side and rear settle back to the readable screen before card expansion. Screening's centered opening and the final embedded onboarding zoom retain their previous choreography. Reverse scrolling restores the same poses. Rear camera hardware was added to the existing procedural mesh, and the DOM screen fades/culls when facing away so it does not appear through the rear casing.

## References and provenance

- Visited https://oryzo.ai/ with Playwright and captured the live intro and several scrolled sections. Local screenshots are in `.redial/oryzo-*.png`; MCP navigation also confirmed the page title ORYZO AI. The user's supplied screenshot is the direct color/blur reference. No Oryzo scripts, images, models or CSS were imported.
- Read `docs/3D-Phone/redial-phone-3d.html` as a visual/construction reference for reflective edges, rear hardware and three-quarter views. The supplied file remains unchanged, SHA-256 `2A1CD0604ED8C0F164E8BFE4C497FE0F1D67ADC80521784677AEAE5DE9D1AF4F`. Its legacy CDN runtime, canvas sample conversation, drag controls and auto-spin were not imported. New mesh additions are implemented independently using the existing pinned Three.js dependency; no source-company code was copied.

## Files and verification

`src/lib/landing/timeline.ts` owns the scroll-driven turns and transcript glow envelope. `src/components/landing/experience.tsx` renders the decorative perimeter; `src/app/motion.css` styles it. `src/components/landing/three-scene.ts` adds rear hardware and screen-facing visibility. Existing motion/story browser coverage now checks the back-to-front turn, glow boundaries, reverse playback and reduced-motion behavior.

Optimized build, lint, typecheck and all 92 original build-kit hashes passed. The landing, motion, story-interactions and onboarding-zoom suites passed 31 checks in Edge. After softening the halo, the focused transcript perimeter test passed again, including desktop/mobile screenshots and rewind. Screenshots `test-results/transcript-{back-turn,edge-turn,glow-desktop,glow-mobile}.png` were visually inspected. The final focused run replaces the test-results report from the broader run.

No dependency, environment or provider changes. Local review uses port 4317. These checks establish local UI behavior only; existing M1/integration gates and the documented ESLint compatibility exception remain open.

## Corner-fill refinement

Replaced the uniform double ring with four independently sized radial color blooms extending beyond the stage edges. The top-left pink, top-right coral, bottom-left violet and wider bottom-right cyan fill the formerly dark outer corners. A lighter perimeter with unequal corner radii connects them. This changes only motion.css; chapter timing and phone movement retain the prior behavior. Build, lint, typecheck, all 92 kit hashes and the focused Playwright transcript perimeter check passed. Updated desktop/mobile screenshots were visually inspected.


## Restrained side-turn refinement

The earlier 120-degree back reveal is superseded by a scroll-driven side turn targeting 1.25 radians (about 72 degrees). Pitch/roll accents are reduced and the easing interval is longer. The renderer caps yaw at +/-1.3 radians including pointer parallax, preventing the previous rear-facing poses. Existing front reading poses, screening choreography and corner glow remain. Updated motion/story assertions check the side angle and visible front display. Build, lint, typecheck, all 92 kit hashes and 17 Edge motion/story tests passed; the side-turn screenshot was visually inspected. Changes are in timeline.ts, three-scene.ts and the existing motion/story test files.


## 2026-09-25 — Reverse side turns and vary transitions

Reversed resting yaw on both sides, including screening's centered-to-left move. Transition direction now follows the destination phone position instead of alternating by chapter number. Six chapter-specific peaks range from 1.04 to 1.25 radians; three restrained depth/pitch arcs add variation. All movement remains a pure function of scroll, with the existing rendered 1.3-radian cap and reduced-motion behavior preserved.

Validation: lint, typecheck, optimized build, 92 kit hashes and 20 targeted motion/story/wizard checks passed. The rendered reversed side-turn screenshot was inspected. Tests verify opposite side directions, varied turn angles, forward-facing rotations, rewind equality and the wizard opening on both device paths. Port 4317 was free at startup; no competing project was stopped. Restarted the verified Redial process after rebuilding and checked Contacts returns HTTP 200.


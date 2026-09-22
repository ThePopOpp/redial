# Final phone-to-form zoom

The final chapter now presents the actual onboarding form inside the solid phone and enlarges them together as the visitor scrolls. It no longer changes into an outline or introduces a separate form card from below. Earlier feature-card and tracing sequences are preserved.

The pre-edit source baseline is Git commit `87e388090c708afee490461f0c7c53b23aedbf2d`. The working tree was clean before this increment. The original 92-file build kit remains unchanged.

## Implementation

- `src/lib/landing/timeline.ts`: give the final chapter its own gradual zoom interval; remove its outline/drawing pass and descending transition arc; keep the solid scene visible at the endpoint.
- `src/components/landing/three-scene.ts`: solve a responsive camera pose matching the form's final document position. Project the same form element onto the screen throughout the zoom, then release it into normal flow at the matching endpoint. Suppress pointer parallax for this final alignment and clear positioning on rewind, disposal, or fallback. A solid CSS device rim takes over at the end so the case continues around longer forms below the canvas viewport.
- `src/components/landing/experience.tsx`, `scene.tsx`, and `phone-screen.tsx`: connect the real form to the scene, remove the decorative form duplicate and separate introduction, and retain one mounted form. Moving fields are inert until the zoom settles. Entered values survive reverse scrolling.
- `src/app/landing.css`: frame and clip the form within the phone screen in both themes. Keep a metallic rim around the interactive form, including the lower fields when scrolling on mobile. Fade story controls during the zoom so they do not overlap enlarged fields. Reduced motion and WebGL loss retain the ordinary readable form.

The onboarding schema, validation, persistence and local member/admin handoff are unchanged. No dependency, migration, new configuration or production-service change is involved.

## Verification

- `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run verify:kit` passed. All 92 original hashes match.
- `tests/onboarding-zoom.spec.ts` checks five scroll positions at 390, 768 and 1440px in both themes, screen/form alignment, monotonic enlargement, no endpoint jump, one persistent input node, retained values on rewind, no horizontal overflow, and reduced-motion/WebGL-loss recovery.
- The combined landing, motion and zoom suite passed 18/18 checks (`evidence/phone-form-zoom/full-results.json`). The final refinement, including the frame around lower mobile fields, also passed all 18 checks (`final-results.json`). An intermediate eight-check report is preserved as `solid-phone-results.json`. Screenshots alongside those reports show the final build.
- Earlier reports are preserved: the first new alignment checks exposed subpixel rounding at the chapter boundary; the fix passed the subsequent ten checks. An initial existing touch-render timing failure passed in subsequent runs without disabling assertions.

Manual review: open `http://127.0.0.1:4317/`, choose the final chapter, and scroll slowly into setup. The phone should stay solid and the form should enlarge inside it. Enter a name, scroll backward, then forward; the same value should remain. Repeat using the light/dark toggle or reduced motion. Direct setup is available at `/#onboarding`.

These are local UI checks. They do not establish live calling, verified account identity or production readiness. CSS3D browser/display zoom limitations remain as previously documented.

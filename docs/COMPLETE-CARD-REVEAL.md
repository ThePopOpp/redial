# Complete card reveal and readable SCREEN lettering

The approved phone-first trial now applies to all eight feature cards: incoming, screening, transcript, Insider, Audible, Gavel, Directory and summary. The ninth scene retains the separate phone-to-onboarding transition. Seven relevant source/test files were preserved and hashed in `evidence/pre-complete-reveal-source/`; the workspace still has no Git repository.

Every card holds small during the phone presentation, grows and rises from 38–62% of its chapter, and gains a glow matching the scene tint. The hardware, screen, tracing and shadow fade from 40–62%. Cards retain their reading interval until 78%, then fade before the next chapter. Insider and summary tracing passes finish before their card reveals. The scene and cards remain deterministic when scrolling backward.

The four interactive cards unfold their controls during growth. Hidden controls remain inert; stationary/reduced-motion cards expose their full contents. Transcript scroll progress now runs from 58–80% of transcript/Insider chapters, so the conversation can be explored after its card opens. The range control, matched phone transcript, optional audio, and all three Audible choices continue to work. Short mobile layouts lift the expanded cards farther to keep the bottom scroll navigation clear.

SCREEN's previous feathered mask obscured most of the word. It has been removed. The complete word now sits above the screening explanation, clear of the phone on desktop. A separate mobile spacing adjustment keeps it above the heading. The larger readable interval retains a sharp luminous core and halo, followed by scroll-driven zoom, sliding, blur and fade. No other background feature words were added.

Changed implementation: `timeline.ts`, `story-demo.ts`, `story-callout.tsx` and `story-interactions.css`, with matching motion/interaction tests. No dependencies, build-kit originals, schemas, deployment settings, onboarding persistence or production services changed.

Validation:

- Lint, typecheck, optimized build, and all 92 original-kit hashes passed.
- All 22 relevant browser checks passed: every card's staged reveal/rewind, complete SCREEN visibility across six viewport sizes in both themes, audio playback/seeking/recovery, transcript keyboard controls, all Audible choices, reduced motion/WebGL fallback and onboarding.
- After the short-phone spacing refinement, both mobile theme/accessibility checks passed again. They verify the expanded interactive cards clear the scroll navigation.
- The refreshed local server passed 48 additional desktop/tablet scene inspections at 768, 1024 and 1440px in both themes, without page overflow or browser errors. Home returned HTTP 200.

Reports and screenshots are in `evidence/complete-reveal/`: `initial-browser-checks.json`, `final-mobile-checks.json`, `review-server-check.json`, and the corresponding `screen-readable-*`, `staged-*` and `review-*` images. The running preview is **http://127.0.0.1:4317/**. Browser evidence uses headless Edge; live-call integration and M1 acceptance gates are unchanged.

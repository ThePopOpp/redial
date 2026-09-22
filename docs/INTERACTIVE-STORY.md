# Enlarged callouts and interactive story

The later [complete card reveal](COMPLETE-CARD-REVEAL.md) replaces the immediate growth behavior for all eight cards, following the [first-two-section trial](STAGED-REVEAL.md). Audio, transcript and guidance interactions below remain available within the expanding cards.

## Scope and preservation

The user requested larger phone-overlay cards that grow and rise on scroll, an oversized background feature-name experiment on the second section, audio in the screening/Insider sequence, three interactive Audible choices, and a readable simulated transcript controlled by scrolling. The six relevant existing sources were copied and hashed in `evidence/pre-interactive-story-source/` before editing. Original kit files, onboarding persistence, dashboard workflows and production services are preserved.

An optional clarification offered audio in screening, Insider, or both. No preference arrived during independent implementation; the implemented default supports both mentioned sections. The background typography remains limited to **SCREEN** in the second section, as requested before applying it elsewhere.

## Behavior

- All eight phone-overlay cards have larger type, a stronger surface and border, and more contrast. Desktop cards begin around 430px wide and grow to approximately 499px. Simple cards rise up to 280px at a 1000px-tall viewport; interactive cards use a shorter rise to keep their controls visible. Cards retain full opacity through the reading interval, then fade during the chapter transition. The same scroll positions restore the same transforms in reverse.
- The screening background word slides sideways/upward, increases blur and becomes more transparent as the visitor scrolls. It is decorative, pointer-inert and excluded from the accessibility tree.
- Screening and Insider expose a real play/pause button for a fictional sample. Nothing plays until an explicit click. After opt-in, entering either sample section starts playback at the scroll-selected point. Scroll gestures pause audio briefly; after 140ms of settling, playback seeks and resumes. Leaving those sections pauses audio; mute, hidden-tab, navigation and unmount handling stop it. Reduced motion supports manual playback without scroll-triggered playback.
- The shared 30.248-second sample contains five original scripted turns between Redial and Jordan. A matched WebVTT file and readable transcript accompany it. Scrolling and the branded keyboard-operable range field select a point in the conversation. During deliberate audio playback the cursor follows the media clock. The illustrated phone and the large transcript card show the matching turn; scrolling back rewinds it.
- Audible offers **Suggest 10 AM**, **Check the signature**, and **Get a reference**. Each selection updates the private instruction, the phone illustration, and the corresponding scripted assistant/caller response. The private instruction is displayed separately and is never inserted into the caller transcript. Choices remain selected when revisiting the section and reset on page reload. These are explicit local simulations, not AI-provider responses or delivery evidence.
- Light/dark tokens, fixed navigation, the existing onboarding form and WebGL/reduced-motion fallbacks remain available. In static mode the four interactive section cards appear inline. Mobile cards have smaller growth/travel and compact layouts for short screens.

## Audio provenance and implementation

`scripts/generate-story-audio.ps1` uses the installed Windows System.Speech engine with Microsoft Zira Desktop and Microsoft David Desktop to synthesize the original script offline. It assembles mono 16-bit PCM at 22,050Hz, inserts pauses between turns, and writes a WAV, matching caption file and timed JSON cue sheet. These are synthetic sample voices, not recordings of callers, imported site assets or the voice of a connected production assistant. No credentials, remote speech service, microphone permission, browser speech service or call routing is used.

Outputs: `public/audio/redial-sample.wav`, `public/audio/redial-sample.vtt`, and `src/lib/landing/sample-call.json`. The WAV is approximately 1.3MB and uses `preload="none"`; explicit playback initiates media loading. Generation intermediates remain in ignored `.redial/audio-source/`.

The local Windows speech engine required sandbox escalation to read installed voices. Generation was completed with that approved local access. The generation script writes BOM-free UTF-8 JSON for the Next bundler. No dependencies were added or upgraded.

Audio handling follows the documented [HTMLMediaElement play promise](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play), [media seeking interface](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement), and [autoplay guidance](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay). Playback rejection produces a retry message while the transcript remains usable.

## Verification

Evidence is in `evidence/interactive-story/`. The initial 56-check regression run passed 55 checks; the new Audible test contained a mistyped `.phone-screen-host` selector. Correcting it to the existing `.story-screen-host` required no application workaround. All eight interaction checks subsequently passed, including actual media-clock advancement, non-muted playback, nonempty decoded PCM, reverse seeking, silence before opt-in/after leaving, blocked-playback recovery, all three choices, keyboard transcript scrubbing and light/dark accessibility checks. Original motion, onboarding, API, dashboard and theme regressions passed in the initial run.

The live review was inspected at 360, 390, 768, 1024 and 1440px widths with no page overflow or JavaScript errors. A final short-screen spacing adjustment separates the cards from chapter navigation; both mobile theme tests passed again, including the 360 × 667 layout and automated accessibility checks. Reports: `full-suite-initial.json`, `interaction-checks-final.json`, and `mobile-checks-final.json`. Viewport measurements are in `final-viewport-check.json`; the final short-screen screenshots are `callout-light-360-short.png` and `callout-dark-360-short.png`.

Final lint, typecheck, optimized build and original-kit verification passed. All 92 original kit files retain their M0 hashes. The project-owned review server was refreshed on **http://127.0.0.1:4317/**; no other project's listener was stopped. Browser verification is headless Edge, not a claim of a completed physical-device audio audit. The editable setup form remains separate from the sample and does not activate service.

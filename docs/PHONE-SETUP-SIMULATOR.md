# Phone setup walkthrough simulator

Open `/demo/contacts` and select **Phone setup simulator**. The same simulator is available alongside the real importer on authenticated Contacts. It needs no Supabase configuration in the demo.

Seven steps demonstrate choosing Android/iPhone, opening the QR link, signing in, optionally adding a home-screen shortcut, sharing contacts, reviewing the selection and completion. Android demonstrates a contact picker; iPhone demonstrates a vCard file. All fields and contacts are fictional. The QR illustration is deliberately not a usable handoff link.

The modal uses a CSS phone with animated scan line, screen transitions, highlighted targets, sliding browser sheet, contact rows and completion icons. No step advances automatically. The person triggers each simulated action, then continues. Back, optional shortcut skipping, selection of one/several/all, Replay, Escape and closing are supported. Reduced-motion preferences disable animation. A labeled progress bar and live step instructions expose progress to assistive technology.

This adds only a simulator. No installation prompt, camera, contact picker, file input, credentials, external request or data-writing API is used by the component. It changes no contact records, phone routing or activation state. Adding a real browser shortcut would not install a native calling app. Real contact import and authenticated access remain separate.

Implementation: `src/components/dashboard/phone-setup-simulator.tsx` and `src/app/phone-wizard.css`, with entry points in the two Contacts surfaces. No dependencies or database migrations changed; prior work and all kit originals were preserved.

Instruction references checked 2026-09-22: [Chrome Android website shortcuts](https://support.google.com/chrome/answer/15085120?co=GENIE.Platform%3DAndroid&hl=en), [Safari iPhone home-screen web apps](https://support.apple.com/en-in/guide/iphone/iphea86e5236/ios). Browser menus can vary by version. Existing [contact import](CONTACT-PHONE-IMPORT.md) notes cover picker availability and actual deployment requirements.

Local validation: lint, typecheck, optimized build, all 92 kit hashes and 75 reference tests passed. Seven existing workflow browser tests passed. The two new walkthrough tests passed after correcting the progress bar's ARIA role and waiting for demo records to load before comparing unchanged data. They cover both device paths, explicit advancement, selection, replay, skip/back, no POST requests, mobile fit, reduced motion and selected accessibility checks. Desktop and mobile screenshots were inspected. These are simulator checks, not physical-device or deployment evidence. Existing release gates and ESLint compatibility exception remain open.

## 2026-09-25 — Spacing and device frame refinement

Added explicit 20px spacing between instruction blocks, increased note-card padding, and separated completion feedback from the card. Removed the phone perspective/rotation so both device previews stay flat and parallel to the screen, including on hover. Android now has a squarer frame, circular camera cutout and three-button navigation; iPhone retains its own notch and home indicator. Mobile scaling remains flat.

Lint, typecheck, optimized build, both wizard browser checks and all 92 kit hashes passed. Inspected the completed shortcut-step screenshot and restarted the local review server on port 4317. No dependencies, database or service behavior changed.


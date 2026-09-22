# M6/M7 · Native mobile companion


Read the mobile/platform and design specs. Create or extend a React Native app using a native development build compatible with chosen voice modules. Share contracts/validation/tokens, not DOM-based shadcn components. Start with private auth/inbox/notifications/rules/account functionality and accurate offline/stale state.

Use secure credential storage, generic push payloads, server authorization and device revocation. Build native call-taking only after the SDK/push/background flow is verified on physical devices. Do not represent the supplied iOS frame or a PWA as that implementation. Add carrier setup/reversal guidance without claiming universal native cellular interception.

Default to the reviewed free companion purchase model; no unreviewed embedded Square checkout or purchase CTA. Document current store eligibility and required billing adapters if in-app sales are added. Include account deletion and truthful store metadata.

Acceptance: physical-device foreground/background/locked/offline/auth tests; privacy-safe notifications; platform capability labels; no claim of app-store approval until obtained.

## v1.1 integration dependency

Read `prompts/13-live-call-controls.md` and docs 19–21. Include Insider (silent listening), Gavel (stop agent/takeover), Audible (private direction) and Directory (approved destinations) in this surface's implementation plan. Preserve their permission/media boundaries and truthfully gate unsupported providers/devices. Existing billing prices are unchanged; no feature is considered working merely because its UI exists.

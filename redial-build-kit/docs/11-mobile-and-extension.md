# 11 · Mobile apps and Chrome extension

## Native strategy
Use React Native with Expo development builds or an equivalent native build workflow compatible with the chosen voice SDK. Share TypeScript contracts, validation, policy definitions and tokens with the web app; use native UI components. The supplied `ios-frame.jsx` is only a design wrapper. A Next.js PWA can be a useful early companion but is not a substitute for validated native background calling behavior.

Expo Go has a predefined native runtime; native voice/call modules require a compatible development build and platform configuration rather than assuming arbitrary native modules run inside Expo Go. [W20]

## Mobile release A: companion
Auth, biometric re-entry where supported, call inbox, permitted summary/transcript access, callback tasks, rules, voice settings, routing-health display, setup/reversal instructions, private notifications, usage and account/security controls. Offline mode may show a minimal encrypted cache and must clearly label stale state. Do not allow an offline switch to appear to update server routing when it has not.

Native push payloads should contain an event/resource identifier and generic description by default, not a caller's sensitive message. Fetch details after authentication. Store refresh credentials in platform-secure storage; revoke lost devices; never embed provider API keys. Handle deep links, auth expiry, session rotation and logout from all devices.

## Mobile release B: supported app calls
Integrate the approved native voice SDK with iOS native call presentation/push behavior and Android's supported call framework. Validate foreground, locked device, background, terminated app, network changes, no microphone permission, Bluetooth/headsets, interruption by another call, battery restrictions and stale push tokens on physical devices.

A push notification is not proof that the app can receive a call. Native call integration is a separate acceptance milestone. Surface “not ready for app calls” until registration and a real test succeed. Offer an approved non-forwarding destination or voicemail if native delivery fails.

Listen-in and live take-over require the verified server conference topology described in the telephony spec. The app must show participant/recording state and the permissions required. Do not add an invisible family monitoring capability.

## Platform boundaries
Android's `CallScreeningService` can respond to an eligible incoming call with allow/silence/block behavior and has a documented five-second response deadline. It does not establish that a cloud conversation agent can answer and stream arbitrary cellular audio through that callback. Treat native identification/blocking as an optional separate capability spike. [W18]

Do not assume iOS CallKit or an iOS caller-identification extension grants unrestricted access to ordinary cellular call audio. The Redial voice architecture should work through supported provider routing and app-owned VoIP sessions. Feature availability must be determined per OS/SDK/permission state, not promised identically across platforms.

## Mobile billing policy
Square remains the web seller integration. The initial mobile design is a free authenticated companion with no embedded Square purchase UI or unreviewed off-platform purchase CTA. Apple explicitly describes a free stand-alone companion exception including VoIP, with conditions. Google Play has its own payment rules and region/program exceptions. Redial's eligibility must be reviewed for its actual features and storefronts; this is not a guarantee of approval. [W16, W17]

If in-app purchases are needed, implement StoreKit and Google Play billing adapters and verified server entitlement reconciliation. Keep `purchase_source` on subscriptions, restore purchases, handle store notifications/refunds/grace periods, detect duplicate subscriptions and direct users to the correct manager. Never attempt to cancel an Apple/Google subscription using Square. Do not treat Apple Pay/Google Pay tokenization as a substitute for store billing requirements.

## Mobile store checklist
Real test accounts, review instructions, no fake working features, accurate screenshots, supported country matrix, privacy disclosures/data safety, account deletion, terms/privacy URLs, permissions justification, accessibility, subscription terms where applicable, native call behavior demonstration and no hidden billing bypass. Recheck current store policy at submission.

## Chrome Manifest V3 extension
Use the reviewed CTRL+P side-panel/message pattern as a reference; remove product harvesting, screenshot capture and company-specific host settings. Chrome service workers are event-driven and can unload. Durable state belongs in appropriate storage/server state, not only memory; service workers have no DOM. Packaged extension code must follow MV3 requirements. [W19]

### Initial features
A compact authorized inbox; recent summary previews; server-backed screening pause/mode selection; callback task creation from an explicitly selected phone number; open the full web call console; rule-health and usage indicator; login/logout/device revocation. Public-page number capture must require user activation and confirmation. Do not automatically upload browsing history, page bodies, email contents or an address book.

### Permissions strategy
Start with `sidePanel`, `storage` and only the exact configured Redial API host. Add `identity` only for the chosen authorization flow. Add `activeTab`/`scripting` only when the explicit page-selection feature is implemented and justified. `contextMenus`/`notifications` are optional features, not default entitlement to unrelated data. No `<all_urls>`, cookies, screenshot access or remote code loading merely because the source extension used them.

### Authentication and messages
Use a short-lived, one-time code bound to the extension client/redirect, PKCE verifier and authenticated user. Exchange over HTTPS; never copy a website session cookie into extension state. Use a small validated command schema and validate message sender, source tab/origin where applicable and requested operation. Content scripts must not receive long-lived credentials.

Separate browser extension display state from server permissions. Changing extension storage must not grant billing access or another line's transcript. Reject arbitrary fetch proxy requests and non-Redial URLs in background messages. Rate-limit selected-number operations and normalize/confirm destinations before any call.

### Calling boundary
Release A opens the full web app's authorized call console or schedules a callback. Do not put a continuous call in an event-driven service worker. An eventual offscreen/native-supported media approach needs its own lifecycle, microphone-permission, store-policy and call-survival tests. Closing a side panel must not unexpectedly end an ongoing production call without warning.

### Extension QA
Install/uninstall, fresh/revoked/expired login, worker suspension/restart, browser restart, unavailable server, cross-tenant deep link, invalid message sender, malicious page number, unsupported browser page, simultaneous panels, clipboard privacy and host permission review. Closing DevTools is important when testing worker suspension; developer tooling can alter lifecycle behavior. [W19]

## v1.1 · Cross-platform Live Call Controls

Mobile includes Insider/Gavel audio controls after native readiness and physical-device tests, plus Audible/Directory command sheets. Read docs 19–21 for exact permissions and state. The initial Chrome extension exposes all four named entry points, but Insider/Gavel open the dedicated web console instead of pretending the service worker holds audio. Audible/Directory may use the authenticated API directly. A push registration, foreground web preview or working pure unit test does not establish background native call readiness. Post-Gavel AI/other-monitor removal and call-survival tests apply to every supported client.

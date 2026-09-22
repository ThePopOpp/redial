# Research and provenance register
**Reviewed September 18, 2026 · America/Phoenix**

This kit distinguishes three sources of information: the five uploaded design files, a targeted read-only GitHub review, and current official documentation. Proposed architecture, security controls, pricing, scope, business policies and copy are new recommendations, not facts established by the prototypes.

Square, carrier, app-store, API, agent and pricing documentation can change. Recheck the exact account, region, supported version, plan and release policy before enabling a production feature. No carrier partnership, trademark clearance, contractual approval, live routing, billing renewal, mobile-store approval or provider interoperability was established by this review.

References such as `[W04, W05]` in the specifications point to the entries below. W08 is intentionally unassigned; identifier gaps have no significance.

## Uploaded design evidence
| ID | Original file | Relevant source locations |
|---|---|---|
| U01 | `ReDial Site.dc.html` | Hero lines 37–44; demonstration claims 93–110; BYO pricing 134–158 |
| U02 | `ReDial App.dc.html` | Rules 123 and 446–463; sample endpoint 155–159; BYO/old brand 204–224; contact privacy 282–284; scripts and plans 485–501; setup 510–533 |
| U03 | `ReDial Admin Dashboard.dc.html` | Mock metrics 56–78; navigation 256–259; Stripe placeholder 273–280; annual sample price 300–307 |
| U04 | `ios-frame.jsx` | Presentation-only frame comments 5–8 and component 202–240 |
| U05 | `support.js` | Generated runtime line 1; dynamic evaluation 842–850; CDN runtime 1142–1148 |

Line references correspond to the supplied source versions; original byte hashes are recorded in `original-files.sha256.json`. The originals remain unchanged, including unrealistic claims and unsafe illustrative scripts. They are design evidence, not instructions to deploy those behaviors.

## Targeted private-repository review
Read via the authorized GitHub connection: both root `package.json` files; CTRL+P `extension/manifest.json` and `extension/src/background.ts`; Channel Cast `README.md` and `Dockerfile`; partial directory/tree listings. The listings were truncated, and a keyword search with no hits was not treated as evidence that a feature is absent. A candidate import still needs local inspection, immutable commit provenance, tests and licensing/security review.

Source references:
- `https://github.com/ThePopOpp/ctrl-p`
- `https://github.com/Qallus/Channel-Cast-OS`

Do not confuse package dependency declarations with installed lockfile versions or implemented functionality. Do not automatically transfer customer data, original branding, credentials or production permissions.

## Official external sources

### W01 · T-Mobile — Calling services
https://www.t-mobile.com/support/plans-features/calling-services

Carrier forwarding models and limitations. Does not establish a Redial partnership, consumer-account OAuth integration, or universal spam-only routing.

### W02 · Verizon — Call Forwarding FAQs
https://www.verizon.com/support/call-forwarding-faqs/

All-call/unanswered forwarding and the distinction between forwarding voice calls and text messages. Match the real account and device before publishing instructions.

### W03 · AT&T — Call Forwarding
https://www.att.com/support/article/wireless/KM1011513/

Wireless-phone setup, voicemail interactions and forwarding limitations. Not evidence of an online API for controlling every consumer line.

### W04 · Twilio — Media Streams
https://www.twilio.com/docs/voice/media-streams

Media transport, bidirectional stream limits and request authentication. Does not certify this proposed bridge or its transfer implementation.

### W05 · xAI — Speech to Speech
https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech

Realtime WebSocket audio, client/server authentication distinctions and supported audio formats. The sample voice.space-xai.dev address in the prototype is not validated by this documentation.

### W06 · xAI — Pricing
https://docs.x.ai/developers/pricing

Voice audio reference of $0.08/minute at review time, plus separately listed text-input/tool costs. Recheck the selected model and account before pricing a plan.

### W07 · Twilio — US Voice Pricing
https://www.twilio.com/en-us/voice/pricing/us

US local inbound, app/browser, Media Streams, number rental and other voice charges. Public unit rates are not a complete bill or a contracted quote.

### W09 · xAI — SIP voice integration
https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech/sip

Candidate alternative voice transport. Documentation existence is not proof of a tested Redial SIP implementation.

### W10 · Square — Subscriptions API overview
https://developer.squareup.com/docs/subscriptions-api/overview

Subscription/catalog/payment relationships and documented constraints. Redial free membership is an internal entitlement, not a $0 Square subscription.

### W11 · Square — Plans and variations
https://developer.squareup.com/docs/subscriptions-api/plans-and-variations

STATIC versus RELATIVE pricing, phases and discount applicability. Use tested mappings instead of importing Stripe assumptions.

### W12 · Square — Manage subscriptions
https://developer.squareup.com/docs/subscriptions-api/manage-subscriptions

Create/manage/cancel behavior and associated objects. Provider subscription state is not sufficient evidence that an invoice was paid.

### W13 · Square — Validate webhook notifications
https://developer.squareup.com/docs/webhooks/step3validate

Signature-key, notification-URL and raw-body verification. Validation precedes event persistence and side effects.

### W14 · Supabase — Row Level Security
https://supabase.com/docs/guides/database/postgres/row-level-security

RLS, database grants and privileged-key implications. These primitives do not automatically implement the line-sharing/privacy policy proposed here.

### W15 · Resend — Domain introduction
https://resend.com/docs/dashboard/domains/introduction

Domain ownership and email authentication setup. Preserve existing mail routing and evaluate changes before publishing DNS records.

### W16 · Apple — App Review Guidelines
https://developer.apple.com/app-store/review/guidelines/

Payment rules and the free companion-app provision in 3.1.3(f), subject to actual eligibility. No guarantee that Redial will qualify or be approved.

### W17 · Google Play — Understanding payments policy
https://support.google.com/googleplay/android-developer/answer/9858738

Digital-service billing requirements and applicable exceptions/programs. Apple eligibility does not establish Google Play eligibility.

### W18 · Android — CallScreeningService
https://developer.android.com/reference/android/telecom/CallScreeningService

On-device screening response constraints, including the five-second response deadline. Not evidence of universal access to cellular-call audio.

### W19 · Chrome — Extension service workers
https://developer.chrome.com/docs/extensions/develop/concepts/service-workers

Event-driven worker lifecycle and architecture. Persistent voice sessions must not assume the extension worker remains alive.

### W19a · Chrome — Service-worker events tutorial
https://developer.chrome.com/docs/extensions/get-started/tutorial/service-worker-events

Persisted state and testing worker termination/restart. Opening developer tools may affect lifecycle tests.

### W19b · Chrome — Extension service-worker basics
https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics

Manifest V3 packaged-code constraints. Do not execute remote model-generated code in the extension.

### W20 · Expo — Development builds introduction
https://docs.expo.dev/develop/development-builds/introduction/

Custom native runtime requirements and distinction from Expo Go. Native voice SDKs require an appropriate development/build workflow.

### W21 · Nous Research — Hermes Agent source
https://github.com/NousResearch/hermes-agent

Agent runtime and tool/skill integration candidate. Pin and inspect the release, dependencies, license and configuration before deployment.

### W22 · Paperclip — Project source
https://github.com/paperclipai/paperclip

Agent/task execution, coordination and governance candidate. Repository existence does not grant Redial production credentials or authority.

### W23 · xAI — Grok Bot overview
https://docs.x.ai/grok-bot/overview

Hosted agent/workspace model and shared-computer considerations. Treat as a separately governed external teammate, not a self-hosted voice gateway.

### W24 · MCP — Security best practices
https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices

Authorization, token handling and boundary protections. Protocol connectivity does not substitute for application permissions.

### W25 · FTC — CAN-SPAM compliance guide
https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business

US commercial-email baseline for review. This is not an exhaustive jurisdiction-specific legal assessment of Redial.

### W26 · Twilio — A2P 10DLC
https://www.twilio.com/docs/messaging/compliance/a2p-10dlc

US long-code application messaging registration context. Registration is not a substitute for appropriate recipient consent.

### W27 · Next.js — Self-hosting
https://nextjs.org/docs/app/guides/self-hosting

Self-hosted web runtime and deployment considerations. Select and test actual locked versions instead of blindly copying an old manifest.

### W28 · shadcn/ui — Next.js installation
https://ui.shadcn.com/docs/installation/next

Component installation reference. Reconcile existing Tailwind/React conventions before using a current generator.

### W29 · Supabase — Self-hosting with Docker
https://supabase.com/docs/guides/self-hosting/docker

Full self-hosted service stack and operational responsibilities. A Postgres container alone is not the whole Supabase platform.

### W30 · Coolify — Next.js framework example
https://coolify.io/docs/applications/framework-examples/javascript/nextjs

Deployment starting point. Voice gateway isolation, backup restoration and release draining are additional proposed requirements.

## Explicit gaps and verification limits
Apple CallKit documentation did not yield sufficient readable detail in this review; no claim of arbitrary cellular-audio access is based on it. Alternative voice vendors listed in the prototypes remain requested roadmap candidates, not verified connectors. Device/carrier combinations, native push/audio behavior, live call transfers, short-call billing increments and merchant-specific renewal behavior require tests on the actual systems.

Legal review items in the kit are issue lists and conservative proposed product controls—not conclusions that all jurisdictions impose identical recording, consent, recurring billing, tax or cancellation requirements. No launch authorization follows from this research.

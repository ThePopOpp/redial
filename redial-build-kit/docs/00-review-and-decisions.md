# 00 · Source review and decision register

## Source-derived foundation
The public site presents an AI intermediary for spam, unknown and known callers. The member design adds Calls, Screening, Voice agent, Number & carrier, People, Billing and a mobile preview. The staff design adds Overview, Customers, Payments, Communication and Integrations. The product personality is editorial and calm rather than a conventional call-center console.

The uploaded files are useful **interactive design references**, not an implemented service. Their state and data are declared in frontend arrays, their provider statuses are examples, and their commercial buttons do not establish a billing system. `support.js` is a generated design runtime, not a support-management module. `ios-frame.jsx` draws a device shell, not a native iOS application.

## Attachment audit
| Source | Preserve | Production work required |
|---|---|---|
| `ReDial Site.dc.html` | Calm positioning, screen/route/message story, three plan names, typography | Real routes, tested compatibility claims, accurate plan terms, checkout, CMS, legal/support pages |
| `ReDial App.dc.html` | Call inbox/detail, three screening modes, agent controls, onboarding | Persisted data, auth, telephony integration, consent, actionable callbacks, membership, safe routing |
| `ReDial Admin Dashboard.dc.html` | Needs-attention view, customer/payment/provider separation | Staff authorization, real metrics, reconciliation, CRM, campaigns, support and incident workflows |
| `ios-frame.jsx` | Approximate mobile composition reference | Native React Native screens, native audio/call integrations, accessibility and device testing |
| `support.js` | Keep unchanged solely to inspect the original prototypes | Replace with ordinary Next.js React components; do not bring runtime evaluation/CDN Babel into production |

## Specific changes proposed, not facts supplied by the mockups
1. **Billing:** Square is authoritative because the current user request names Square. Replace the mockup's “Stripe billing” status; do not implement both processors without a concrete need.
2. **Brand cleanup:** the member file contains “FOYER SCREEN” in billing and routing examples. Replace in production with Redial. Keep reference copies untouched.
3. **Contact policy:** the mockups simultaneously say contacts always ring and that “Every call” screens saved contacts. Resolve this explicitly: Every call screens all received calls unless a member creates a named VIP override. Unknown mode bypasses matched contacts, subject to route availability and the member's policy.
4. **Forwarding:** conditional forwarding is missed/busy/unavailable-call handling, not a universal spam-only or unknown-only interception API. Feature availability depends on the actual path that delivered the call.
5. **Secrets:** remove the example script that discloses a gate code. Urgency can request a transfer; it cannot disclose secrets or confer authority.
6. **Privacy:** contact hashing alone is not an anonymity guarantee. Store the minimum necessary matching data with explicit consent, access controls and a documented threat model.
7. **Family access:** replace default “admins can see everyone's activity” with line-level consent and separate billing/management permissions.
8. **Economics:** source $12/$29 plans exclude customer-paid provider usage. Preserve that as the BYO offer; a managed offer needs separately budgeted usage caps.
9. **Provider claims:** no implementation evidence supports universal one-click sign-in, universal compatible webhooks, zero missed contacts, instantaneous failover or the sample `voice.space-xai.dev` endpoint. Verify real account/API endpoints before using any of these.
10. **Metrics:** 2,847 members, $31,480 MRR, 128 average screens and 4.6 reclaimed hours are design fixtures, not business evidence.

## Architecture decisions
| ID | Proposed decision | Reason / reopening condition |
|---|---|---|
| ADR-001 | Clean Redial project with selective reuse; CTRL+P first engineering reference | Actual MV3 extension and testing scripts are present; reopen after local code/security audit |
| ADR-002 | Next.js control plane, separate persistent voice service | Keep long-lived calls independent of normal UI deployments |
| ADR-003 | Twilio + xAI first; adapters thereafter | Prove one end-to-end path rather than five partially working providers |
| ADR-004 | Dedicated number before mobile conditional forwarding pilot | More control over what can be screened and where it rings |
| ADR-005 | Square web subscriptions; mobile companion first | Honor requested processor while keeping store-policy work explicit |
| ADR-006 | Supabase tenancy + line access grants | Household payer is not automatically entitled to private calls |
| ADR-007 | Git docs are source of truth; Paperclip coordinates tasks | Avoid independent conflicting instructions across agent products |
| ADR-008 | Hermes optional operator; Grok Bot optional external teammate | Neither belongs in the time-critical caller audio loop |
| ADR-009 | Recording off by default, retention finite | Reduce sensitive data exposure; review processing/notice obligations separately |
| ADR-010 | No automatic outbound AI callback in pilot | Human-initiated callbacks first; outbound automation needs additional consent and abuse controls |

## Owner decisions that can remain configuration during implementation
Legal seller and verified production domain; managed versus BYO launch offer; approved prices/limits; whether a free telephony tier is commercially acceptable; supported carrier/device pilot matrix; default retention; recording/monitoring policy; merchant/currency/tax setup; support coverage; target recovery objectives; whether the database is managed or self-hosted.

Continue development with the defaults in this kit. Do not publish these unresolved commercial and legal values as settled facts.

**Source anchors:** Site lines 37–44, 93–110 and 134–158; App lines 123, 155–159, 204–224, 282–284, 446–501, 510–533; Admin lines 266–307; iOS frame lines 5–8; runtime lines 842–850 and 1142–1148. Official verification is indexed in `research/sources.md`.

## v1.1 decision update · owner-requested features

Added the exact feature names Insider, Gavel, Audible and Directory. The member design's prior take/listen concepts now have formal names and requirements. The new required product scope supersedes treating these merely as unnamed speculative future ideas, while all testing/release gates remain. New design defaults: conference-first full-control calls with a separate AI application participant; line-specific action grants; private text guidance; action-bound custom dialing; no price change; no automatic recording; no implicit post-Gavel monitoring. See docs 19–21 and the v1.1 change log. Advanced live consultation, group/SIP and native-media variants remain individually gated.

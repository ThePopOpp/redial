# 01 · Product definition, audience and scope

## Product promise
**Redial helps people decide which calls deserve their attention.** A supported phone connection sends calls to Redial. Redial follows a member's screening rules, asks unknown callers for context, takes useful messages, and requests a live connection when appropriate. Every outcome is understandable and reversible where possible.

Do not define the product as “blocks every spam call” or “intercepts every cellular call.” Its distinctive value should be configurable voice assistance, a useful inbox, privacy controls and transparent routing—not an unqualified detection guarantee.

## Proposed first audiences
Start with solo professionals and people who receive legitimate unknown-number calls: contractors, independent consultants, owners and remote workers. These are a practical pilot audience for validating whether screening helps without losing valuable calls. This is a product hypothesis, not market research establishing demand. Household sharing follows after personal privacy and line-level access are proven.

Defer regulated clinical workflows, emergency dispatch, political/telemarketing dialers, unattended high-volume outbound calling, minors' accounts, carrier replacement and enterprise contact-center promises. Business call handling can expand later through permissioned scheduling and team routing.

## Five connected product surfaces
**Website:** explain the service, demonstrate a clearly labeled simulated call, check compatibility, compare plans, sell a membership, publish support and educational content.

**Member web app:** manage numbers, rules, voice behavior, call outcomes, callbacks, trusted contacts, household invitations, plan and privacy preferences.

**Mobile apps:** private call inbox and notifications first; supported app-based call taking after native integration; forwarding setup assistance without claiming control of native carrier audio.

**Chrome extension:** browser-side companion for inbox, selected-number actions, callback tasks and opening the call console. No automatic broad page scraping or native phone interception.

**Business dashboard:** operate Redial itself: customers, subscriptions, provider costs, support, CRM, marketing, content, agents, incidents, access and audit.

## Product pillars and acceptance outcomes
| Pillar | User outcome | How to evaluate |
|---|---|---|
| Attention control | Understand exactly which received calls are screened | Settings simulator agrees with actual call outcome |
| Useful context | Know who called, why, and what to do next | User can open a summary, correct a label and create a callback |
| Safe connectivity | Legitimate callers have a fallback | No-answer, provider failure and quota states reach tested fallbacks |
| Privacy | Share management without silently sharing conversations | Household/admin adversarial access tests pass |
| Predictable cost | Understand base fee and usage responsibility | Checkout, invoices and usage screens reconcile |
| Reversibility | Pause or leave without losing their call path | Forwarding reversal and number retention procedures verified |

## Feature scope by tier of implementation
### Pilot required
Verified auth, private workspace, one supported number, three screening modes limited to the route's capabilities, a tested greeting, message capture, confidence-qualified labels, summary inbox, block/allow actions, callback tasks, human-triggered call back, privacy settings, Square payment lifecycle, support tickets, usage/spend safeguards, provider fallback, basic operations dashboard, public pricing/compatibility/support pages.

### Second release
Native push companion, MV3 extension, calendar read/booking with scoped approval, additional scripts with validation, household invitations, shared billing, line-specific access, BYO credentials for a second provider, richer lifecycle marketing, referrals, support access grants and operational agents.

### Later, separately validated
Native take-call and listen-in, conferencing, selective device-level caller identification, automatic appointment actions under explicit standing authority, additional carriers/VoIP adapters, number porting, enterprise SSO, external developer API, reseller accounts and white labeling. None is represented as production-ready by this kit.

## Measurement definitions
An **eligible call** is an inbound call actually delivered to Redial's configured endpoint. A **screened call** has a screening interaction or deterministic screening decision recorded. A **blocked call** is ended by an explicit policy, with reason. A **message** is a caller-intended message captured under the consent policy. A **successful connection** means the authorized member actually joined—not merely that an alert was pushed.

Count unique logical calls, not webhook deliveries or telephony legs. Track wrongful blocking and missed legitimate calls separately from screening volume. “Time reclaimed” is an optional estimate using an exposed methodology and must not be implied to be a measured fact.

## First successful end-to-end experience
A new member signs up, checks compatibility, purchases or enters an approved free/BYO plan, verifies number ownership, completes a test call, enables screening, receives a real unknown call on the supported path, reads the resulting summary, chooses a callback, and can disable the route without losing control of the number. That sequence—not a populated dashboard screenshot—is the first product milestone.

## v1.1 · Required Live Call Controls scope

Add **Insider**, **Gavel**, **Audible** and **Directory** to the committed product specification. Insider/Gavel formalize the existing listen/take concepts; Audible adds private real-time direction; Directory adds saved/custom phones, extensions, people and supported team/PBX destinations. Their implementation is evidence-gated, not a claim of readiness. The earlier “Later, separately validated” paragraph describes release sequencing, not removal of these new named requirements. Desktop controls follow the call foundation; native media and advanced transfers follow their capability tests. Docs 19–21 define the authoritative behavior for these additions.

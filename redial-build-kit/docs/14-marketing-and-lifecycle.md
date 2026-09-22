# 14 · Marketing stack, growth workflows and lifecycle

## Positioning
Redial sells attention control with context: fewer unnecessary interruptions, useful caller messages and explicit rules for when to connect. Do not sell an unverified “100% spam block,” universal carrier support or fabricated time-saved statistic. Use a recorded or simulated demo labeled accurately.

## Integrated stack
Next.js public website with CMS-backed landing/help/blog content; Supabase for first-party CRM/consent/attribution; Resend for verified-domain transactional email and separately configured marketing delivery; Twilio for approved service/promotional SMS; in-app notifications and native/web push; one privacy-configured analytics product or a minimal first-party event pipeline; approved agent tools for drafts and reports. Keep social publishing connectors optional until their current API permissions are verified.

Resend domain setup requires verified sending-domain DNS configuration. Use the provider-generated SPF/DKIM values and set an appropriate DMARC policy after inventorying existing mail. Do not overwrite existing MX/SPF records or assume a root-domain website move should change mail hosting. [W15]

## Acquisition journey
Traffic → relevant landing page → compatible setup explanation → plan comparison → signup → payment/free eligibility → verified line → first successful screened call → first useful follow-up → retained subscriber/referral.

Each step has a measured event and clear next action. Carrier-incompatible visitors should get a transparent alternative or opted-in waitlist, not a checkout funnel selling something unavailable.

## Analytics events and privacy
`landing_viewed`, `compatibility_started`, `compatibility_completed`, `plan_viewed`, `signup_completed`, `checkout_started`, `payment_settled`, `route_test_passed`, `activation_completed`, `first_message_viewed`, `callback_task_created`, `subscription_cancel_requested`, `referral_qualified`.

Use a pseudonymous account ID, consent state and coarse plan/route dimensions. Never send phone numbers, transcripts, message bodies, contact names, recording links or private support content into ad pixels, session replay or campaign audiences. Server conversion events require deduplication and applicable user choice. Do not equate email opens with reliable human engagement; measure activation and retained contribution.

## Audience segments
Consented prospects, setup-incomplete users, test-passed but inactive users, trial ending, quota approaching, recent successful activation, canceled-but-consented former customers and qualified referral participants. Segments operate on product status, not inferred sensitive caller topics. A person declining marketing still receives essential legally permitted service/security notices where appropriate.

## Lifecycle workflow specifications
| Trigger | Message/action | Suppression / stop condition |
|---|---|---|
| Account verified | Welcome and connection choice | Once per account; stop setup reminders when activated |
| Setup incomplete | Relevant unfinished step and support option | Only eligible contact permission; frequency cap |
| Route test failed | Diagnostics + safe fallback steps | No false activation celebration |
| First useful message | Explain inbox actions | No private transcript inside email by default |
| Approaching quota | Usage notice and options | Once per threshold/window; no automatic charge |
| Renewal upcoming | Amount/date and manage link when policy requires or chosen | Reflect current plan changes and source |
| Payment failed | Secure payment-update link and grace details | Stop immediately when paid/canceled; no redundant charge attempt |
| Cancellation requested | Confirmation, effective date, forwarding/offboarding instructions | Never enroll in marketing by cancellation |
| Refund finalized | Amount/status and purchase reference | Once per completed refund |
| Referral qualified | Approved credit status | After paid settlement/fraud checks; reverse on qualifying refund |

Store the triggering event ID, workflow version, recipient, consent snapshot and unique delivery key. Recheck consent at send time, not only when the sequence started. Stop campaigns after opt-out and enforce account-wide suppression across tools.

## Email deliverability and safety
Separate service and marketing purposes, verified senders, reply-to routes, bounce/complaint handling, list hygiene and sending limits. Templates include accurate identity and applicable unsubscribe/address details. Follow the FTC's commercial-email guidance and applicable jurisdictional requirements; consent/transactional classifications need review. [W25]

Campaign send flow: draft → eligible audience preview → test send → reviewer approval → scheduled send → delivery report → complaint/suppression update. Content change after approval invalidates approval. Expensive SMS broadcasts require cost preview and a maximum recipient/spend limit.

## SMS
Register the applicable Twilio business messaging setup, including A2P 10DLC where required for US long-code application messaging. Registration is not a substitute for valid consent or legal review. [W26]

Use separate optional, unchecked marketing SMS consent; distinguish it from required service terms and informational notifications. Record phone, purpose, timestamp, form location, disclosure version and revocation. Support STOP/HELP according to the approved messaging program. Do not forward a caller's private message to third parties or automatically send an SMS to every incoming caller.

## Referral and affiliate system
Start with member referrals, not a complex marketplace. Use signed referral tokens, attribution windows, self-referral checks, payout/credit hold until a qualifying settled paid period and reversals on refunds/fraud. Show terms and pending/approved/applied/reversed states. Affiliate cash payouts require a separate vendor/tax/compliance workflow and explicit approval.

## SEO and CMS
Publish useful carrier/connection setup guides with tested configuration dates, transparent limitations and reversal instructions. Use meaningful feature/solution pages, canonical URLs, structured metadata matching visible content, XML sitemap and redirects when slugs change. Do not create thousands of unverified carrier/device SEO pages. Private `/app`, `/ops`, checkout result and transcript routes must not be indexable.

## Experiments
Test compatible visitor → activation rate, first useful message → retention, BYO versus managed conversion and contribution, and setup explanation clarity. Do not optimize solely for free signups while increasing paid provider liability. Define hypothesis, exposure unit, guardrail (misrouted calls, support load, complaints), primary outcome and stop condition before each experiment.

## Growth roadmap
Launch original demo and compatibility content; validate a small permissioned pilot; document genuine outcomes with consent; add lifecycle recovery; then test paid acquisition and referral incentives against measured contribution. No invented testimonials, customer counts, carrier partnerships or app-store availability.

## v1.1 · Live Call Controls campaign

Add the four feature pages and a shared “Your agent answers. You stay in control.” section using `content/live-call-controls-copy.md`. Publish availability only after evidence gates pass, explain carrier/provider limitations, and retain existing pricing until approved. The release email is a draft, not authorization to send. User guidance content and private Directory numbers must never enter marketing analytics or audience enrichment.

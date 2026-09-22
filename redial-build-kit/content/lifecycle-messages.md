# Redial · Lifecycle and service message drafts

Templates use explicit variables. Escape values, restrict links to approved owned domains and localize dates/currency. Do not insert private call transcripts into notification bodies by default. Transactional and promotional delivery require separate consent/policy handling. All send operations need deduplication and correct trigger state.

## Welcome — verified account
**Subject:** Welcome to Redial. Let's connect your first line.
**Preheader:** Choose your setup and test it before activation.

Hi {{first_name}},

Your Redial account is ready. Next, choose how calls will reach your assistant: a dedicated number, an eligible provider connection or supported mobile forwarding.

We'll explain the limitations of your selected setup and help you complete a test call before turning on screening.

**Button:** Set up my line → {{setup_url}}

Need help? Contact {{support_email}}.

## Setup incomplete — only relevant step
**Subject:** Your Redial setup is waiting at {{step_name}}

Hi {{first_name}},

Your account is saved, but your call route is not active yet. The next step is {{next_step_description}}.

**Button:** Continue setup → {{setup_url}}

Until setup and testing are complete, do not assume Redial is screening calls on this line.

## Route test failed
**Subject:** Your Redial call test needs attention

The test for {{line_label}} did not confirm a working route. We have not marked screening ready.

{{safe_diagnostic_summary}}

**Button:** Review setup → {{diagnostics_url}}

If carrier forwarding is already enabled, follow the verified reversal or fallback instructions shown in your account. Do not forward calls to an untested destination.

## Activation confirmed
**Subject:** {{line_label}} is ready for its tested Redial setup

Your test call passed and {{connection_mode_label}} is active.

{{capability_specific_explanation}}

**Button:** View my line → {{line_url}}

For conditional forwarding, explain plainly that the mobile may ring first and only forwarded calls reach Redial. Do not use the all-call front-door description for that mode.

## New message — private by default
**Subject:** You have a new message in Redial

A new message is available for {{line_label}}. Sign in to review the caller's details and choose your next step.

**Button:** Open message → {{authenticated_message_url}}

Do not include a one-click public transcript link. Access requires an authorized session.

## Callback reminder
**Subject:** Redial callback reminder · {{local_date_time}}

Your callback task for {{line_label}} is due {{local_date_time}} ({{timezone_label}}).

**Button:** Review callback → {{callback_url}}

This is a reminder. No automatic outbound call has been made.

## Usage warning
**Subject:** {{line_label}} has used {{usage_percent}} of its {{meter_label}} allowance

You've used {{used_quantity}} of {{included_quantity}} for the period ending {{period_end}}. Review your remaining usage and configured fallback.

**Button:** View usage → {{usage_url}}

Additional usage is not automatically purchased unless you have explicitly enabled a supported capped purchase arrangement.

## Cap reached
**Subject:** Redial is using your configured fallback

Your {{meter_label}} allowance has been reached for this usage period. New AI screening on the affected scope is paused and {{fallback_description}} applies.

**Button:** Review options → {{usage_url}}

This notice must reflect actual behavior and must never say calls are protected if the fallback is unavailable.

## Upcoming annual renewal
**Subject:** Your Redial annual membership renews on {{renewal_date}}

Your {{plan_name}} membership is scheduled to renew for {{renewal_total}} {{tax_disclosure}} on {{renewal_date}} using {{payment_method_label}}.

**Button:** Manage membership → {{billing_url}}

Review plan changes, payment details or cancellation before the effective renewal date. Trigger this according to the final applicable policy and required notice timing, not an invented universal legal interval.

## Failed payment
**Subject:** Please review your Redial payment method

We could not confirm the latest payment for {{plan_name}}. Your current service state is {{service_state_description}}. Any approved grace period ends {{grace_end}}.

**Button:** Review billing securely → {{billing_url}}

Never reply with your card number or security code. Updating a card does not mean a charge has succeeded until the provider confirms it.

## Cancellation confirmation
**Subject:** Your Redial renewal has been canceled

Your cancellation request is confirmed. Paid membership access ends {{access_end}} according to your billing policy.

Before changing or releasing your number, review any active carrier forwarding and your export/number-retention options.

**Button:** Review offboarding steps → {{offboarding_url}}

{{refund_status_if_applicable}}

Do not send this as confirmed while the provider operation is still pending. Use a separate “request received” template until confirmed.

## Refund completion
**Subject:** Redial refund update · {{reference}}

A refund of {{refund_amount}} for {{original_payment_reference}} is {{provider_refund_status}}. {{approved_timing_explanation}}

**Button:** View payment history → {{history_url}}

Your subscription status is {{subscription_status}}. A refund and a subscription cancellation are separate actions.

## Support acknowledgment
**Subject:** We received your Redial request · {{ticket_number}}

Hi {{first_name}},

Your request is in our support queue. You can view updates and add details in your account.

**Button:** View support request → {{ticket_url}}

Please do not send access codes, passwords or payment-card information. We will request narrowly scoped diagnostic access through the app when needed.

## Promotional introduction — opted-in recipients only
**Subject:** More context. Fewer interruptions.
**Preheader:** Meet a more intentional way to handle incoming calls.

Redial is designed to ask who is calling and why, follow your rules and put useful messages in one place. Start by checking which connection options are supported for your line.

**Button:** Check compatibility → {{compatibility_url}}

{{legal_sender_name}} · {{postal_address}}
Manage preferences or unsubscribe: {{preferences_url}}

## Service SMS drafts — final program review required
Setup: “Redial: Your setup needs one more step. Sign in to review: {{short_owned_url}}. Reply HELP for help, STOP to opt out. Msg & data rates may apply.”

Message alert: “Redial: A new message is ready in your account. Sign in: {{short_owned_url}}. Reply STOP to opt out.”

HELP: “Redial support: {{support_email}}. Manage alerts in your account. Reply STOP to opt out. Msg & data rates may apply.”

STOP confirmation: “Redial: You have opted out of SMS alerts from this program. No further messages will be sent unless you opt in again.”

Verify final character/segment counts with actual URLs and program identity. Do not claim these draft messages alone establish carrier approval or legal compliance.

## v1.1 · Live controls launch

The draft release announcement and onboarding text for Insider, Gavel, Audible and Directory are in `content/live-call-controls-copy.md`. Send only after release to an authorized audience; generic live-call pushes do not contain private instructions or transcript bodies.

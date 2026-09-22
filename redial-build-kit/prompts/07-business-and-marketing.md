# M5/M8 · Business operations and marketing


Read business operations, marketing, commerce and content specs. Implement the staff-only customer/support/revenue/voice health views first, with least privilege and MFA. Define dashboard metrics and show freshness/source. Do not reuse private member contacts as CRM leads or expose raw conversations to finance/growth roles.

Then add CMS publishing, Redial-business CRM/pipeline, consent-aware audience definitions, lifecycle workflow records and campaign draft/test/approval/send state. Verify Resend domain/webhook configuration and Twilio program readiness. Preview actual eligible recipients, suppression and cost before a send. Content/audience changes invalidate approvals.

Use original draft content from the kit; remove claims not supported by the shipped release. Add referrals only with settlement/fraud/refund-reversal rules. Keep business task management lightweight and independent of source print/ad workflows.

Acceptance: useful actual attention queue, staff role-denial tests, correct billing/usage aggregates, consent recheck at delivery, no duplicate sends and no automatic public campaign publication.

## v1.1 integration dependency

Read `prompts/13-live-call-controls.md` and docs 19–21. Include Insider (silent listening), Gavel (stop agent/takeover), Audible (private direction) and Directory (approved destinations) in this surface's implementation plan. Preserve their permission/media boundaries and truthfully gate unsupported providers/devices. Existing billing prices are unchanged; no feature is considered working merely because its UI exists.

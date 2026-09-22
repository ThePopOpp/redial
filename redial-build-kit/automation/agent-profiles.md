# Redial agent profiles — proposed

## Front Desk · Real-time caller assistant
Purpose: identify caller purpose, take a message, request a permitted connection. Data: current call policy and minimum line identity. Tools: save_message, request_member_connection, create_callback_task when permitted. Never: billing, marketing, unrestricted calendar disclosure, access codes, emergency promises. Cost: per-call reservation and duration cap. Human controls: line owner publishes approved settings; gateway enforces them.

## Support Steward · Hermes operator
Purpose: summarize tickets, find reviewed help articles, explain route/billing state, draft replies and propose diagnostic steps. Data: support-visible records only; no transcript without specific temporary grant. Tools: support, compatibility registry, redacted diagnostics and billing status. Never: secret retrieval, unapproved refunds, automatic number release. Output: draft/action proposal with evidence.

## Revenue Review · Finance assistant
Purpose: reconcile exceptions, identify duplicate/missing events and propose refunds/credits under policy. Data: financial ledger and provider references, not conversations. Tools: finance reads and propose_refund. Human approval: exact payment/amount/action hash; executor validates provider state before any payment mutation.

## Growth Editor · Marketing assistant
Purpose: draft content, lifecycle messages and aggregate campaign analysis. Data: published product capabilities and consented business CRM. Never: private calls, inferred health/financial topics, purchased contact lists or autonomous sending. Human approval: audience snapshot, content version, cost and scheduled action.

## Reliability Analyst · Operations assistant
Purpose: triage synthetic-test failures, summarize incidents and propose remediation. Data: redacted logs/metrics and configuration references. Never: unrestricted shell, Docker socket, DNS changes, key rotation or production deploy without separate authorization. Output: diagnosis confidence, evidence and safe mitigation proposal.

## Coordinator · Paperclip-managed task role
Purpose: assign and track approved business tasks across scoped agents, with budgets and review queues. Does not become the final authority on payment, call or permission state. Reads current Redial records through scoped tools; task completion must reference verified downstream evidence.

## Optional Grok Bot teammate
Purpose: external research, document preparation and owner-approved business workflow assistance. Treat its persistent cloud account/session boundary separately from Redial tenant boundaries. Connect only a scoped Redial operations interface. Do not place all customer/provider credentials on its shared computer. Embedding or self-hosting is not assumed by this kit.

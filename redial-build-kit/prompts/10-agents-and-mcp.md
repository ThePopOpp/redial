# M8 · Permissioned agents and operations


Read agents/MCP, profiles and skill template. Implement a narrow authenticated tool broker over existing authorized domain commands. Do not add direct SQL, arbitrary internal URL fetches, root shell or provider-admin tools to the live voice agent.

Define separate real-time, support, finance, growth and reliability principals. Set budgets/scopes, redacted logs and kill switches. Human approvals bind exact action arguments/resource/cost and expiry; executor rechecks state and idempotency. Start Hermes in isolated support-draft mode. Paperclip may coordinate tasks; Git docs and Redial records remain authoritative. Grok Bot is optional external integration, not assumed self-hosted or embedded.

Create a few versioned skills with synthetic evaluations. Test wrong-tenant access, malicious caller/tool text, secret requests, duplicate writes, changed approval, budget exhaustion and revocation. Review retention of agent memory and derived data.

Acceptance: useful draft/read workflows and validated approval execution, not an unrestricted autonomous operator.

## v1.1 integration dependency

Read `prompts/13-live-call-controls.md` and docs 19–21. Include Insider (silent listening), Gavel (stop agent/takeover), Audible (private direction) and Directory (approved destinations) in this surface's implementation plan. Preserve their permission/media boundaries and truthfully gate unsupported providers/devices. Existing billing prices are unchanged; no feature is considered working merely because its UI exists.

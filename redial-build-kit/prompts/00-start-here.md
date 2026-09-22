# Start-here prompt for Claude Code or Codex

Copy the prompt below into the existing Redial VS Code project. Keep the entire `redial-build-kit` folder in the workspace.

---

You are implementing **Redial**, a paid AI call-screening and call-management platform. It will include a public marketing website, authenticated member web app, private full-business operations dashboard, React Native mobile companions, and a Chrome Manifest V3 extension. The requested stack is Next.js, TypeScript, shadcn/ui, Supabase, Square, Twilio, Resend, xAI, permissioned MCP/agents, and deployment of the app/voice/workers on a Coolify-managed VPS. Hermes and Paperclip are optional internal operations components; Grok Bot is an optional external business teammate, not the call transport.

Read `redial-build-kit/README.md`, `AGENTS.redial.md`, `docs/00-review-and-decisions.md`, `docs/02-repository-reuse.md`, `docs/03-architecture.md` and `docs/18-roadmap-and-acceptance.md` before editing. Also read `docs/19-live-call-controls.md`, `docs/20-live-call-data-api.md`, `docs/21-live-call-topology.md` and `prompts/13-live-call-controls.md` for the v1.1 additions. Then consult the feature-specific documents and original design files under `references/claude-design/`.

The Claude Design files define visual direction and sample interactions, not a production backend. Rebuild their editorial dark/violet design using typed React/shadcn components. Preserve reference files unchanged. Do not ship DCLogic, browser Babel, runtime evaluation, fake customer counts or fake connected-provider statuses. Replace FOYER naming and Stripe placeholders in production with Redial and the requested Square integration.

First inspect this workspace, its git status, existing implementation, manifests/lockfiles, routes, auth, tests, database and deployment setup. Do not overwrite existing project work or configuration. Use these repositories only as read-only references:

- https://github.com/ThePopOpp/ctrl-p.git
- https://github.com/Qallus/Channel-Cast-OS.git

CTRL+P is the first engineering reference because the review found an MV3 extension and test infrastructure; Channel Cast is an additional dashboard/operations/Coolify reference. Confirm suitability from actual code. Reuse selected vetted modules, not entire vertical business domains. Never copy customer data, keys, .env files, source-company domains, print catalogs, ad devices, existing live campaigns or databases. Record file provenance and dependencies.

Create a Redial-specific domain layer for tenancy, line permissions, routing, screening policy, provider adapters, consent, usage, billing and events. Separate the persistent voice gateway and asynchronous worker from the normal Next.js request process. Use Supabase with tested RLS and private storage. A household billing owner must not automatically read another adult's transcripts. Platform staff roles are separate and require MFA.

Build one real vertical slice first: authenticated member → approved free/paid entitlement → verified supported number → real Twilio inbound call → xAI screening with bounded tools → useful inbox message → safe configured fallback and human callback action. Conditional mobile forwarding is not universal unknown-caller interception. Never route accepted calls back into the same forwarding path. Do not expose access codes or let claimed urgency override authorization.

For commerce, implement Square's actual catalog/subscription/invoice/payment lifecycle with verified idempotent webhooks and entitlement reconciliation. Do not grant access from a checkout redirect or ACTIVE subscription alone. Use the proposed plan catalog as configuration pending owner approval; never assume managed AI minutes are unlimited. Native purchasing must separately satisfy the applicable app-store rules.

The product now includes **Insider** (silent live listening), **Gavel** (stop AI and take over), **Audible** (private live agent directions), and **Directory** (approved phone/custom-number/extension/user/team transfers). Include these in the plan and shared call topology; do not implement them as disconnected mock buttons. Keep original prices unchanged and production feature flags off until verified.

Begin with **M0 inventory and a reviewable implementation plan**, then implement the smallest safe M1 increment in this existing project. Do not attempt the entire product in one giant change. Keep later provider/native/store features disabled until tested. Work in local/development/sandbox contexts. Do not make live charges, alter carrier forwarding, port/release numbers, send campaigns or deploy production without specific owner authorization.

For every increment report changed files, actual commands/tests run, migrations/configuration required, remaining limitations and the next acceptance gate. Do not claim tests or integrations succeeded unless they actually ran. Update the decision/reuse log as facts are discovered.

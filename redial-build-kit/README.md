# Redial — Product & Engineering Build Kit
**Prepared for JW · September 18, 2026 · Version 1.1**

Redial is a configurable AI call-screening and call-management service: it receives calls through a supported connection, asks who is calling and why, applies the member's rules, and produces an actionable inbox. The complete product includes a marketing website, authenticated member web app, mobile companions, Chrome extension, and private business operations dashboard.

## What this delivery is
This is a pre-build specification and implementation handoff, not a completed application. It includes product decisions, original website copy, screen specifications, architecture, database and API contracts, provider requirements, Square commerce workflows, agent responsibilities, business operations, security requirements, phased IDE prompts, and a small executable policy reference with tests. The five supplied Claude Design files are preserved unchanged in `references/claude-design/`.

No GitHub repository, VPS, DNS record, provider account, payment, or customer database was changed. No real call, live payment, native app build, or production deployment was tested. The repository review was targeted, not a complete code/security audit.

## Start here in your existing VS Code project
1. Extract this folder **inside your Redial project**, keeping the folder name `redial-build-kit`. Do not replace existing application files.
2. Open `prompts/00-start-here.md`. Give that prompt to Claude Code or Codex with access to this folder.
3. Have the IDE agent inventory the existing project and the two read-only reference repositories before selecting files to reuse.
4. Implement the milestones in `docs/18-roadmap-and-acceptance.md`; read the matching prompt before each milestone.

`AGENTS.redial.md` contains project rules. Merge its relevant instructions into an existing `AGENTS.md` or `CLAUDE.md` after reviewing conflicts; do not overwrite existing instructions wholesale.

## Reading order
| File | Purpose |
|---|---|
| `docs/00-review-and-decisions.md` | Findings from the attachments; proposed changes; unresolved owner decisions |
| `docs/01-product-and-scope.md` | Product model, audience, differentiators, release boundaries |
| `docs/02-repository-reuse.md` | Targeted GitHub findings and safe reuse strategy |
| `docs/03-architecture.md` | Web, voice, workers, database, mobile, and deployment boundaries |
| `docs/04-routes-and-screens.md` | Public, member, business admin, mobile, extension screen inventory |
| `docs/05-member-workflows.md` | Signup, number setup, screening, inbox, privacy, offboarding |
| `docs/06-telephony-and-providers.md` | Carrier compatibility, routing, loop prevention, media, failures |
| `docs/07-square-commerce.md` | Products, checkout, subscriptions, discounts, refunds, entitlements |
| `docs/08-pricing-and-economics.md` | Preserved prototype pricing and proposed managed pricing |
| `docs/09-data-and-access.md` | Data dictionary, tenancy, constraints, RLS/access matrix |
| `docs/10-api-and-events.md` | API inventory, event handling, concurrency and idempotency |
| `docs/11-mobile-and-extension.md` | Native companion strategy and Manifest V3 extension |
| `docs/12-agents-and-mcp.md` | xAI, Hermes, Paperclip, Grok Bot, tools, approvals, isolation |
| `docs/13-business-operations.md` | Staff dashboard, billing operations, CRM, support and reporting |
| `docs/14-marketing-and-lifecycle.md` | Website/CMS, funnel, campaigns, referrals, automations |
| `docs/15-security-and-launch-gates.md` | Security, privacy and legal review requirements |
| `docs/16-local-development-and-coolify.md` | Local workflow, environments, CI, Coolify, backups |
| `docs/17-design-system.md` | Source visual language and accessible production adaptations |
| `docs/18-roadmap-and-acceptance.md` | Dependency-ordered delivery milestones and release evidence |
| `content/website-copy.md` | Original expanded website copy and FAQs |
| `content/lifecycle-messages.md` | Transactional, activation, support and marketing message drafts |
| `content/content-plan.md` | Launch content and campaign briefs |
| `research/sources.md` | Dated source register and verification limitations |
| `reference-code/README.md` | How to run the isolated policy tests |

## Defaults in this proposal
- Public brand spelling: **Redial**; retain **ReDial** in unmodified design references.
- US-first pilot, English-first, adults, one number per member before shared households.
- Square for web billing. Do not silently replace it with Stripe.
- Twilio plus xAI speech-to-speech is the first live stack. Additional adapters remain disabled until tested.
- Use a dedicated Redial-front-door number first; conditional mobile forwarding is a separately described capability.
- Member app and staff operations use separate permission systems. Household billing ownership does not expose other adults' transcripts.
- App, voice gateway and workers on Coolify. Managed Supabase is the recommended first database deployment; a self-hosted alternative is documented.
- Customer-facing carrier/provider logos must distinguish “tested,” “limited,” “planned,” and “unsupported.”

Prices, plan limits, retention periods, support targets, service-level targets and commercial policies labeled **proposed** need owner approval. `redial.example` is a reserved placeholder, not a claim about a domain you own. Redial's legal seller, brand clearance, merchant account and operating jurisdiction must be settled before charging customers.

## v1.1 · Added Live Call Controls

The four owner-requested features are now specified across the product, website, member and business dashboard, mobile/extension strategy, architecture, permissions, contracts and IDE prompts:

**Insider** listens silently to agent and caller; **Gavel** stops/removes the agent and hands the call to the member; **Audible** sends private live direction; **Directory** transfers to approved saved/custom numbers, extensions and other supported destinations.

Start this addition with `prompts/13-live-call-controls.md`. Read `docs/19-live-call-controls.md`, `docs/20-live-call-data-api.md` and `docs/21-live-call-topology.md`. New content is in `content/live-call-controls-copy.md`; typed interfaces in `contracts/live-call-controls.ts`; feature flags/limits in `configuration/live-controls.proposed.json`; sources in `research/live-controls-sources.md`.

These are additional planned requirements, not newly activated integrations. Existing prices and plan quotas are unchanged. Full-suite calls require a tested conference topology and separate cost validation. The ZIP preserves original reference files byte-for-byte. See `CHANGELOG.md` for update/merge instructions.

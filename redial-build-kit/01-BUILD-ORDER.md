# 01 · Ordered build sequence

This is a navigation layer over the existing v1.1 roadmap. It does not add or remove product requirements. Milestone names and exit gates come from `docs/18-roadmap-and-acceptance.md`; Live Call Controls increments A–I come from `prompts/13-live-call-controls.md`.

**Run one reviewable stage at a time.** Read later feature dependencies before choosing an early architecture, but do not represent later integrations as working or deploy them early.

| Order | Existing milestone | Use these prompts | Required outcome before advancing |
|---|---|---|---|
| 00 | Start | `02-VS-CODE-PROMPT.md`, then `prompts/00-start-here.md` | The IDE agent understands the current product, existing workspace, constraints, and four Live Call Controls. These are two entry points to the same initial task, not two separate builds. |
| 01 | M0 · Inspect and isolate | `prompts/01-inventory-and-reuse.md` | Workspace inventory, current errors/baseline, reuse assessment, source provenance, environment and dependency decisions. |
| 02 | M1 · Product shell | `prompts/02-shell-and-design.md` | Public/member/staff shells, authentic brand direction, labeled fixtures, initial auth and workspace boundaries. |
| 03 | M2 · Secure data core | `prompts/03-supabase-and-permissions.md`; read live-controls increment A | Scoped domain/API contracts, repeatable migration proposals, tenant and line permissions, baseline authorization tests. |
| 04 | M3 · Real call vertical slice | `prompts/04-real-voice-slice.md` | One authorized test number, actual screening, useful message/inbox, safe fallback, recorded costs and failure evidence. |
| 05 | M3a · Live-control topology proof | `prompts/13-live-call-controls.md`, increments A–C | Shared call topology, independent AI participant, read-only/labeled console, caller survival after AI removal, access and cost evidence. |
| 06 | M4 · Paid membership | `prompts/05-square-billing.md` | Square sandbox lifecycle, verified reconciliation/entitlements, monthly and annual rules, safe cancellation and refunds. |
| 07 | M5 · Operable pilot | `prompts/06-member-experience.md`, then core portions of `prompts/07-business-and-marketing.md` | Member workflows, staff support, customer view, diagnostics, core emails and CMS, consent/suppression and restoration tests. |
| 08 | M6 · Companion surfaces | `prompts/08-mobile-companion.md`, then `prompts/09-chrome-extension.md` | Mobile inbox/push and extension side panel, scoped permissions, device/worker evidence. Do not claim untested native call audio works. |
| 09 | M7 · Insider | `prompts/13-live-call-controls.md`, increment D | Provider-enforced silent listening, revocation and disconnect tests, caller continues after listener leaves. |
| 10 | M7 · Gavel | Same prompt, increment E | One authorized user takes over, AI output/input/tools stop, races and failure paths handled. |
| 11 | M7 · Audible | Same prompt, increment F | Agent-session-bound private guidance, truthful delivery states, preserved permissions and tested provider behavior. |
| 12 | M7 · Directory and sharing | Same prompt, increments G–I; matching companion/member prompts | Approved phone/custom-number transfers first; extensions, groups, SIP/private briefing/native audio only after their own tests. Preserve household privacy and unchanged prices/quotas. |
| 13 | M8 · Growth and operational agents | Growth portions of `prompts/07-business-and-marketing.md`, then `prompts/10-agents-and-mcp.md` | CRM, campaigns, referrals, scoped internal agents/tools, approvals, injection tests and spend limits. |
| 14 | M9 · Release preparation | `prompts/11-coolify-and-release.md` | Staging/CI/deployment configuration, monitoring, backup/restore and rollback evidence. This is not authorization to deploy production. |
| 15 | M9 · Independent review and signoff | `prompts/12-independent-security-review.md`; return to release prompt after findings are resolved | All blocking gates closed, documented compatibility and pricing, explicit owner signoff before production changes. |

## Primary specification reading order

Before implementation: `docs/00-review-and-decisions.md`, `docs/01-product-and-scope.md`, `docs/02-repository-reuse.md`, `docs/03-architecture.md`, `docs/17-design-system.md`, and `docs/18-roadmap-and-acceptance.md`.

Before telephony: `docs/06-telephony-and-providers.md`, `docs/19-live-call-controls.md`, `docs/20-live-call-data-api.md`, and `docs/21-live-call-topology.md`. These ensure the initial call design anticipates the full requested feature set.

For other stages, read the matching numbered documents. Security/access, consent, billing entitlements, and failure handling apply throughout; they are not deferred to the final review.

## Evidence at every stage

Record the files changed, relevant decision, commands actually run, test results, migration/configuration requirements, current limitations, and the next gate. Update the working application records, not the original Claude Design references. Do not infer live integration success from generated code, fixtures, screenshots, or passing reference tests.

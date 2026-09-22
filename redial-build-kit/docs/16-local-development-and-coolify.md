# 16 · VS Code, environments, CI and Coolify deployment

## Local first
Use the existing Redial folder. Keep the inspected package manager/lockfile unless a deliberate migration is approved. Develop web, gateway and worker as separately startable processes. A Windows workstation can use an appropriate native shell or WSL2/Docker workflow; do not assume a particular path or installed toolchain.

Inspect the actual installed Next/React versions and current supported security releases before implementing. Follow the official Next self-hosting and shadcn setup documentation for the selected versions. Do not blindly run a scaffolding CLI in a nonempty folder or overwrite the user's project. [W27, W28]

## Environment isolation
| Environment | Data / integrations | Public ingress |
|---|---|---|
| Local | Synthetic fixtures, local/dev Supabase, Square sandbox, dedicated test phone/provider budget | Restricted temporary HTTPS/WSS tunnel when needed |
| Staging | Separate Supabase project/schema deployment boundary, separate provider config and verified test numbers | Staging domain with production-like proxy/signature behavior |
| Production | Approved merchant/phone accounts and least-privilege staff | Verified owned domains and external health checks |

Never copy production `.env` or customer data into a reference repo/local fixture. Use separate webhook signature keys, redirect allowlists, mobile bundle IDs and extension origins for each environment. A local test using a real phone provider may incur real costs even when Square is in sandbox.

## Development workflow
1. Inventory workspace and references, record dependencies, generate implementation plan and establish baseline typecheck/tests/build.
2. Build responsive shell and synthetic demo fixtures without activating external providers.
3. Create new Supabase migrations and automated allow/deny tests; seed synthetic accounts with explicit fixture mode.
4. Implement domain services/API schemas and unit tests; use stub adapters with honest “demo” badges.
5. Connect one verified Twilio/xAI route in a dedicated sandbox/test budget. Provider webhooks cannot reach `localhost` directly; expose only required endpoints through a trusted tunnel with real signature validation still enabled.
6. Implement Square enrollment and reconciliation in sandbox. Distinguish simulated fixture events from provider-delivered verified events.
7. Run integration, browser, native and extension tests for the features actually implemented.
8. Promote through staging using reviewed migrations and reproducible images; perform owner-authorized live tests before launch.

## Supabase choice
**Recommended first:** managed Supabase for Postgres/Auth/Storage with the app, voice gateway and worker hosted on the Coolify VPS. This is a split-hosting recommendation, not a claim that all components are on the VPS.

**All-self-hosted option:** use the supported Supabase Docker deployment with its Auth, API, Realtime, Storage and related services—not just a standalone Postgres container. Own upgrades, secret configuration, SMTP, backups, object storage, TLS, monitoring, resource sizing and recovery. Keep it isolated from the agent runner and public administrative access. Follow official self-hosting guidance and verify the chosen release. [W29]

## Coolify deployment inventory
Web container; voice gateway container; worker container; optional private Redis; optional isolated agent/orchestration services. Managed Supabase requires no local Supabase container. Self-hosted Supabase is a separate reviewed service group with resource and backup planning.

Use the Next standalone output where appropriate. Coolify documents Next/Docker deployment patterns; existing Channel Cast Dockerfile is a reusable pattern, not a proven Redial deployment. Rebuild paths and public environment variables must match the selected application structure. [W30, W27]

## Production container requirements
Multi-stage build; locked installs; non-root runtime; minimal writable filesystem; environment validation; image/dependency scanning; no secret copied into a layer; no development server. Pin image versions/digests after validation. Keep persistent private storage outside ephemeral containers. Explicitly configure build-time public values and runtime private secrets; a changed public environment value may require a rebuild depending on framework usage.

## Domains and networking
Use owner-confirmed domains rather than assuming `redial.app` belongs to this project. Proposed purposes: public/app domain, voice WSS endpoint, webhook endpoint and restricted ops/agent entrypoint. Exact subdomains are configuration. Inventory existing DNS and mail records before changes; preserve unrelated services.

Configure HTTPS/WSS upgrade forwarding, appropriate connection/idle limits, request body limits and trusted proxy settings. Twilio signature validation must use the exact public URL semantics even behind the proxy. Do not expose Postgres, Redis, Supabase Studio, Paperclip administration or unrestricted MCP publicly.

## Health, rollout and capacity
Provide separate liveness and readiness endpoints. A provider outage should be represented in readiness/diagnostics without causing endless destructive restarts. Drain active voice sessions before changing the gateway; web releases can deploy independently. Schedule migrations outside live-call critical transactions; use expand/contract schema changes compatible with old/new workers.

Do not assume the user's current VPS capacity. Record CPU, memory, disk, regions, egress and other colocated apps. Load-test concurrent calls, websocket duration, queue lag, DB connections and deployment churn. Choose process limits from measured results. A single VPS is not high availability.

## Backups and recovery
Back up relational data, object storage, encryption-key material and essential configuration using access-controlled encrypted offsite storage. A Postgres backup alone does not preserve externally stored recordings. Keep keys recoverable without bundling them insecurely with all data. Specify owner-approved recovery-point/recovery-time objectives and test restoration into an isolated environment. Ensure deletion/retention policy covers backups and restored data.

## CI acceptance pipeline
Secret scan → dependency/license checks → lint/typecheck → unit tests → schema/contract tests → RLS tests → web build → integration tests → browser accessibility/responsiveness → container scan/build → staging migration/deploy → synthetic routing and billing checks → manual release review.

Native mobile and extension builds use their own artifacts/signing and store-release procedures. A successful Next build does not test those surfaces. Keep deployment credentials outside general-purpose coding-agent contexts.

## Operational runbooks
Include provider-key rotation, failed Square webhook replay, stuck provisioning, routing loop, AI provider outage, exhausted budget, partial deployment, database restore, number cancellation/port-out, abuse incident and privacy request. Each runbook names an owner, exact diagnostic commands, safe mitigation, rollback and evidence required before closure.

## v1.1 · Live-control service configuration

Add a distinct AI conference TwiML Application configuration reference rather than repurposing an existing human Voice SDK application blindly. Keep `REDIAL_LIVE_CONTROLS_ENABLED=false` until evidence gates pass. Configure signed conference callbacks, bounded call coordinator commands, audio socket draining and call-state reconciliation. A voice-gateway deployment must not kill existing calls without a tested drain/fallback strategy. No new VPS ports or services are required merely by editing these specs; review actual transport/firewall requirements during implementation. Do not share credentials with mobile/extension clients.

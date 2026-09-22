# M9 · Deployment and operations


Read the local/Coolify specification. Inventory current VPS resources, domains, other applications and DNS/mail settings; do not modify them without authorization. Produce separate reproducible web/gateway/worker builds with non-root runtime, validated environment schemas, secure networking and isolated data/agent access.

Choose managed versus supported self-hosted Supabase explicitly. Configure correct TLS/WSS forwarding and signature validation, independent provider fallback, synthetic checks, logs/metrics, backup/restore and gateway connection draining. Do not expose DB/Redis/Studio/MCP admin ports publicly. A single VPS is not HA.

Create CI checks and staging release steps, then a release-evidence record with actual test results, migrations, provider tests, policies, rollback and on-call owner. Native/extension releases have separate signing/store processes. Do not make a live deployment, payment, port or campaign publication without specific authorization.

Acceptance: reproducible staging deploy, confirmed fallback, tested recovery and truthful production-readiness gaps.

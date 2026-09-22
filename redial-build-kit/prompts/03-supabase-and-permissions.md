# M2 · Data, identity and resource authorization


Read the data/access and API specs. Implement only the schema needed for the first live slice: workspaces/memberships, staff roles, lines/routes/grants, published policy versions, call/event/message records, consent, billing operation references, usage reservations and durable outbox. Use a new approved development Supabase environment.

Write reversible or safely forward-fixable migrations according to project convention. Add explicit grants and RLS per exposed table; private storage policies; composite tenant-parent constraints; uniqueness for provider/environment/account/event IDs; and indexes for actual queries. Avoid recursive membership policies and mutable-user-metadata authority. Keep provider/server secrets out of all client-readable records.

Implement tested server permission helpers for workspace, line, transcript, billing and staff actions. Add pgTAP/equivalent tests with at least two tenants, two adults in a household, a billing owner, support staff and a revoked member. Test relationship reassignment, private URLs and jobs/exports—not only page guards.

Acceptance: repeatable migrations, validated queries, deny tests that prove isolation, minimal grants and no production data or credentials in local fixtures.

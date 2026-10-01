begin;

-- Restore what `drop schema public cascade` quietly destroyed.
--
-- Recreating the schema restored its own ACL, but default privileges are stored
-- per role per schema in pg_default_acl, and dropping the schema deleted those
-- rows. A stock Supabase project carries `alter default privileges in schema
-- public grant all on tables to postgres, anon, authenticated, service_role`,
-- which is why a new table is reachable by the backend role without any grant
-- being written. After the reset that was gone, so every table created since
-- carried exactly the grants its migration wrote and nothing else.
--
-- `service_role` kept its `bypassrls` attribute, because that is a cluster-level
-- role property rather than a schema object. So the failure was not a policy
-- refusing a row: it was `permission denied for table phone_numbers`, with the
-- backend holding no SELECT at all. The voice gateway could not resolve a
-- dialled number, and the billing worker would have hit the same wall on its
-- first webhook.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- And make every future table behave the same way without each migration having
-- to remember. Deliberately narrower than stock Supabase: `anon` and
-- `authenticated` are omitted, so a new table is closed to client roles until a
-- migration grants it explicitly.
--
-- Two reasons. Every migration here already grants those roles explicitly and
-- revokes first, so nothing depends on the wider default. And the isolated
-- harness behind `npm run test:database` is plain Postgres with no default
-- privileges at all, so restoring the stock grants would make production more
-- permissive than the thing the row-level-security suite actually proves.
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant all on sequences to postgres, service_role;
alter default privileges in schema public grant all on functions to postgres, service_role;

commit;

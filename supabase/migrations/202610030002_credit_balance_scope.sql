begin;

-- Two corrections to 202610030001, both found by the Supabase advisors.
--
-- The first is a real hole. `workspace_credit_balance` takes a workspace id and
-- is `security definer`, so it ran with the owner's rights and answered for any
-- workspace the caller named. The `credit_read` policy was doing its job on the
-- table and this function walked straight past it: a signed-in member could ask
-- for a stranger's balance and get a number back. A function that takes an
-- identifier instead of reading `auth.uid()` has to re-check the caller itself,
-- the same reason `may_read_recording` is service_role only.
--
-- It now answers only for a workspace the caller already has billing access to,
-- which is the predicate behind the invoices, payments and credit policies. A
-- caller without it gets null rather than zero: zero is an answer, and this
-- function has no business confirming that a workspace exists.
create or replace function public.workspace_credit_balance(w uuid) returns bigint
  language sql stable security definer set search_path='' as $$
  select case when private.billing_access(w)
    then coalesce((select sum(amount_minor) from public.credit_entries where workspace_id = w), 0)::bigint
    end;
$$;

-- The second is tidiness rather than exposure. A trigger function is reachable
-- as an RPC because it lives in the exposed schema, but Postgres refuses to run
-- one outside a trigger — `trigger functions can only be called as triggers` —
-- so none of these could ever execute. Revoked anyway: every other function in
-- this schema states who may call it, and leaving six that do not invites the
-- reader to assume the grant was considered.
revoke all on function public.guard_plan_version(), public.guard_price(),
  public.guard_credit_balance(), public.refuse_credit_rewrite(),
  public.guard_capture_consent(), public.apply_consent_withdrawal()
  from public, anon, authenticated;

commit;

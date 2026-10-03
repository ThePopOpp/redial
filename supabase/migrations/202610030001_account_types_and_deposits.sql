begin;

-- Account types and refundable deposits.
--
-- Two things were missing between the billing schema and an account someone can
-- actually open. The catalog tables existed but nothing could write them: there
-- were read projections for staff and no way to create a product, publish a
-- plan or set a price, so the five plan names in the product lived only as a
-- hardcoded map in `src/lib/review/commands.ts`. And a deposit had no home at
-- all: `payments` records money that arrived, `invoices` records money owed,
-- and neither represents money held on account that the member can get back.
--
-- This migration adds the Super Admin side of the catalog and a credit ledger
-- for deposits. It deliberately stops short of checkout: a plan selection and a
-- deposit payment both belong in `checkout_operations`, which already has the
-- quote, the terms version, the expiry and the provider identifiers, and which
-- is driven by the worker because the worker owns provider calls.

-- ---------------------------------------------------------------------------
-- Who may change the catalog
-- ---------------------------------------------------------------------------
-- A new capability rather than reusing billing_write. billing_write is the
-- money-movement grant: it requests refunds and it is held by finance. Setting
-- the price of a plan is a product decision that changes what every future
-- customer is charged, so it is separated and given to owner and admin only.
-- Finance and analyst keep billing_read and can see the result.
do $$
declare constraint_name text;
begin
  select conname into strict constraint_name from pg_constraint
    where conrelid = 'public.staff_capabilities'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%capability%';
  execute format('alter table public.staff_capabilities drop constraint %I', constraint_name);
end $$;
alter table public.staff_capabilities add constraint staff_capabilities_capability_check
  check(capability in (
    'support_read','support_write','customer_read','customer_admin',
    'billing_read','billing_write','refund_approve','catalog_write',
    'reminder_send','reminder_approve','jobs_admin','staff_admin','audit_read'));
insert into public.staff_capabilities(role, capability)
  values('owner','catalog_write'),('admin','catalog_write');

-- ---------------------------------------------------------------------------
-- A published plan version is frozen
-- ---------------------------------------------------------------------------
-- Versions exist so that changing what a plan includes does not rewrite what an
-- existing subscriber was sold. That only holds if a published version cannot
-- be edited afterwards, so the features and limits of anything past draft are
-- immutable and a change means a new version. Availability itself still moves,
-- in one direction: draft to available to retired, never back.
create function public.guard_plan_version() returns trigger
  language plpgsql security definer set search_path='' as $$
begin
  if old.availability <> 'draft'
    and (new.features is distinct from old.features or new.limits is distinct from old.limits) then
    raise exception 'A published plan version is immutable. Create a new version instead.'
      using errcode = 'check_violation';
  end if;
  if old.availability = 'retired' and new.availability <> 'retired' then
    raise exception 'A retired plan version cannot be reopened' using errcode = 'check_violation';
  end if;
  if old.availability = 'available' and new.availability = 'draft' then
    raise exception 'A published plan version cannot return to draft' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger plan_version_frozen before update on public.plan_versions
  for each row execute function public.guard_plan_version();

-- The same one-way rule for a price. A member who was quoted a price keeps it
-- through the subscription that references it; withdrawing an offer is a
-- retirement, not an edit.
create function public.guard_price() returns trigger
  language plpgsql security definer set search_path='' as $$
begin
  if old.availability <> 'draft' and new.amount_minor is distinct from old.amount_minor then
    raise exception 'A published price is immutable. Retire it and publish a new one.'
      using errcode = 'check_violation';
  end if;
  if old.availability = 'retired' and new.availability <> 'retired' then
    raise exception 'A retired price cannot be reopened' using errcode = 'check_violation';
  end if;
  if old.availability = 'available' and new.availability = 'draft' then
    raise exception 'A published price cannot return to draft' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger price_frozen before update on public.prices
  for each row execute function public.guard_price();

-- ---------------------------------------------------------------------------
-- Catalog management, for the Super Admin dashboard
-- ---------------------------------------------------------------------------
create function public.create_billing_product(code text, name text, kind text)
  returns uuid language plpgsql security definer set search_path='' as $$
declare created uuid;
begin
  if not private.staff_capability('catalog_write') then raise exception 'Not permitted'; end if;
  insert into public.billing_products(code, name, kind) values(code, name, kind) returning id into created;
  perform private.staff_audit('catalog.product_created', created);
  return created;
end $$;

-- The version number is assigned here rather than supplied, so two
-- administrators drafting at once cannot pick the same one. The unique index on
-- (product_id, version) is the backstop; the lock is what stops it being a
-- routine collision rather than a rare one.
create function public.create_plan_version(product uuid, features jsonb, limits jsonb)
  returns uuid language plpgsql security definer set search_path='' as $$
declare created uuid; next_version integer;
begin
  if not private.staff_capability('catalog_write') then raise exception 'Not permitted'; end if;
  perform pg_advisory_xact_lock(hashtextextended(product::text, 11));
  select coalesce(max(version), 0) + 1 into next_version from public.plan_versions where product_id = product;
  insert into public.plan_versions(product_id, version, features, limits)
    values(product, next_version, features, limits) returning id into created;
  perform private.staff_audit('catalog.plan_version_created', created);
  return created;
end $$;

-- Draft plan versions are editable; this is the only path that writes them, so
-- the trigger above governs what happens once one is published.
create function public.update_plan_draft(plan_version uuid, features jsonb, limits jsonb)
  returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.staff_capability('catalog_write') then raise exception 'Not permitted'; end if;
  update public.plan_versions set features = update_plan_draft.features, limits = update_plan_draft.limits
    where id = plan_version and availability = 'draft';
  if not found then raise exception 'No draft plan version to update'; end if;
  perform private.staff_audit('catalog.plan_version_updated', plan_version);
end $$;

create function public.publish_plan_version(plan_version uuid)
  returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.staff_capability('catalog_write') then raise exception 'Not permitted'; end if;
  update public.plan_versions set availability = 'available', published_at = now()
    where id = plan_version and availability = 'draft';
  if not found then raise exception 'No draft plan version to publish'; end if;
  perform private.staff_audit('catalog.plan_version_published', plan_version);
end $$;

create function public.retire_plan_version(plan_version uuid)
  returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.staff_capability('catalog_write') then raise exception 'Not permitted'; end if;
  update public.plan_versions set availability = 'retired' where id = plan_version and availability <> 'retired';
  if not found then raise exception 'No plan version to retire'; end if;
  -- A retired plan must not keep offering prices. Existing subscriptions are
  -- untouched: they reference the version they were sold, which is the point
  -- of versioning.
  update public.prices set availability = 'retired'
    where plan_version_id = plan_version and availability <> 'retired';
  perform private.staff_audit('catalog.plan_version_retired', plan_version);
end $$;

create function public.set_plan_price(plan_version uuid, cadence text, currency text,
  amount_minor bigint, square_variation text default null)
  returns uuid language plpgsql security definer set search_path='' as $$
declare created uuid;
begin
  if not private.staff_capability('catalog_write') then raise exception 'Not permitted'; end if;
  insert into public.prices(plan_version_id, cadence, currency, amount_minor, square_plan_variation_id)
    values(plan_version, cadence, currency, amount_minor, square_variation) returning id into created;
  perform private.staff_audit('catalog.price_created', created);
  return created;
end $$;

-- A price cannot be offered before the plan it prices. Checked here rather than
-- as a constraint because it is a rule about two rows, and a check constraint
-- cannot see the other table.
create function public.publish_price(price uuid)
  returns void language plpgsql security definer set search_path='' as $$
declare plan_state text;
begin
  if not private.staff_capability('catalog_write') then raise exception 'Not permitted'; end if;
  select pv.availability into plan_state from public.prices p
    join public.plan_versions pv on pv.id = p.plan_version_id where p.id = price;
  if plan_state is null then raise exception 'Unknown price'; end if;
  if plan_state <> 'available' then raise exception 'Publish the plan version before its price'; end if;
  update public.prices set availability = 'available' where id = price and availability = 'draft';
  if not found then raise exception 'No draft price to publish'; end if;
  perform private.staff_audit('catalog.price_published', price);
end $$;

create function public.retire_price(price uuid)
  returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.staff_capability('catalog_write') then raise exception 'Not permitted'; end if;
  update public.prices set availability = 'retired' where id = price and availability <> 'retired';
  if not found then raise exception 'No price to retire'; end if;
  perform private.staff_audit('catalog.price_retired', price);
end $$;

-- What the Super Admin dashboard lists. Draft and retired rows are included
-- because managing a catalog means seeing what is not yet offered and what no
-- longer is; the public pricing page reads the `available` rows through their
-- own policies instead.
create function public.staff_catalog() returns jsonb
  language sql stable security definer set search_path='' as $$
  select case when private.staff_capability('billing_read') then (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'code', p.code, 'name', p.name, 'kind', p.kind,
      'versions', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', v.id, 'version', v.version, 'availability', v.availability,
          'features', v.features, 'limits', v.limits, 'published_at', v.published_at,
          'prices', (select coalesce(jsonb_agg(jsonb_build_object(
              'id', r.id, 'cadence', r.cadence, 'currency', r.currency,
              'amount_minor', r.amount_minor, 'availability', r.availability,
              'square_plan_variation_id', r.square_plan_variation_id) order by r.cadence), '[]'::jsonb)
            from public.prices r where r.plan_version_id = v.id)) order by v.version desc), '[]'::jsonb)
        from public.plan_versions v where v.product_id = p.id)) order by p.name), '[]'::jsonb)
    from public.billing_products p)
  else null end;
$$;

revoke all on function public.create_billing_product(text,text,text),
  public.create_plan_version(uuid,jsonb,jsonb), public.update_plan_draft(uuid,jsonb,jsonb),
  public.publish_plan_version(uuid), public.retire_plan_version(uuid),
  public.set_plan_price(uuid,text,text,bigint,text), public.publish_price(uuid),
  public.retire_price(uuid), public.staff_catalog() from public, anon;
grant execute on function public.create_billing_product(text,text,text),
  public.create_plan_version(uuid,jsonb,jsonb), public.update_plan_draft(uuid,jsonb,jsonb),
  public.publish_plan_version(uuid), public.retire_plan_version(uuid),
  public.set_plan_price(uuid,text,text,bigint,text), public.publish_price(uuid),
  public.retire_price(uuid), public.staff_catalog() to authenticated;

-- ---------------------------------------------------------------------------
-- Deposits: refundable credit held on the account
-- ---------------------------------------------------------------------------
-- A deposit is money the member has handed over that is still theirs. That is
-- not a payment against an invoice and it is not revenue, so it gets its own
-- ledger rather than a column on the workspace: a single balance figure cannot
-- say where the money came from, what consumed it, or how much is still
-- refundable, and those are exactly the questions a dispute asks.
--
-- Append-only, in signed minor units, so the balance is the sum and no row is
-- ever rewritten. A correction is a new entry.
create table public.credit_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  kind text not null check(kind in ('deposit','drawdown','refund','adjustment')),
  -- Positive adds to the balance, negative removes from it. The sign is tied to
  -- the kind so a 'deposit' can never quietly take money out.
  amount_minor bigint not null check(amount_minor <> 0),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  -- What this entry is about. A deposit points at the payment that funded it, a
  -- drawdown at the invoice it paid, a refund at the refund that returned it.
  payment_id uuid references public.payments(id),
  invoice_id uuid references public.invoices(id),
  refund_id uuid references public.refunds(id),
  -- Staff adjustments are the only entries a person writes directly, so they
  -- carry who and why. Provider-driven entries carry neither.
  actor_id uuid references auth.users(id),
  note text check(note is null or length(note) between 1 and 300),
  -- Replay protection for the worker: a Square webhook can arrive twice, and
  -- crediting a deposit twice is the expensive direction.
  idempotency_key text not null check(length(idempotency_key) between 8 and 128),
  created_at timestamptz not null default now(),
  unique(workspace_id, idempotency_key),
  check((kind = 'deposit') = (amount_minor > 0 and payment_id is not null)),
  check(kind <> 'drawdown' or (amount_minor < 0 and invoice_id is not null)),
  check(kind <> 'refund' or (amount_minor < 0 and refund_id is not null)),
  check(kind <> 'adjustment' or (actor_id is not null and note is not null))
);
create index credit_scope on public.credit_entries(workspace_id, created_at desc, id desc);

-- The balance, and the part of it that could still be handed back. They are the
-- same number: money already consumed by an invoice has left the ledger, so a
-- member can never be refunded more than they currently hold.
create function public.workspace_credit_balance(w uuid) returns bigint
  language sql stable security definer set search_path='' as $$
  select coalesce(sum(amount_minor), 0)::bigint from public.credit_entries where workspace_id = w;
$$;

-- A ledger that can go negative is an overdraft nobody agreed to, so the
-- database refuses it. This is a trigger and not a check constraint because the
-- rule is about the sum of the other rows: service_role carries bypassrls,
-- which skips policies and not triggers, so the worker is held to it too.
create function public.guard_credit_balance() returns trigger
  language plpgsql security definer set search_path='' as $$
declare existing_currency text; balance bigint;
begin
  -- Serialize per workspace. Without this, two concurrent drawdowns each see a
  -- sufficient balance and both commit.
  perform pg_advisory_xact_lock(hashtextextended(new.workspace_id::text, 23));
  select currency into existing_currency from public.credit_entries
    where workspace_id = new.workspace_id limit 1;
  if existing_currency is not null and existing_currency <> new.currency then
    raise exception 'This account holds credit in %, not %', existing_currency, new.currency
      using errcode = 'check_violation';
  end if;
  select coalesce(sum(amount_minor), 0) into balance from public.credit_entries
    where workspace_id = new.workspace_id;
  if balance + new.amount_minor < 0 then
    raise exception 'Credit balance cannot go negative: balance %, requested %', balance, new.amount_minor
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger credit_balance_guard before insert on public.credit_entries
  for each row execute function public.guard_credit_balance();

-- Append-only in the strong sense. An edited or deleted ledger entry is not a
-- ledger, and the balance above trusts that the history is complete.
create function public.refuse_credit_rewrite() returns trigger
  language plpgsql security definer set search_path='' as $$
begin
  raise exception 'The credit ledger is append-only. Post a correcting entry instead.'
    using errcode = 'check_violation';
end $$;
create trigger credit_append_only before update or delete on public.credit_entries
  for each row execute function public.refuse_credit_rewrite();

-- A staff correction. Deposits and drawdowns come from the worker against a
-- real payment or invoice; this is the only human-written entry, and it is
-- capability-gated, audited and forced to carry a reason.
create function public.adjust_workspace_credit(w uuid, amount bigint, currency text, reason text, key text)
  returns uuid language plpgsql security definer set search_path='' as $$
declare created uuid;
begin
  if not private.staff_capability('billing_write') then raise exception 'Not permitted'; end if;
  if amount = 0 then raise exception 'An adjustment must change the balance'; end if;
  if reason is null or length(trim(reason)) not between 1 and 300 then
    raise exception 'Give a reason for the adjustment';
  end if;
  insert into public.credit_entries(workspace_id, kind, amount_minor, currency, actor_id, note, idempotency_key)
    values(w, 'adjustment', amount, currency, auth.uid(), trim(reason), key)
    returning id into created;
  perform private.staff_audit('billing.credit_adjusted', created);
  return created;
end $$;
revoke all on function public.adjust_workspace_credit(uuid,bigint,text,text,text) from public, anon;
grant execute on function public.adjust_workspace_credit(uuid,bigint,text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.credit_entries enable row level security;
revoke all on public.credit_entries from anon, authenticated;
grant select on public.credit_entries to authenticated;

-- The member sees their own ledger. billing_access is the same predicate the
-- invoices and payments policies use, so a deposit is visible to exactly the
-- people who can already see what it paid for.
create policy credit_read on public.credit_entries for select to authenticated
  using(private.billing_access(workspace_id));

revoke all on function public.workspace_credit_balance(uuid) from public, anon;
grant execute on function public.workspace_credit_balance(uuid) to authenticated;

commit;

begin;

-- Billing schema: internal catalog, subscriptions, invoices, payments,
-- operations and usage. Square is the web processor; no Stripe object, webhook
-- type or customer portal appears here.
--
-- Two rules shape every table below.
--
-- Money is integer minor units plus an explicit ISO currency. There is no
-- floating point and no bare "amount" column anywhere.
--
-- Billing state is not access state. An ACTIVE provider subscription is not
-- proof that the latest invoice settled, so entitlements carry their own
-- validity interval and nothing reads `subscriptions.status` to decide what a
-- workspace may do. Provider status, internal state, entitlement interval and
-- usage interval are four separate facts that disagree routinely.

-- ----------------------------------------------------------------- catalog
create table public.billing_products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check(code ~ '^[a-z][a-z0-9_]{1,40}$'),
  name text not null check(length(name) between 1 and 80),
  kind text not null check(kind in ('membership','add_on')),
  created_at timestamptz not null default now()
);

-- A published plan version is the immutable snapshot of what a customer agreed
-- to. New commercial terms create a new version rather than silently rewriting
-- the features and limits under existing customers.
create table public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.billing_products(id),
  version integer not null check(version > 0),
  features jsonb not null check(jsonb_typeof(features)='object' and octet_length(features::text) <= 8000),
  limits jsonb not null check(jsonb_typeof(limits)='object' and octet_length(limits::text) <= 4000),
  availability text not null default 'draft' check(availability in ('draft','available','retired')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(product_id, version),
  check(availability = 'draft' or published_at is not null)
);

create table public.prices (
  id uuid primary key default gen_random_uuid(),
  plan_version_id uuid not null references public.plan_versions(id),
  cadence text not null check(cadence in ('monthly','annual','free')),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check(amount_minor >= 0),
  availability text not null default 'draft' check(availability in ('draft','available','retired')),
  -- Doorstep is an internal free entitlement, not a $0 paid subscription, and
  -- Square's documented minimum paid subscription is one major unit. So a free
  -- cadence carries no provider mapping, and a provider-mapped price may not
  -- sit below 100 minor units.
  square_plan_variation_id text check(square_plan_variation_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  created_at timestamptz not null default now(),
  unique(plan_version_id, cadence, currency),
  check((cadence = 'free') = (amount_minor = 0)),
  check(square_plan_variation_id is null or (cadence <> 'free' and amount_minor >= 100))
);
create unique index price_provider_variation on public.prices(square_plan_variation_id)
  where square_plan_variation_id is not null;

-- ------------------------------------------------------- provider identity
-- An external ID is unique per provider account and environment. It is never
-- assumed globally unique across connections, so sandbox can never collide
-- with production.
create table public.billing_customers (
  workspace_id uuid not null references public.workspaces(id),
  source text not null check(source in ('square','apple','google')),
  environment text not null check(environment in ('sandbox','production')),
  provider_customer_id text not null check(length(provider_customer_id) between 1 and 128),
  created_at timestamptz not null default now(),
  primary key(workspace_id, source, environment),
  unique(source, environment, provider_customer_id)
);

-- ------------------------------------------------ subscriptions and access
-- The table already exists from 202609230001. Widen it rather than replace it,
-- so the existing billing_read policy and the staff projections keep working.
alter table public.subscriptions
  add column source text not null default 'free' check(source in ('square','apple','google','free')),
  add column environment text check(environment in ('sandbox','production')),
  add column plan_version_id uuid references public.plan_versions(id),
  add column provider_subscription_id text check(length(provider_subscription_id) between 1 and 128),
  -- The provider's own word, kept beside our internal state rather than
  -- overwriting it. Reconciliation needs both.
  add column provider_status text check(provider_status is null or length(provider_status) between 1 and 40),
  add column current_period_start timestamptz,
  add column cancel_at timestamptz,
  add column canceled_at timestamptz,
  -- Cancelling stops renewal; access runs to the end of the paid period.
  add column entitlement_end timestamptz,
  add column updated_at timestamptz not null default now();
alter table public.subscriptions add constraint subscriptions_status_check
  check(status in ('free','pending','trial','active','grace','past_due','cancel_scheduled','ended','disputed'));
alter table public.subscriptions add constraint subscriptions_provider_identity
  check((source = 'free') = (provider_subscription_id is null));
alter table public.subscriptions add constraint subscriptions_provider_environment
  check((source = 'free') = (environment is null));
create unique index subscription_provider_id
  on public.subscriptions(source, environment, provider_subscription_id)
  where provider_subscription_id is not null;

-- What a workspace may actually do, with its own validity interval. This is the
-- table features read. An override records who authorized it and why; a
-- plan-derived entitlement must not pretend to have an authorizer.
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  line_id uuid,
  feature text not null check(feature ~ '^[a-z][a-z0-9_.]{1,60}$'),
  limit_value bigint check(limit_value >= 0),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  source text not null check(source in ('plan','trial','grant','override')),
  authorized_by uuid references auth.users(id),
  reason text check(reason is null or length(reason) between 1 and 300),
  created_at timestamptz not null default now(),
  foreign key(workspace_id, line_id) references public.lines(workspace_id, id),
  check(valid_until is null or valid_until > valid_from),
  check((source in ('grant','override')) = (authorized_by is not null and reason is not null))
);
create index entitlement_lookup on public.entitlements(workspace_id, feature, valid_until);

-- ------------------------------------------------------------------- money
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  source text not null check(source in ('square','apple','google')),
  environment text not null check(environment in ('sandbox','production')),
  provider_invoice_id text not null check(length(provider_invoice_id) between 1 and 128),
  status text not null check(status in ('draft','unpaid','partially_paid','paid','canceled','failed')),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  total_minor bigint not null check(total_minor >= 0),
  tax_minor bigint not null default 0 check(tax_minor >= 0),
  amount_paid_minor bigint not null default 0 check(amount_paid_minor >= 0),
  period_start timestamptz,
  period_end timestamptz,
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  unique(source, environment, provider_invoice_id),
  unique(workspace_id, id),
  check(amount_paid_minor <= total_minor),
  check(status <> 'paid' or paid_at is not null),
  check(period_end is null or period_start is null or period_end > period_start)
);
create index invoice_scope on public.invoices(workspace_id, created_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  invoice_id uuid,
  source text not null check(source in ('square','apple','google')),
  environment text not null check(environment in ('sandbox','production')),
  provider_payment_id text not null check(length(provider_payment_id) between 1 and 128),
  status text not null check(status in ('pending','approved','completed','canceled','failed')),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check(amount_minor > 0),
  -- Fees are recorded so finance reconciles net settlement instead of booking
  -- gross receipts as revenue.
  fee_minor bigint not null default 0 check(fee_minor >= 0),
  refunded_minor bigint not null default 0 check(refunded_minor >= 0),
  -- Brand and last four only, so a member can recognise the charge. No PAN, no
  -- CVV, and no token that could be replayed.
  card_brand text check(card_brand is null or length(card_brand) between 1 and 30),
  card_last_four text check(card_last_four is null or card_last_four ~ '^[0-9]{4}$'),
  settled_at timestamptz,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  unique(source, environment, provider_payment_id),
  unique(workspace_id, id),
  foreign key(workspace_id, invoice_id) references public.invoices(workspace_id, id),
  check(refunded_minor <= amount_minor)
);
create index payment_scope on public.payments(workspace_id, created_at desc);

-- A refund is separate from a cancellation, is never self-approved, and never
-- deletes the original payment.
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  payment_id uuid not null,
  source text not null check(source in ('square','apple','google')),
  environment text not null check(environment in ('sandbox','production')),
  provider_refund_id text check(provider_refund_id is null or length(provider_refund_id) between 1 and 128),
  status text not null default 'requested'
    check(status in ('requested','approved','pending','completed','rejected','failed')),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check(amount_minor > 0),
  reason text not null check(length(reason) between 1 and 300),
  requested_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  -- The provider call carries this key, so a retry after an ambiguous timeout
  -- cannot refund twice.
  idempotency_key text not null unique check(length(idempotency_key) between 8 and 128),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  completed_at timestamptz,
  foreign key(workspace_id, payment_id) references public.payments(workspace_id, id),
  unique(source, environment, provider_refund_id),
  check(approved_by is null or approved_by <> requested_by),
  check(status in ('requested','rejected') or approved_by is not null)
);

-- A chargeback is a risk case, not a billing row. Evidence is referenced, never
-- copied here: a call transcript is not dispute evidence by default, and any
-- redaction is a reviewed decision rather than a schema default.
create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  payment_id uuid not null,
  source text not null check(source in ('square','apple','google')),
  environment text not null check(environment in ('sandbox','production')),
  provider_dispute_id text not null check(length(provider_dispute_id) between 1 and 128),
  state text not null check(state in ('inquiry','evidence_required','under_review','won','lost','accepted')),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check(amount_minor > 0),
  due_at timestamptz,
  evidence_note text check(evidence_note is null or length(evidence_note) between 1 and 2000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique(source, environment, provider_dispute_id),
  foreign key(workspace_id, payment_id) references public.payments(workspace_id, id)
);

-- -------------------------------------------------------------- operations
-- The server's own record of a purchase attempt. The quote is the server's
-- snapshot of price, currency and terms: a client never supplies a price, and a
-- redirect or query parameter is never authority to grant paid access.
create table public.checkout_operations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  actor_id uuid not null references auth.users(id),
  idempotency_key text not null unique check(length(idempotency_key) between 8 and 128),
  request_hash text not null check(request_hash ~ '^[0-9a-f]{64}$'),
  quote jsonb not null check(jsonb_typeof(quote)='object' and octet_length(quote::text) <= 8000),
  terms_version text not null check(length(terms_version) between 1 and 40),
  quote_expires_at timestamptz not null,
  status text not null default 'created'
    check(status in ('created','awaiting_payment','requires_action','settled','failed','expired')),
  step text check(step is null or length(step) between 1 and 40),
  failure_reason text check(failure_reason is null or length(failure_reason) between 1 and 300),
  provider_subscription_id text,
  provider_invoice_id text,
  provider_payment_id text,
  attempts integer not null default 0 check(attempts >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index checkout_actor on public.checkout_operations(actor_id, created_at desc);

-- Plan changes, cancellations and refund executions share one ledger, so a
-- failure is reconciled before anything is retried against the provider.
create table public.billing_operations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  actor_id uuid references auth.users(id),
  kind text not null check(kind in ('plan_change','cancel','reactivate','refund','reconcile','dunning')),
  idempotency_key text not null unique check(length(idempotency_key) between 8 and 128),
  request jsonb not null check(jsonb_typeof(request)='object' and octet_length(request::text) <= 8000),
  status text not null default 'pending'
    check(status in ('pending','in_progress','succeeded','failed','abandoned')),
  effective_at timestamptz,
  attempts integer not null default 0 check(attempts >= 0),
  last_error text check(last_error is null or length(last_error) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index billing_operation_pending on public.billing_operations(status, created_at)
  where status in ('pending','in_progress');

-- ------------------------------------------------------------------- usage
-- Monthly windows regardless of billing cadence. An annual subscription does
-- not release twelve months of allowance on day one, and an upgrade does not
-- reset what has already been consumed in the current window.
create table public.usage_windows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  meter text not null check(meter ~ '^[a-z][a-z0-9_.]{1,40}$'),
  period_start timestamptz not null,
  period_end timestamptz not null,
  timezone text not null default 'UTC' check(length(timezone) between 1 and 60),
  included_quantity bigint not null check(included_quantity >= 0),
  consumed_quantity bigint not null default 0 check(consumed_quantity >= 0),
  reserved_quantity bigint not null default 0 check(reserved_quantity >= 0),
  -- Overage is observed and disclosed. Automatic overage billing stays off.
  overage_quantity bigint not null default 0 check(overage_quantity >= 0),
  created_at timestamptz not null default now(),
  unique(workspace_id, meter, period_start),
  check(period_end > period_start),
  check(period_end <= period_start + interval '32 days')
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  line_id uuid,
  call_id uuid,
  meter text not null check(meter ~ '^[a-z][a-z0-9_.]{1,40}$'),
  unit text not null check(unit in ('call','second','minute','message')),
  quantity bigint not null check(quantity > 0),
  -- The tariff that priced it, so a later price change cannot retroactively
  -- rewrite what a closed period cost.
  tariff_version text check(tariff_version is null or length(tariff_version) between 1 and 40),
  -- Provider cost is observed separately from customer billable usage. One is
  -- our cost of goods; the other is what a member agreed to pay.
  provider_cost_minor bigint check(provider_cost_minor >= 0),
  currency text check(currency ~ '^[A-Z]{3}$'),
  -- A replayed provider notification must not double-count usage.
  dedup_key text not null unique check(length(dedup_key) between 8 and 200),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key(workspace_id, line_id) references public.lines(workspace_id, id),
  foreign key(workspace_id, line_id, call_id) references public.calls(workspace_id, line_id, id),
  check((provider_cost_minor is null) = (currency is null)),
  check(call_id is null or line_id is not null)
);
create index usage_event_window on public.usage_events(workspace_id, meter, occurred_at);

-- Allowance held for an in-flight call. It expires rather than leaking if the
-- worker dies mid-call, so a crash cannot silently consume a member's month.
create table public.usage_reservations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  window_id uuid not null references public.usage_windows(id),
  quantity bigint not null check(quantity > 0),
  state text not null default 'held' check(state in ('held','committed','released','expired')),
  expires_at timestamptz not null,
  dedup_key text not null unique check(length(dedup_key) between 8 and 200),
  created_at timestamptz not null default now()
);
create index usage_reservation_expiry on public.usage_reservations(state, expires_at) where state = 'held';

-- --------------------------------------------------------- worker plumbing
-- The signature is verified against the raw request body and the exact
-- configured notification URL before anything here is parsed into a business
-- action. A URL reconstructed from client-forwarded headers is not trusted.
create table public.webhook_inbox (
  id uuid primary key default gen_random_uuid(),
  provider text not null check(provider in ('square','twilio','resend')),
  environment text not null check(environment in ('sandbox','production')),
  external_event_id text not null check(length(external_event_id) between 1 and 200),
  event_type text not null check(length(event_type) between 1 and 100),
  merchant_reference text check(merchant_reference is null or length(merchant_reference) between 1 and 128),
  workspace_id uuid references public.workspaces(id),
  signature_verified boolean not null default false,
  payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text) <= 64000),
  received_at timestamptz not null default now(),
  provider_created_at timestamptz,
  state text not null default 'received'
    check(state in ('received','processing','processed','ignored','dead_letter')),
  -- A lease rather than a boolean: a crashed worker's claim expires instead of
  -- stranding the event forever.
  lease_owner text check(lease_owner is null or length(lease_owner) between 1 and 80),
  lease_expires_at timestamptz,
  attempts integer not null default 0 check(attempts >= 0),
  next_attempt_at timestamptz,
  dead_letter_reason text check(dead_letter_reason is null or length(dead_letter_reason) between 1 and 500),
  processed_at timestamptz,
  unique(provider, environment, external_event_id),
  check((state = 'dead_letter') = (dead_letter_reason is not null)),
  check(lease_owner is null or lease_expires_at is not null)
);
create index webhook_ready on public.webhook_inbox(state, next_attempt_at) where state in ('received','processing');

-- One row per logical run key, so two worker replicas cannot run the same
-- scheduled reconciliation twice.
create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null check(job ~ '^[a-z][a-z0-9_.-]{1,60}$'),
  run_key text not null check(length(run_key) between 1 and 120),
  state text not null default 'claimed' check(state in ('claimed','succeeded','failed','abandoned')),
  lease_owner text not null check(length(lease_owner) between 1 and 80),
  lease_expires_at timestamptz not null,
  attempts integer not null default 1 check(attempts >= 1),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text check(error is null or length(error) between 1 and 500),
  metrics jsonb check(metrics is null or (jsonb_typeof(metrics) = 'object' and octet_length(metrics::text) <= 4000)),
  unique(job, run_key)
);

-- ----------------------------------------------------------------- helpers
-- Money is visible to the workspace roles that own the relationship with it.
-- An ordinary member is not one of them.
create function private.billing_access(w uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.memberships where workspace_id=w and user_id=auth.uid()
                and status='active' and role in ('owner','admin','billing'));
$$;

create function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger subscription_touch before update on public.subscriptions
  for each row execute function private.touch_updated_at();
create trigger checkout_touch before update on public.checkout_operations
  for each row execute function private.touch_updated_at();
create trigger billing_operation_touch before update on public.billing_operations
  for each row execute function private.touch_updated_at();

revoke all on all functions in schema private from public;
grant execute on function private.billing_access(uuid) to authenticated;

-- ----------------------------------------------------- row level security
alter table public.billing_products enable row level security;
alter table public.plan_versions enable row level security;
alter table public.prices enable row level security;
alter table public.billing_customers enable row level security;
alter table public.entitlements enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.disputes enable row level security;
alter table public.checkout_operations enable row level security;
alter table public.billing_operations enable row level security;
alter table public.usage_windows enable row level security;
alter table public.usage_events enable row level security;
alter table public.usage_reservations enable row level security;
alter table public.webhook_inbox enable row level security;
alter table public.job_runs enable row level security;

revoke all on public.billing_products, public.plan_versions, public.prices, public.billing_customers,
  public.entitlements, public.invoices, public.payments, public.refunds, public.disputes,
  public.checkout_operations, public.billing_operations, public.usage_windows, public.usage_events,
  public.usage_reservations, public.webhook_inbox, public.job_runs from anon, authenticated;

-- The public catalog is exactly what has been published, and this migration
-- publishes nothing. An unapproved price must not become a public claim merely
-- by existing in the table, so availability gates the read rather than the
-- table happening to be empty.
grant select on public.billing_products, public.plan_versions, public.prices to anon, authenticated;
create policy plan_version_public_read on public.plan_versions for select to anon, authenticated
  using(availability = 'available');
create policy price_public_read on public.prices for select to anon, authenticated
  using(availability = 'available'
        and exists(select 1 from public.plan_versions v
                   where v.id = prices.plan_version_id and v.availability = 'available'));
create policy product_public_read on public.billing_products for select to anon, authenticated
  using(exists(select 1 from public.plan_versions v join public.prices p on p.plan_version_id = v.id
               where v.product_id = billing_products.id
                 and v.availability = 'available' and p.availability = 'available'));

-- Every member needs to know what the workspace may do. Only the billing roles
-- see what it costs.
grant select on public.entitlements to authenticated;
create policy entitlement_read on public.entitlements for select to authenticated
  using(private.member_of(workspace_id));

grant select on public.invoices, public.payments, public.refunds, public.usage_windows to authenticated;
create policy invoice_read on public.invoices for select to authenticated using(private.billing_access(workspace_id));
create policy payment_read on public.payments for select to authenticated using(private.billing_access(workspace_id));
create policy refund_read on public.refunds for select to authenticated using(private.billing_access(workspace_id));
-- Aggregate usage only. Per-call meter rows stay closed, because a billing-only
-- member must not learn a line's call history from its usage.
create policy usage_window_read on public.usage_windows for select to authenticated
  using(private.billing_access(workspace_id));

-- The buyer polls their own checkout result from the server rather than
-- trusting the redirect that brought them back.
grant select on public.checkout_operations to authenticated;
create policy checkout_read on public.checkout_operations for select to authenticated
  using(actor_id = auth.uid() and private.member_of(workspace_id));

-- billing_customers, disputes, billing_operations, usage_events,
-- usage_reservations, webhook_inbox and job_runs carry no policy and no grant on
-- purpose. They hold provider identity, risk cases, per-call meter rows and
-- worker leases. They are reached by the worker's service role and, for staff,
-- only through the audited projections below.

-- ------------------------------------------------------ staff projections
-- Same rule as every other staff read: a definer projection, never a widened
-- table policy, so the read is column-limited and can write an audit row.
create function public.staff_billing_overview() returns jsonb
language sql stable security definer set search_path='' as $$
  select case when private.staff_capability('billing_read') then jsonb_build_object(
    'subscriptions', (select jsonb_object_agg(status, n)
                      from (select status, count(*) as n from public.subscriptions group by status) s),
    -- Monthly recurring value, with annual divided by twelve. Cash receipts are
    -- not MRR, and this is a management metric rather than revenue recognition.
    'mrr_minor', (select coalesce(sum(case p.cadence when 'annual' then p.amount_minor / 12 else p.amount_minor end), 0)
                  from public.subscriptions sub
                  join public.prices p on p.plan_version_id = sub.plan_version_id
                  where sub.status in ('active','grace')),
    'invoices_unpaid', (select count(*) from public.invoices where status in ('unpaid','partially_paid')),
    'payments_30d_minor', (select coalesce(sum(amount_minor), 0) from public.payments
                           where status = 'completed' and settled_at > now() - interval '30 days'),
    'fees_30d_minor', (select coalesce(sum(fee_minor), 0) from public.payments
                       where status = 'completed' and settled_at > now() - interval '30 days'),
    'refunds_pending', (select count(*) from public.refunds where status in ('requested','approved','pending')),
    'disputes_open', (select count(*) from public.disputes where resolved_at is null),
    'webhooks_dead_letter', (select count(*) from public.webhook_inbox where state = 'dead_letter'),
    'as_of', now()
  ) else null end;
$$;

create function public.staff_workspace_billing(w uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.staff_capability('billing_read') then raise exception 'Not permitted'; end if;
  select jsonb_build_object(
    -- Deliberately no provider_subscription_id and no environment: finance
    -- reconciles from our own records, and growth or analyst roles have no
    -- reason to hold a provider handle at all.
    'subscription', (select jsonb_build_object('plan', s.plan, 'status', s.status, 'source', s.source,
        'provider_status', s.provider_status, 'current_period_end', s.current_period_end,
        'cancel_at', s.cancel_at, 'entitlement_end', s.entitlement_end)
      from public.subscriptions s where s.workspace_id = w),
    'invoices', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'status', i.status,
        'currency', i.currency, 'total_minor', i.total_minor, 'amount_paid_minor', i.amount_paid_minor,
        'issued_at', i.issued_at, 'paid_at', i.paid_at) order by i.created_at desc), '[]'::jsonb)
      from public.invoices i where i.workspace_id = w),
    'payments', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'status', p.status,
        'currency', p.currency, 'amount_minor', p.amount_minor, 'refunded_minor', p.refunded_minor,
        'card_brand', p.card_brand, 'card_last_four', p.card_last_four, 'settled_at', p.settled_at)
        order by p.created_at desc), '[]'::jsonb)
      from public.payments p where p.workspace_id = w),
    'refunds', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'status', r.status,
        'currency', r.currency, 'amount_minor', r.amount_minor, 'reason', r.reason,
        'requested_by', r.requested_by, 'approved_by', r.approved_by) order by r.created_at desc), '[]'::jsonb)
      from public.refunds r where r.workspace_id = w),
    'usage', (select coalesce(jsonb_agg(jsonb_build_object('meter', u.meter, 'period_start', u.period_start,
        'period_end', u.period_end, 'included', u.included_quantity, 'consumed', u.consumed_quantity,
        'overage', u.overage_quantity) order by u.period_start desc), '[]'::jsonb)
      from public.usage_windows u where u.workspace_id = w),
    'entitlements', (select coalesce(jsonb_agg(jsonb_build_object('feature', e.feature, 'limit', e.limit_value,
        'valid_until', e.valid_until, 'source', e.source) order by e.feature), '[]'::jsonb)
      from public.entitlements e where e.workspace_id = w and (e.valid_until is null or e.valid_until > now()))
  ) into result;
  perform private.staff_audit('staff.billing_viewed', w);
  return result;
end; $$;

-- Requesting a refund and approving one are different capabilities held by
-- different people. The requester can never approve their own request, and the
-- provider call belongs to the worker, not to this function.
create function public.request_refund(w uuid, payment uuid, amount bigint, refund_reason text, key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare created uuid; pay public.payments; outstanding bigint;
begin
  if not private.staff_capability('billing_write') then raise exception 'Not permitted'; end if;
  if amount is null or amount <= 0 then raise exception 'Invalid refund amount'; end if;
  if refund_reason is null or length(trim(refund_reason)) not between 1 and 300
    then raise exception 'Refund reason required'; end if;
  if key is null or length(key) not between 8 and 128 then raise exception 'Idempotency key required'; end if;
  select * into pay from public.payments where workspace_id = w and id = payment;
  if pay.id is null then raise exception 'Unknown payment'; end if;
  if pay.status <> 'completed' then raise exception 'Only a settled payment can be refunded'; end if;
  -- Bounded by the unrefunded balance, and serialized per payment so two
  -- concurrent partial refunds cannot together exceed what was charged.
  perform pg_advisory_xact_lock(hashtextextended(payment::text, 7));
  select pay.amount_minor - pay.refunded_minor
    - coalesce(sum(amount_minor), 0) into outstanding
  from public.refunds where payment_id = payment and status in ('requested','approved','pending','completed');
  if amount > outstanding then raise exception 'Refund exceeds unrefunded balance'; end if;
  insert into public.refunds(workspace_id, payment_id, source, environment, currency, amount_minor,
                             reason, requested_by, idempotency_key)
  values(w, payment, pay.source, pay.environment, pay.currency, amount, trim(refund_reason), auth.uid(), key)
  returning id into created;
  perform private.staff_audit('billing.refund_requested', created);
  return created;
end; $$;

create function public.approve_refund(refund uuid) returns void language plpgsql security definer set search_path='' as $$
declare row_refund public.refunds;
begin
  if not private.staff_capability('refund_approve') then raise exception 'Not permitted'; end if;
  select * into row_refund from public.refunds where id = refund;
  if row_refund.id is null then raise exception 'Unknown refund'; end if;
  if row_refund.status <> 'requested' then raise exception 'Refund is not awaiting approval'; end if;
  if row_refund.requested_by = auth.uid() then raise exception 'Staff cannot approve their own refund request'; end if;
  update public.refunds set status = 'approved', approved_by = auth.uid(), decided_at = now() where id = refund;
  -- The worker picks the approved refund up and calls the provider with the
  -- stored idempotency key. Nothing here talks to Square.
  insert into public.billing_operations(workspace_id, actor_id, kind, idempotency_key, request)
  values(row_refund.workspace_id, auth.uid(), 'refund', row_refund.idempotency_key,
         jsonb_build_object('refund_id', refund));
  perform private.staff_audit('billing.refund_approved', refund);
end; $$;

-- The customer projection already existed; narrow its subscription field.
-- `to_jsonb(s)` would now hand every provider identifier to any role holding
-- customer_read, which includes growth and analyst.
create or replace function public.staff_customer_overview(w uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.staff_capability('customer_read') then raise exception 'Not permitted'; end if;
  select jsonb_build_object(
    'workspace', (select jsonb_build_object('id', x.id, 'name', x.name, 'type', x.type, 'created_at', x.created_at)
                  from public.workspaces x where x.id = w),
    'people', (select coalesce(jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', u.email, 'role', m.role, 'status', m.status)
                 order by m.role), '[]'::jsonb)
               from public.memberships m join auth.users u on u.id = m.user_id where m.workspace_id = w),
    'lines', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'status', l.status, 'owner_id', l.owner_id)
                order by l.created_at), '[]'::jsonb)
              from public.lines l where l.workspace_id = w),
    -- Presence only. The draft body carries the member's own phone number.
    'setup_drafts', (select count(*) from public.line_setup_drafts d where d.workspace_id = w),
    'subscription', (select jsonb_build_object('plan', s.plan, 'status', s.status, 'source', s.source,
                       'current_period_end', s.current_period_end, 'entitlement_end', s.entitlement_end)
                     from public.subscriptions s where s.workspace_id = w),
    'call_counts', (select jsonb_build_object(
        'total', count(*), 'last_30d', count(*) filter (where started_at > now() - interval '30 days'),
        'last_call_at', max(started_at)) from public.calls c where c.workspace_id = w),
    'tickets', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'subject', r.body->>'subject', 'created_at', r.created_at)
                  order by r.created_at desc), '[]'::jsonb)
                from public.workspace_records r where r.workspace_id = w and r.kind = 'ticket'),
    'recent_activity', (select coalesce(jsonb_agg(jsonb_build_object('action', a.action, 'created_at', a.created_at)
                          order by a.created_at desc), '[]'::jsonb)
                        from (select action, created_at from public.audit_events where workspace_id = w
                              order by created_at desc limit 20) a)
  ) into result;
  perform private.staff_audit('staff.customer_viewed', w);
  return result;
end; $$;

revoke all on function public.staff_billing_overview(), public.staff_workspace_billing(uuid),
  public.request_refund(uuid, uuid, bigint, text, text), public.approve_refund(uuid) from public;
grant execute on function public.staff_billing_overview(), public.staff_workspace_billing(uuid),
  public.request_refund(uuid, uuid, bigint, text, text), public.approve_refund(uuid) to authenticated;

commit;

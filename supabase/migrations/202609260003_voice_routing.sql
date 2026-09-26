begin;

-- What the voice gateway needs to answer a call: which number was dialled, which
-- line owns it, where to send the caller, and how to screen first.
--
-- The gateway reads these with the service role. Members read their own through
-- row level security; nobody writes a provider identifier from a browser.

-- A number Redial controls at a provider. Distinct from the member's own mobile,
-- which is an endpoint below. Never conflate the two: a forwarded number has not
-- been ported, and a Redial-administered number is not a carrier subscription.
create table public.phone_numbers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  line_id uuid not null,
  e164 text not null check(e164 ~ '^\+[1-9][0-9]{7,14}$'),
  provider text not null check(provider in ('twilio')),
  environment text not null check(environment in ('test','live')),
  -- The provider's own identifier, scoped by provider and environment because an
  -- external ID is never assumed unique across accounts.
  provider_sid text check(provider_sid ~ '^PN[0-9a-fA-F]{32}$'),
  -- How Redial came to control it. A ported number is not in scope and is
  -- deliberately absent from this list rather than silently accepted.
  ownership text not null check(ownership in ('redial_allocated','customer_provider')),
  status text not null default 'pending' check(status in ('pending','active','released')),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  unique(workspace_id, id),
  foreign key(workspace_id, line_id) references public.lines(workspace_id, id),
  check((status = 'released') = (released_at is not null))
);
-- One active claim on a number at a time, across every tenant. Two lines
-- answering the same DID would route by luck.
create unique index phone_number_active on public.phone_numbers(provider, environment, e164) where status <> 'released';
create unique index phone_number_provider_sid on public.phone_numbers(provider, environment, provider_sid) where provider_sid is not null;

-- Where a screened call can be sent. A destination is not usable until it has
-- been verified: ringing an unverified number on a caller's behalf is how a
-- screening service becomes a dialer for someone else's traffic.
create table public.endpoints (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  line_id uuid not null,
  kind text not null check(kind in ('pstn','app','sip')),
  e164 text check(e164 ~ '^\+[1-9][0-9]{7,14}$'),
  label text not null check(length(label) between 1 and 60),
  -- The member's own handset, which is also the number the carrier forwards
  -- from. Recorded so loop prevention can refuse to send a call back into the
  -- forwarding path it just came out of.
  is_forwarding_source boolean not null default false,
  ring_order integer not null default 1 check(ring_order between 1 and 10),
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(workspace_id, id),
  foreign key(workspace_id, line_id) references public.lines(workspace_id, id),
  check((kind = 'pstn') = (e164 is not null))
);
create index endpoint_line on public.endpoints(line_id, ring_order) where revoked_at is null;

-- How a line answers. One row per line: the gateway reads exactly one of these
-- per call and must never have to guess between two.
create table public.line_routing (
  line_id uuid primary key,
  workspace_id uuid not null,
  -- simple: Redial asks who is calling and why, then offers the call on.
  -- ai: the caller is connected to the configured assistant.
  -- voicemail: no screening, take a message.
  mode text not null default 'simple' check(mode in ('simple','ai','voicemail')),
  greeting text not null default '' check(length(greeting) <= 400),
  -- Bounded by default. An unbounded screening conversation is an unbounded
  -- provider bill and a caller held hostage.
  max_screen_seconds integer not null default 120 check(max_screen_seconds between 10 and 300),
  ring_seconds integer not null default 20 check(ring_seconds between 5 and 60),
  voicemail_enabled boolean not null default true,
  -- Off by default and separately consented. Enabling it is a legal decision in
  -- two-party-consent states, not a preference.
  recording_enabled boolean not null default false,
  -- Present only when mode = 'ai'. Held on the line rather than in gateway
  -- configuration so two lines can use different assistants.
  ai_sip_uri text check(ai_sip_uri is null or ai_sip_uri ~ '^sips?:[A-Za-z0-9._%+@-]+(;[A-Za-z0-9=._-]+)*$'),
  updated_at timestamptz not null default now(),
  foreign key(workspace_id, line_id) references public.lines(workspace_id, id),
  check(mode <> 'ai' or ai_sip_uri is not null)
);

-- Loop prevention, in the database as well as the gateway. A destination equal
-- to the number the carrier forwards from sends the call straight back out, and
-- the caller hears it ring forever while both legs bill.
create function private.endpoint_is_not_a_loop() returns trigger language plpgsql set search_path='' as $$
begin
  if new.kind = 'pstn' and not new.is_forwarding_source and exists(
    select 1 from public.endpoints e
    where e.line_id = new.line_id and e.is_forwarding_source and e.revoked_at is null and e.e164 = new.e164)
  then raise exception 'Destination is the forwarding source'; end if;
  if new.kind = 'pstn' and exists(
    select 1 from public.phone_numbers p
    where p.line_id = new.line_id and p.status <> 'released' and p.e164 = new.e164)
  then raise exception 'Destination is the Redial number for this line'; end if;
  return new;
end; $$;
create trigger endpoint_loop_guard before insert or update on public.endpoints
  for each row execute function private.endpoint_is_not_a_loop();

create trigger line_routing_touch before update on public.line_routing
  for each row execute function private.touch_updated_at();

-- A screened call needs somewhere to record what the caller said before the
-- member ever picks up. calls/transcript_segments already exist; this is the
-- gateway's own working state for a call in flight.
create table public.call_screenings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  line_id uuid not null,
  provider_call_sid text not null check(provider_call_sid ~ '^CA[0-9a-fA-F]{32}$'),
  from_e164 text not null check(from_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  to_e164 text not null check(to_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  mode text not null check(mode in ('simple','ai','voicemail')),
  caller_said text check(caller_said is null or length(caller_said) <= 2000),
  -- Twilio's own confidence in the speech result. Recorded because a low score
  -- is a reason to offer the call rather than act on what was heard.
  speech_confidence numeric check(speech_confidence is null or (speech_confidence >= 0 and speech_confidence <= 1)),
  outcome text not null default 'screening'
    check(outcome in ('screening','offered','connected','declined','no_answer','message','blocked','failed')),
  -- Bounded transfer count per call, so a misconfigured route cannot ring
  -- endpoints indefinitely.
  transfer_attempts integer not null default 0 check(transfer_attempts between 0 and 5),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  unique(provider_call_sid),
  foreign key(workspace_id, line_id) references public.lines(workspace_id, id)
);
create index screening_scope on public.call_screenings(workspace_id, started_at desc);

alter table public.phone_numbers enable row level security;
alter table public.endpoints enable row level security;
alter table public.line_routing enable row level security;
alter table public.call_screenings enable row level security;
revoke all on public.phone_numbers, public.endpoints, public.line_routing, public.call_screenings
  from anon, authenticated;

-- Members read their own routing through the same line grant that governs the
-- rules. Writes go through the gateway's service role or a reviewed RPC, never
-- straight from a browser: a destination is a dialing instruction.
grant select on public.phone_numbers, public.endpoints, public.line_routing, public.call_screenings to authenticated;
create policy phone_number_read on public.phone_numbers for select to authenticated
  using(private.line_access(workspace_id, line_id, 'manage_rules'));
create policy endpoint_read on public.endpoints for select to authenticated
  using(private.line_access(workspace_id, line_id, 'manage_rules'));
create policy line_routing_read on public.line_routing for select to authenticated
  using(private.line_access(workspace_id, line_id, 'manage_rules'));
-- A screening summary is call metadata, so it follows read_summary rather than
-- the rules grant.
create policy screening_read on public.call_screenings for select to authenticated
  using(private.line_access(workspace_id, line_id, 'read_summary'));

commit;

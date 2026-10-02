begin;

-- Call logs, recordings and transcription.
--
-- The dashboard already had a call inbox and a transcript panel, both correctly
-- gated, and nothing ever wrote a row: the gateway records `call_screenings`
-- while the member-facing log is `calls`. This migration makes `calls` the
-- projection target, gives recordings and transcription a consent model, and
-- puts a retention deadline on both.
--
-- The ordering matters. `twiml.mjs` already emits record="record-from-answer-dual"
-- whenever a line sets recording_enabled, so a single UPDATE would have started
-- two-party capture at the provider with nothing on this side holding a
-- reference, a consent record or a deletion deadline. The trigger near the
-- bottom of this file is what makes that impossible rather than merely
-- discouraged.

-- ---------------------------------------------------------------------------
-- Consent
-- ---------------------------------------------------------------------------
-- Recording and transcription are separate decisions. A member may accept a
-- written record of a call and refuse its audio, and the law treats the two
-- differently, so one consent never implies the other.
create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  line_id uuid not null,
  purpose text not null check(purpose in ('call_recording','call_transcription')),
  -- How the disclosure reached the other party. An IVR announcement is what
  -- makes a two-party-consent state workable; a written notice alone is not a
  -- substitute and is recorded distinctly so an audit can tell them apart.
  channel text not null check(channel in ('ivr_announcement','written_notice')),
  -- The exact wording presented, so a later change to the announcement stays
  -- distinguishable from the version this consent actually covers.
  disclosure_version text not null check(length(disclosure_version) between 1 and 40),
  granted boolean not null,
  -- Who decided, and the context it was collected in. Kept because consent
  -- without provenance is an assertion, not evidence.
  actor_id uuid not null,
  collection_context text not null check(length(collection_context) between 1 and 200),
  evidence_reference text check(evidence_reference is null or length(evidence_reference) <= 200),
  created_at timestamptz not null default now(),
  foreign key(workspace_id, line_id) references public.lines(workspace_id, id),
  foreign key(workspace_id, actor_id) references public.memberships(workspace_id, user_id)
);
-- Current state is the newest row per line and purpose, so this index serves
-- both the lookup and the history.
create index consent_scope on public.consent_events(workspace_id, line_id, purpose, created_at desc, id desc);

-- Append-only. A consent record that can be edited after the fact is not
-- evidence of anything, so a withdrawal is a new row rather than an update.
create function private.consent_active(w uuid, l uuid, p text) returns boolean
  language sql stable security definer set search_path='' as $$
  select coalesce((select granted from public.consent_events
    where workspace_id = w and line_id = l and purpose = p
    order by created_at desc, id desc limit 1), false);
$$;

-- ---------------------------------------------------------------------------
-- Transcription switch, alongside the recording switch that already existed
-- ---------------------------------------------------------------------------
alter table public.line_routing
  add column transcription_enabled boolean not null default false;

comment on column public.line_routing.transcription_enabled is
  'Off by default and separately consented. A written record of a call is its own disclosure, not a lesser form of recording.';

-- ---------------------------------------------------------------------------
-- Recordings
-- ---------------------------------------------------------------------------
-- Twilio holds the audio. Redial stores the reference, the consent it was
-- captured under, and when it must be gone. Deliberately not a second copy:
-- every copy is another thing a deletion run has to reach, and the kit prefers
-- identifiers and access logs over fanning sensitive media across services.
create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  line_id uuid not null,
  call_id uuid not null,
  provider text not null default 'twilio' check(provider in ('twilio')),
  provider_recording_sid text not null check(provider_recording_sid ~ '^RE[0-9a-fA-F]{32}$'),
  duration_seconds integer not null default 0 check(duration_seconds between 0 and 86400),
  channels smallint not null default 2 check(channels in (1,2)),
  -- Not nullable. A recording with no consent row is exactly the state this
  -- migration exists to prevent, so the database refuses to represent it.
  consent_event_id uuid not null,
  -- Fixed when the row is written, from the retention default rather than from
  -- whatever the policy says at read time: shortening the default later must not
  -- silently extend an existing recording's life, and lengthening it must not
  -- resurrect one the member was told would be gone.
  retention_deadline timestamptz not null,
  deletion_state text not null default 'retained'
    check(deletion_state in ('retained','deleting','deleted','failed')),
  deleted_at timestamptz,
  -- Kept so a failed provider-side deletion is visible instead of looking like
  -- a success. An unreachable recording is still an open obligation.
  deletion_failure text check(deletion_failure is null or length(deletion_failure) <= 300),
  created_at timestamptz not null default now(),
  unique(workspace_id, provider, provider_recording_sid),
  foreign key(workspace_id, line_id, call_id) references public.calls(workspace_id, line_id, id),
  foreign key(consent_event_id) references public.consent_events(id),
  -- deleted_at is set exactly when the state says the audio is gone.
  check((deletion_state = 'deleted') = (deleted_at is not null))
);
create index recording_scope on public.recordings(workspace_id, line_id, created_at desc);
-- Drives the purge sweep.
create index recording_due on public.recordings(retention_deadline)
  where deletion_state in ('retained','deleting','failed');

-- Downloading audio is the moment the sensitive thing actually moves, so it is
-- logged separately from the workspace activity feed and is never writable by
-- the member it describes.
create table public.recording_access_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null,
  recording_id uuid not null references public.recordings(id) on delete cascade,
  actor_id uuid not null,
  -- The scope the request was authorized under, retained so a later audit can
  -- tell what was checked rather than inferring it.
  capability text not null,
  outcome text not null check(outcome in ('served','refused','expired')),
  created_at timestamptz not null default now()
);
create index recording_access_scope
  on public.recording_access_events(workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Link the member-facing call log to the provider's record of the same call
-- ---------------------------------------------------------------------------
alter table public.calls
  add column provider_call_sid text
    check(provider_call_sid is null or provider_call_sid ~ '^CA[0-9a-fA-F]{32}$'),
  add column ended_at timestamptz,
  -- Why the call reached Redial at all. Null for rows that predate the gateway.
  add column ingress text check(ingress is null or ingress in ('pstn','sip','app')),
  -- The summary is a speech-to-text result, not a verified statement. Carrying
  -- the provider's confidence means the dashboard can say the line was heard
  -- poorly rather than presenting a bad transcription as what the caller said.
  add column summary_confidence numeric
    check(summary_confidence is null or (summary_confidence >= 0 and summary_confidence <= 1));

-- Scoped by workspace rather than globally unique: an external id is unique
-- within the provider account that issued it, and two workspaces may one day
-- connect different accounts.
create unique index calls_provider_sid on public.calls(workspace_id, provider_call_sid)
  where provider_call_sid is not null;

-- The projection marker lives on the screening rather than being derived from a
-- missing join, so a replay is cheap to find and impossible to double-apply.
alter table public.call_screenings
  add column projected_at timestamptz;
create index screening_unprojected on public.call_screenings(ended_at)
  where projected_at is null;

-- Which consent a retained transcript was captured under. Nullable because rows
-- predating this migration have no such record, and inventing one would be
-- worse than admitting it is unknown.
alter table public.transcript_segments
  add column consent_event_id uuid references public.consent_events(id);

-- ---------------------------------------------------------------------------
-- Audio needs its own grant
-- ---------------------------------------------------------------------------
-- read_transcript must never imply it. A written record and a voice recording
-- are different disclosures, and someone cleared for one is not thereby cleared
-- for the other. The constraint is found by definition rather than by assumed
-- name so this does not depend on how Postgres happened to name it.
do $$
declare constraint_name text;
begin
  select conname into strict constraint_name from pg_constraint
    where conrelid = 'public.line_access_grants'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%capability%';
  execute format('alter table public.line_access_grants drop constraint %I', constraint_name);
end $$;
alter table public.line_access_grants add constraint line_access_grants_capability_check
  check(capability in ('read_summary','read_transcript','read_recording','manage_rules',
    'monitor_live','takeover_live','direct_agent','transfer_call'));

-- ---------------------------------------------------------------------------
-- The guard
-- ---------------------------------------------------------------------------
-- Triggers apply to the backend role too: service_role carries bypassrls, which
-- skips policies, not triggers. So this holds for the gateway and the worker as
-- well as for a member, which is the point — the flag is reachable from more
-- than one unit.
create function public.guard_capture_consent() returns trigger
  language plpgsql security definer set search_path='' as $$
begin
  if new.recording_enabled
    and not private.consent_active(new.workspace_id, new.line_id, 'call_recording') then
    raise exception 'Recording requires a current call_recording consent record for this line'
      using errcode = 'check_violation';
  end if;
  if new.transcription_enabled
    and not private.consent_active(new.workspace_id, new.line_id, 'call_transcription') then
    raise exception 'Transcription requires a current call_transcription consent record for this line'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger line_routing_capture_consent before insert or update on public.line_routing
  for each row execute function public.guard_capture_consent();

-- Withdrawing consent has to stop the capture, not merely record a preference.
-- Doing it here rather than in the application means it holds whichever unit
-- writes the withdrawal.
create function public.apply_consent_withdrawal() returns trigger
  language plpgsql security definer set search_path='' as $$
begin
  if not new.granted then
    if new.purpose = 'call_recording' then
      update public.line_routing set recording_enabled = false, updated_at = now()
        where workspace_id = new.workspace_id and line_id = new.line_id and recording_enabled;
    else
      update public.line_routing set transcription_enabled = false, updated_at = now()
        where workspace_id = new.workspace_id and line_id = new.line_id and transcription_enabled;
    end if;
  end if;
  return new;
end $$;
create trigger consent_withdrawal after insert on public.consent_events
  for each row execute function public.apply_consent_withdrawal();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.consent_events enable row level security;
alter table public.recordings enable row level security;
alter table public.recording_access_events enable row level security;
revoke all on public.consent_events, public.recordings, public.recording_access_events
  from anon, authenticated;
grant select on public.consent_events, public.recordings, public.recording_access_events
  to authenticated;

-- Whether a line is recorded is a rules question, so consent history follows
-- manage_rules. It deliberately does not follow read_summary: knowing a call
-- happened is not knowing whether it was recorded.
create policy consent_read on public.consent_events for select to authenticated
  using(private.line_access(workspace_id, line_id, 'manage_rules'));

-- Expiry is enforced here as well as by the purge, so a recording past its
-- deadline is unreadable whether or not the sweep has run yet. The same reason
-- transcript_segments checks expires_at in its own policy.
create policy recording_read on public.recordings for select to authenticated
  using(private.line_access(workspace_id, line_id, 'read_recording')
    and deletion_state = 'retained' and retention_deadline > now());

-- A member sees who opened their line's audio. Writes come from the server
-- path that served the download; nothing here is insertable from a browser.
create policy recording_access_read on public.recording_access_events for select to authenticated
  using(exists(select 1 from public.recordings r
    where r.id = recording_access_events.recording_id
      and private.line_access(r.workspace_id, r.line_id, 'read_recording')));

-- ---------------------------------------------------------------------------
-- Recording consent, written by the line owner
-- ---------------------------------------------------------------------------
-- Only the line owner, never a workspace administrator or the billing owner:
-- enabling recording is a legal decision about that line's calls, and the
-- access matrix gives neither of those roles call content by default.
create function public.record_capture_consent(
  w uuid, l uuid, p text, granted boolean, disclosure text, context text
) returns uuid language plpgsql security definer set search_path='' as $$
declare created uuid;
begin
  if p not in ('call_recording','call_transcription') then
    raise exception 'Unknown consent purpose';
  end if;
  if not private.line_owner(w, l) then
    raise exception 'Only the line owner can record capture consent';
  end if;
  insert into public.consent_events(workspace_id, line_id, purpose, channel,
    disclosure_version, granted, actor_id, collection_context)
    values(w, l, p, 'ivr_announcement', disclosure, granted, auth.uid(), context)
    returning id into created;
  insert into public.audit_events(workspace_id, actor_id, action, resource_id)
    values(w, auth.uid(), case when granted then 'line.capture_consent_granted'
      else 'line.capture_consent_withdrawn' end, l);
  return created;
end $$;

-- Enabling capture is separate from consenting to it, so that turning it on is
-- a deliberate second act rather than a side effect of recording the consent.
create function public.set_capture_enabled(w uuid, l uuid, p text, enabled boolean)
  returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.line_owner(w, l) then
    raise exception 'Only the line owner can change capture settings';
  end if;
  -- The guard trigger still runs on this update; it is the authority, and this
  -- check only produces a clearer message than a constraint violation.
  if enabled and not private.consent_active(w, l, p) then
    raise exception 'Record consent for this line before enabling capture';
  end if;
  if p = 'call_recording' then
    update public.line_routing set recording_enabled = enabled, updated_at = now()
      where workspace_id = w and line_id = l;
  elsif p = 'call_transcription' then
    update public.line_routing set transcription_enabled = enabled, updated_at = now()
      where workspace_id = w and line_id = l;
  else
    raise exception 'Unknown consent purpose';
  end if;
  insert into public.audit_events(workspace_id, actor_id, action, resource_id)
    values(w, auth.uid(), 'line.capture_' || (case when enabled then 'enabled' else 'disabled' end), l);
end $$;

revoke all on function public.record_capture_consent(uuid,uuid,text,boolean,text,text),
  public.set_capture_enabled(uuid,uuid,text,boolean) from public;
grant execute on function public.record_capture_consent(uuid,uuid,text,boolean,text,text),
  public.set_capture_enabled(uuid,uuid,text,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Serving the audio
-- ---------------------------------------------------------------------------
-- Twilio holds the media and its API needs account credentials, which belong to
-- the voice gateway and not to a browser-facing container. So a download is
-- served by the gateway, and this is the predicate it asks before streaming a
-- byte. It deliberately repeats the recording_read policy rather than trusting
-- the caller: the kit requires an export to re-check authorization at download,
-- because a grant revoked after the page rendered must still stop the transfer.
--
-- It takes a user id, so it must never be reachable by a member; that would be
-- an oracle for other people's access. service_role only.
create function public.may_read_recording(u uuid, r uuid) returns boolean
  language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.recordings rec
    join public.lines ln
      on ln.workspace_id = rec.workspace_id and ln.id = rec.line_id
    join public.memberships m
      on m.workspace_id = rec.workspace_id and m.user_id = u and m.status = 'active'
    where rec.id = r
      and rec.deletion_state = 'retained'
      and rec.retention_deadline > now()
      and (ln.owner_id = u or exists(
        select 1 from public.line_access_grants g
        where g.workspace_id = rec.workspace_id and g.line_id = rec.line_id
          and g.user_id = u and g.capability = 'read_recording'))
  );
$$;

-- Written by the server path that served, or refused, a download. A member can
-- read their own line's access history through the policy above; nobody can
-- write it from a browser.
create function public.log_recording_access(u uuid, r uuid, result text) returns void
  language plpgsql security definer set search_path='' as $$
declare scope uuid;
begin
  select workspace_id into scope from public.recordings where id = r;
  if scope is null then return; end if;
  insert into public.recording_access_events(workspace_id, recording_id, actor_id, capability, outcome)
    values(scope, r, u, 'read_recording', result);
end $$;

revoke all on function public.may_read_recording(uuid,uuid),
  public.log_recording_access(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.may_read_recording(uuid,uuid),
  public.log_recording_access(uuid,uuid,text) to service_role;

commit;

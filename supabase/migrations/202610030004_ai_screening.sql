begin;

-- AI screening: a third capture purpose, two line switches, and the profile the
-- voice gateway reads to decide how to answer.
--
-- What a caller says has to leave Redial and reach a model provider before the
-- assistant can decide anything. That is a disclosure of call content to a third
-- party, and it is not covered by agreeing to a recording or a transcript: a
-- member may want their calls screened by a person's rules and not handed to a
-- model at all. So it is its own purpose, with the same basis model and the same
-- trigger as the other two.

-- ---------------------------------------------------------------------------
-- The purpose
-- ---------------------------------------------------------------------------
alter table public.consent_events drop constraint consent_events_purpose_check;
alter table public.consent_events add constraint consent_events_purpose_check
  check(purpose in ('call_recording','call_transcription','ai_screening'));

-- ---------------------------------------------------------------------------
-- Which row is the current one
-- ---------------------------------------------------------------------------
-- `consent_active` read the newest row by `created_at desc, id desc`. The
-- tiebreaker is a random uuid, so two rows sharing a timestamp ordered
-- arbitrarily — and `created_at` defaults to `now()`, which in Postgres is the
-- transaction clock, so any two events written in one transaction share it
-- exactly. In production each decision is its own statement and the ambiguity
-- never surfaces; it is still a coin toss deciding whether capture is permitted,
-- which is not a thing to leave in the authority for that question.
--
-- A monotonic sequence settles it. Insertion order is what "newest" meant all
-- along.
alter table public.consent_events add column seq bigint generated always as identity;
create index consent_sequence on public.consent_events(workspace_id, line_id, purpose, seq desc);

create or replace function private.consent_active(w uuid, l uuid, p text) returns boolean
  language sql stable security definer set search_path='' as $$
  select coalesce((select granted from public.consent_events
    where workspace_id = w and line_id = l and purpose = p
    order by seq desc limit 1), false);
$$;

-- ---------------------------------------------------------------------------
-- The two switches
-- ---------------------------------------------------------------------------
alter table public.line_routing
  -- Off by default like the other two. Turning it on needs a basis for
  -- ai_screening, enforced by the trigger below rather than by the page.
  add column ai_screening_enabled boolean not null default false,
  -- Whether the caller is told an AI is answering. Default on, and the owner
  -- may turn it off.
  --
  -- The owner's decision, 2026-10-02, made against the recommendation recorded
  -- with it: announcing always is what makes an all-party state workable, and a
  -- line that takes calls from outside a one-party jurisdiction may need the
  -- announcement it can now switch off. The dashboard warns at the point of
  -- turning it off; the database does not refuse it.
  add column ai_notice_enabled boolean not null default true;

comment on column public.line_routing.ai_notice_enabled is
  'Whether the greeting tells the caller an AI is answering. Owner-controlled by decision; defaults on. Turning it off does not change what any jurisdiction requires.';

-- ---------------------------------------------------------------------------
-- The guard, extended
-- ---------------------------------------------------------------------------
-- Replaces the two-purpose version. Same reasoning as before: a trigger rather
-- than a policy, because service_role carries bypassrls, which skips policies
-- and not triggers, so the gateway and the worker are held to it too.
create or replace function public.guard_capture_consent() returns trigger
  language plpgsql security definer set search_path='' as $$
begin
  if new.recording_enabled
    and not private.consent_active(new.workspace_id, new.line_id, 'call_recording') then
    raise exception 'Recording requires a current call_recording basis for this line'
      using errcode = 'check_violation';
  end if;
  if new.transcription_enabled
    and not private.consent_active(new.workspace_id, new.line_id, 'call_transcription') then
    raise exception 'Transcription requires a current call_transcription basis for this line'
      using errcode = 'check_violation';
  end if;
  if new.ai_screening_enabled
    and not private.consent_active(new.workspace_id, new.line_id, 'ai_screening') then
    raise exception 'AI screening requires a current ai_screening basis for this line'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

-- Withdrawal already turns a capture off; it now covers the third purpose.
create or replace function public.apply_consent_withdrawal() returns trigger
  language plpgsql security definer set search_path='' as $$
begin
  if not new.granted then
    if new.purpose = 'call_recording' then
      update public.line_routing set recording_enabled = false, updated_at = now()
        where workspace_id = new.workspace_id and line_id = new.line_id and recording_enabled;
    elsif new.purpose = 'call_transcription' then
      update public.line_routing set transcription_enabled = false, updated_at = now()
        where workspace_id = new.workspace_id and line_id = new.line_id and transcription_enabled;
    else
      update public.line_routing set ai_screening_enabled = false, updated_at = now()
        where workspace_id = new.workspace_id and line_id = new.line_id and ai_screening_enabled;
    end if;
  end if;
  return new;
end $$;

-- `set_capture_enabled` already takes the purpose as a parameter; it only knew
-- two columns.
create or replace function public.set_capture_enabled(w uuid, l uuid, p text, enabled boolean)
  returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.line_owner(w, l) then
    raise exception 'Only the line owner can change capture settings';
  end if;
  if enabled and not private.consent_active(w, l, p) then
    raise exception 'Record a basis for this line before enabling capture';
  end if;
  if p = 'call_recording' then
    update public.line_routing set recording_enabled = enabled, updated_at = now()
      where workspace_id = w and line_id = l;
  elsif p = 'call_transcription' then
    update public.line_routing set transcription_enabled = enabled, updated_at = now()
      where workspace_id = w and line_id = l;
  elsif p = 'ai_screening' then
    update public.line_routing set ai_screening_enabled = enabled, updated_at = now()
      where workspace_id = w and line_id = l;
  else
    raise exception 'Unknown consent purpose';
  end if;
  insert into public.audit_events(workspace_id, actor_id, action, resource_id)
    values(w, auth.uid(), 'line.capture_' || (case when enabled then 'enabled' else 'disabled' end), l);
end $$;

-- Both basis writers carried their own copy of the purpose list.
create or replace function public.record_capture_consent(
  w uuid, l uuid, p text, granted boolean, disclosure text, context text
) returns uuid language plpgsql security definer set search_path='' as $$
declare created uuid;
begin
  if p not in ('call_recording','call_transcription','ai_screening') then
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

create or replace function public.record_one_party_basis(
  w uuid, l uuid, p text, place text, context text
) returns uuid language plpgsql security definer set search_path='' as $$
declare created uuid;
begin
  if p not in ('call_recording','call_transcription','ai_screening') then
    raise exception 'Unknown consent purpose';
  end if;
  if not private.line_owner(w, l) then
    raise exception 'Only the line owner can record a recording basis';
  end if;
  if place is null or place !~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$' then
    raise exception 'Give the jurisdiction this basis relies on, for example US-AZ';
  end if;
  insert into public.consent_events(workspace_id, line_id, purpose, channel,
    disclosure_version, granted, actor_id, collection_context, legal_basis, jurisdiction)
    values(w, l, p, 'no_disclosure', 'one-party', true, auth.uid(), context,
      'one_party_recording', place)
    returning id into created;
  insert into public.audit_events(workspace_id, actor_id, action, resource_id)
    values(w, auth.uid(), 'line.capture_one_party_basis_recorded', l);
  return created;
end $$;

-- The caller notice is a presentation choice, not a capture, so it has no basis
-- requirement and its own owner-only setter.
create function public.set_ai_notice(w uuid, l uuid, enabled boolean)
  returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.line_owner(w, l) then
    raise exception 'Only the line owner can change the caller notice';
  end if;
  update public.line_routing set ai_notice_enabled = enabled, updated_at = now()
    where workspace_id = w and line_id = l;
  insert into public.audit_events(workspace_id, actor_id, action, resource_id)
    values(w, auth.uid(), 'line.ai_notice_' || (case when enabled then 'enabled' else 'disabled' end), l);
end $$;
revoke all on function public.set_ai_notice(uuid,uuid,boolean) from public, anon;
grant execute on function public.set_ai_notice(uuid,uuid,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- What the gateway asks when a call arrives
-- ---------------------------------------------------------------------------
-- One question, one answer, resolved in the database rather than assembled from
-- four round trips while a caller waits. The tier comes from the subscription's
-- plan version, so changing what a plan includes changes behaviour without a
-- deployment.
--
-- A workspace with no subscription gets the rule-based path. That is also the
-- fallback when the model is slow or unavailable, so the free tier and the
-- failure path are the same code, which is the cheapest way to keep the failure
-- path exercised.
--
-- service_role only: it takes a line id and answers for it, so a member could
-- otherwise read another workspace's assistant configuration.
create function public.line_assistant_profile(w uuid, l uuid) returns jsonb
  language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'screening_enabled', coalesce(r.ai_screening_enabled, false),
    'notice_enabled', coalesce(r.ai_notice_enabled, true),
    'greeting', coalesce(r.greeting, ''),
    'model', coalesce(f.features->>'ai_model', 'rules'),
    'turns', least(greatest(coalesce((f.features->>'ai_turns')::int, 1), 1), 5),
    'minute_limit', coalesce((f.limits->>'ai_minutes')::int, 0)
  )
  from public.line_routing r
  left join public.subscriptions s on s.workspace_id = w
  left join public.plan_versions f on f.id = s.plan_version_id
  where r.workspace_id = w and r.line_id = l;
$$;
revoke all on function public.line_assistant_profile(uuid,uuid) from public, anon, authenticated;
grant execute on function public.line_assistant_profile(uuid,uuid) to service_role;

commit;

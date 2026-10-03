begin;

-- A recorded legal basis, where consent is not the one being relied on.
--
-- The owner's decision, 2026-10-02. Arizona is a one-party-consent state: a
-- party to a call may record it without the other party agreeing, under both
-- A.R.S. and federal law. Requiring a consent event there was asking for a
-- record of something that had not happened — the member had obtained no
-- agreement, so recording "granted: true, channel: ivr_announcement" would have
-- been a false statement sitting in the evidence table.
--
-- What stays is the row. Capture is still impossible without one, it is still
-- append-only, it is still written only by the line owner, and it is still
-- audited. What changes is that the row now says *which* basis was relied on,
-- so an audit can tell a disclosure from a jurisdiction claim rather than
-- finding both recorded identically.

-- ---------------------------------------------------------------------------
-- What the row is asserting
-- ---------------------------------------------------------------------------
alter table public.consent_events
  add column legal_basis text not null default 'all_party_consent'
    check(legal_basis in ('all_party_consent','one_party_recording')),
  -- Where the claim applies. Required for a one-party basis and meaningless
  -- without it: the basis is a statement about a jurisdiction's law, and a
  -- claim with no jurisdiction attached cannot be checked by anyone later.
  add column jurisdiction text
    check(jurisdiction is null or jurisdiction ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$');

comment on column public.consent_events.legal_basis is
  'Which basis this row asserts. all_party_consent means the other party agreed and the channel says how they were told. one_party_recording means the member is a party to the call and is relying on a one-party jurisdiction, with no disclosure claimed.';

-- No disclosure was made, so none may be claimed. The channel column exists to
-- say how the other party was told; for a one-party basis the honest value is
-- that they were not.
alter table public.consent_events drop constraint consent_events_channel_check;
alter table public.consent_events add constraint consent_events_channel_check
  check(channel in ('ivr_announcement','written_notice','no_disclosure'));

alter table public.consent_events add constraint consent_events_basis_shape
  check(
    (legal_basis = 'all_party_consent' and channel in ('ivr_announcement','written_notice') and jurisdiction is null)
    or
    (legal_basis = 'one_party_recording' and channel = 'no_disclosure' and jurisdiction is not null and granted)
  );

-- A withdrawal is still a withdrawal. `private.consent_active` reads the newest
-- row's `granted` and is unchanged: a one-party basis is granted = true, and
-- revoking it is a new all-party row with granted = false, which the existing
-- withdrawal trigger already turns the capture off for.

-- ---------------------------------------------------------------------------
-- Recording the basis
-- ---------------------------------------------------------------------------
-- Separate from record_capture_consent rather than another argument on it. The
-- two are different assertions and the caller should have to say which one it
-- is making; an optional parameter would let the weaker claim be made by
-- default.
create function public.record_one_party_basis(
  w uuid, l uuid, p text, place text, context text
) returns uuid language plpgsql security definer set search_path='' as $$
declare created uuid;
begin
  if p not in ('call_recording','call_transcription') then
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

revoke all on function public.record_one_party_basis(uuid,uuid,text,text,text) from public, anon;
grant execute on function public.record_one_party_basis(uuid,uuid,text,text,text) to authenticated;

commit;

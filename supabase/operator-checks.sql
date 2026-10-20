-- Read-only state check. Run in the Supabase SQL editor.
--
-- Nothing here writes. It answers the questions that decide what can be tested
-- next: whether an account exists and has confirmed its email, whether that
-- account has a workspace and a line, whether a number is attached, and whether
-- anything has been enabled that should not have been.

-- 1. Counts across the whole project.
select
  (select count(*) from auth.users)                                              as accounts,
  (select count(*) from auth.users where email_confirmed_at is not null)         as confirmed_accounts,
  (select count(*) from public.platform_staff where active)                      as active_staff,
  (select count(*) from public.workspaces)                                       as workspaces,
  (select count(*) from public.memberships where status = 'active')              as active_memberships,
  (select count(*) from public.lines)                                            as lines,
  (select count(*) from public.phone_numbers)                                    as phone_numbers,
  (select count(*) from public.phone_numbers where status = 'active')            as active_numbers,
  (select count(*) from public.endpoints
     where verified_at is not null and revoked_at is null)                        as verified_destinations,
  (select count(*) from public.call_screenings)                                  as screenings,
  (select count(*) from public.calls)                                            as projected_calls,
  (select count(*) from public.consent_events)                                   as basis_records,
  (select count(*) from public.line_routing where recording_enabled)             as lines_recording,
  (select count(*) from public.line_routing where ai_screening_enabled)          as lines_ai_screening,
  (select count(*) from public.billing_products)                                 as products,
  (select count(*) from public.prices where availability = 'available')          as published_prices,
  (select count(*) from public.credit_entries)                                   as credit_entries,
  (select count(*) from public.payments)                                         as payments;

-- 2. Who exists, and what they have. A null workspace means the account signed
--    up but never created one; a null line means there is nothing to call yet.
select
  u.email,
  u.email_confirmed_at is not null as confirmed,
  u.created_at,
  w.id   as workspace_id,
  w.name as workspace_name,
  l.id   as line_id,
  l.name as line_name,
  l.status as line_status
from auth.users u
left join public.memberships m on m.user_id = u.id and m.status = 'active'
left join public.workspaces w on w.id = m.workspace_id
left join public.lines l on l.workspace_id = w.id
order by u.created_at;

-- 3. How each line is set to answer, and what basis it holds. Everything should
--    read false until a basis is recorded and the switch is turned on.
select
  l.name as line,
  r.mode,
  r.recording_enabled,
  r.transcription_enabled,
  r.ai_screening_enabled,
  r.ai_notice_enabled,
  r.ai_sip_uri is not null as has_sip_assistant,
  (select count(*) from public.consent_events c
     where c.line_id = l.id and c.granted) as granted_bases
from public.lines l
left join public.line_routing r on r.line_id = l.id
order by l.created_at;

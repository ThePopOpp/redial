begin;

-- Widen the staff roles and give the table a lifecycle. `owner` is the genuine
-- super-admin tier; `admin` previously granted nothing beyond `support`.
alter table public.platform_staff drop constraint if exists platform_staff_role_check;
alter table public.platform_staff add constraint platform_staff_role_check
  check(role in ('owner','admin','support','finance','growth','analyst'));
alter table public.platform_staff
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists note text check(note is null or length(note) between 1 and 500);

-- Capabilities are data, not role strings scattered through policy bodies, so
-- the matrix can be read and reasoned about in one place.
create table public.staff_capabilities (
  role text not null,
  capability text not null check(capability in (
    'support_read','support_write','customer_read','customer_admin',
    'billing_read','billing_write','refund_approve',
    'reminder_send','reminder_approve','jobs_admin','staff_admin','audit_read')),
  primary key(role, capability)
);
insert into public.staff_capabilities(role, capability) values
  ('owner','support_read'),('owner','support_write'),('owner','customer_read'),('owner','customer_admin'),
  ('owner','billing_read'),('owner','billing_write'),('owner','refund_approve'),
  ('owner','reminder_send'),('owner','reminder_approve'),('owner','jobs_admin'),('owner','staff_admin'),('owner','audit_read'),
  ('admin','support_read'),('admin','support_write'),('admin','customer_read'),('admin','customer_admin'),
  ('admin','billing_read'),('admin','billing_write'),('admin','reminder_send'),('admin','jobs_admin'),('admin','audit_read'),
  ('support','support_read'),('support','support_write'),('support','customer_read'),
  ('finance','billing_read'),('finance','billing_write'),('finance','customer_read'),('finance','audit_read'),
  ('growth','customer_read'),('growth','reminder_send'),
  ('analyst','customer_read'),('analyst','billing_read'),('analyst','audit_read');

alter table public.staff_capabilities enable row level security;
revoke all on public.staff_capabilities from anon, authenticated;

create function private.staff_capability(c text) returns boolean language sql stable security definer set search_path='' as $$
  select private.staff_access() and exists(
    select 1 from public.platform_staff s
    join public.staff_capabilities sc on sc.role = s.role
    where s.user_id = auth.uid() and s.active and sc.capability = c);
$$;

-- Redefining support_access in terms of the matrix means every existing policy
-- on workspace_records and support_messages inherits the new roles unchanged.
create or replace function private.support_access() returns boolean language sql stable security definer set search_path='' as $$
  select private.staff_capability('support_read');
$$;

create function private.staff_audit(action text, resource uuid) returns void language sql security definer set search_path='' as $$
  insert into public.audit_events(workspace_id, actor_id, action, resource_id) values(null, auth.uid(), action, resource);
$$;

-- What the signed-in staff member may do. Drives navigation and nothing else;
-- every read below re-checks its own capability.
create function public.staff_capabilities_for_me() returns table(role text, capability text)
language sql stable security definer set search_path='' as $$
  select s.role, sc.capability from public.platform_staff s
  join public.staff_capabilities sc on sc.role = s.role
  where s.user_id = auth.uid() and s.active and private.staff_access();
$$;

create function public.staff_directory() returns table(user_id uuid, email text, role text, active boolean, note text, created_at timestamptz)
language sql stable security definer set search_path='' as $$
  select s.user_id, u.email::text, s.role, s.active, s.note, s.created_at
  from public.platform_staff s join auth.users u on u.id = s.user_id
  where private.staff_capability('staff_admin')
  order by s.active desc, s.role, u.email;
$$;

-- Staff changes are owner-only, never self-applied, and can never remove the
-- last active owner. The first owner is still created by a privileged session.
create function public.promote_staff(target uuid, new_role text, is_active boolean, staff_note text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.staff_capability('staff_admin') then raise exception 'Not permitted'; end if;
  if target = auth.uid() then raise exception 'Staff cannot change their own role'; end if;
  if new_role not in ('owner','admin','support','finance','growth','analyst') then raise exception 'Unknown role'; end if;
  if not exists(select 1 from auth.users where id = target and email_confirmed_at is not null) then
    raise exception 'Verified account required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('platform_staff', 0));
  insert into public.platform_staff(user_id, role, active, note) values(target, new_role, is_active, staff_note)
    on conflict(user_id) do update set role = excluded.role, active = excluded.active,
      note = coalesce(excluded.note, public.platform_staff.note), updated_at = now();
  if not exists(select 1 from public.platform_staff where role = 'owner' and active) then
    raise exception 'At least one active owner must remain';
  end if;
  perform private.staff_audit('staff.role_changed', target);
end; $$;

-- Cross-tenant staff reads go through projections, not widened table policies:
-- a policy cannot write an audit row, and a widened policy would expose every
-- column to arbitrary client filters. No projection returns call content.
create function public.staff_customer_search(q text default '', lim integer default 50, off integer default 0)
returns table(workspace_id uuid, name text, type text, owner_email text, members integer, lines integer,
              calls_30d integer, open_tickets integer, plan text, status text, created_at timestamptz)
language sql stable security definer set search_path='' as $$
  select w.id, w.name, w.type, u.email::text,
    (select count(*)::integer from public.memberships m where m.workspace_id = w.id and m.status = 'active'),
    (select count(*)::integer from public.lines l where l.workspace_id = w.id),
    (select count(*)::integer from public.calls c where c.workspace_id = w.id and c.started_at > now() - interval '30 days'),
    (select count(*)::integer from public.workspace_records r where r.workspace_id = w.id and r.kind = 'ticket'),
    coalesce(s.plan, 'none'), coalesce(s.status, 'none'), w.created_at
  from public.workspaces w
  join auth.users u on u.id = w.created_by
  left join public.subscriptions s on s.workspace_id = w.id
  where private.staff_capability('customer_read')
    and (q = '' or w.name ilike '%' || q || '%' or u.email ilike '%' || q || '%')
  order by w.created_at desc
  limit greatest(1, least(coalesce(lim, 50), 200)) offset greatest(0, coalesce(off, 0));
$$;

create function public.staff_customer_overview(w uuid) returns jsonb
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
    'subscription', (select to_jsonb(s) from public.subscriptions s where s.workspace_id = w),
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

create function public.staff_platform_overview() returns jsonb
language sql stable security definer set search_path='' as $$
  select case when private.staff_capability('customer_read') then jsonb_build_object(
    'workspaces', (select count(*) from public.workspaces),
    'workspaces_7d', (select count(*) from public.workspaces where created_at > now() - interval '7 days'),
    'members', (select count(*) from public.memberships where status = 'active'),
    'lines', (select count(*) from public.lines),
    'lines_ready', (select count(*) from public.lines where status = 'ready'),
    'open_tickets', (select count(*) from public.workspace_records where kind = 'ticket'),
    'calls_30d', (select count(*) from public.calls where started_at > now() - interval '30 days'),
    'staff_active', (select count(*) from public.platform_staff where active),
    'as_of', now()
  ) else null end;
$$;

create function public.staff_audit_log(lim integer default 100) returns table(action text, actor_email text, workspace_id uuid, resource_id uuid, created_at timestamptz)
language sql stable security definer set search_path='' as $$
  select a.action, u.email::text, a.workspace_id, a.resource_id, a.created_at
  from public.audit_events a left join auth.users u on u.id = a.actor_id
  where private.staff_capability('audit_read')
  order by a.created_at desc
  limit greatest(1, least(coalesce(lim, 100), 500));
$$;

revoke all on function private.staff_capability(text), private.staff_audit(text, uuid) from public;
revoke all on function public.staff_capabilities_for_me(), public.staff_directory(),
  public.promote_staff(uuid, text, boolean, text), public.staff_customer_search(text, integer, integer),
  public.staff_customer_overview(uuid), public.staff_platform_overview(), public.staff_audit_log(integer) from public;
grant execute on function private.staff_capability(text), private.staff_audit(text, uuid) to authenticated;
grant execute on function public.staff_capabilities_for_me(), public.staff_directory(),
  public.promote_staff(uuid, text, boolean, text), public.staff_customer_search(text, integer, integer),
  public.staff_customer_overview(uuid), public.staff_platform_overview(), public.staff_audit_log(integer) to authenticated;

commit;

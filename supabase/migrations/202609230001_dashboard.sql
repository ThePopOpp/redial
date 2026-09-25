begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 100),
  type text not null check(type in ('personal','business')), created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.memberships (
  workspace_id uuid not null references public.workspaces(id), user_id uuid not null references auth.users(id),
  role text not null check(role in ('owner','admin','billing','member')), status text not null check(status in ('active','invited','revoked')),
  primary key(workspace_id,user_id)
);
create table public.platform_staff (user_id uuid primary key references auth.users(id), role text not null check(role in ('support','admin','finance')), active boolean not null default false);
create table public.lines (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), owner_id uuid not null,
  name text not null check(length(name) between 1 and 100), status text not null default 'unconfigured' check(status in ('unconfigured','verifying','ready','degraded','disabled')),
  created_at timestamptz not null default now(), unique(workspace_id,id), foreign key(workspace_id,owner_id) references public.memberships(workspace_id,user_id)
);
create table public.line_access_grants (
  workspace_id uuid not null, line_id uuid not null, user_id uuid not null,
  capability text not null check(capability in ('read_summary','read_transcript','manage_rules','monitor_live','takeover_live','direct_agent','transfer_call')),
  primary key(line_id,user_id,capability), foreign key(workspace_id,line_id) references public.lines(workspace_id,id), foreign key(workspace_id,user_id) references public.memberships(workspace_id,user_id)
);
create table public.workspace_records (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, line_id uuid, owner_id uuid not null default auth.uid(),
  kind text not null check(kind in ('contact','directory','callback','policy','agent','preferences','ticket')),
  body jsonb not null check(jsonb_typeof(body)='object' and octet_length(body::text) <= 12000),
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check((kind='ticket' and line_id is null) or (kind<>'ticket' and line_id is not null)),
  foreign key(workspace_id,line_id) references public.lines(workspace_id,id), foreign key(workspace_id,owner_id) references public.memberships(workspace_id,user_id)
);
create unique index record_singleton on public.workspace_records(line_id,kind) where kind in ('policy','agent','preferences');
create index records_scope on public.workspace_records(workspace_id,line_id,kind,created_at desc);
create table public.calls (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, line_id uuid not null,
  caller text not null, phone text not null, outcome text not null check(outcome in ('message','blocked','connected','missed')),
  summary text not null default '', started_at timestamptz not null, duration_seconds integer not null default 0 check(duration_seconds >= 0),
  unique(workspace_id,line_id,id), foreign key(workspace_id,line_id) references public.lines(workspace_id,id)
);
create index calls_scope on public.calls(workspace_id,line_id,started_at desc);
create table public.transcript_segments (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, line_id uuid not null, call_id uuid not null,
  sequence integer not null check(sequence>=0), speaker text not null, body text not null, expires_at timestamptz not null,
  unique(call_id,sequence), foreign key(workspace_id,line_id,call_id) references public.calls(workspace_id,line_id,id)
);
create table public.provider_connections (
  workspace_id uuid not null references public.workspaces(id), provider text not null, status text not null default 'unconfigured',
  checked_at timestamptz, primary key(workspace_id,provider)
);
create table public.subscriptions (
  workspace_id uuid primary key references public.workspaces(id), plan text not null, status text not null, current_period_end timestamptz
);
create table public.audit_events (
  id bigint generated always as identity primary key, workspace_id uuid references public.workspaces(id), actor_id uuid references auth.users(id),
  action text not null, resource_id uuid, created_at timestamptz not null default now()
);

create function private.member_of(w uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.memberships where workspace_id=w and user_id=auth.uid() and status='active');
$$;
create function private.manager_of(w uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.memberships where workspace_id=w and user_id=auth.uid() and status='active' and role in ('owner','admin'));
$$;
create function private.staff_access() returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(auth.jwt()->>'aal'='aal2',false) and exists(select 1 from public.platform_staff where user_id=auth.uid() and active);
$$;
create function private.support_access() returns boolean language sql stable security definer set search_path='' as $$
  select private.staff_access() and exists(select 1 from public.platform_staff where user_id=auth.uid() and role in ('support','admin'));
$$;
create function private.line_owner(w uuid,l uuid) returns boolean language sql stable security definer set search_path='' as $$
  select private.member_of(w) and exists(select 1 from public.lines where workspace_id=w and id=l and owner_id=auth.uid());
$$;
create function private.line_access(w uuid,l uuid,c text) returns boolean language sql stable security definer set search_path='' as $$
  select private.member_of(w) and (private.line_owner(w,l) or exists(select 1 from public.line_access_grants where workspace_id=w and line_id=l and user_id=auth.uid() and capability=c));
$$;
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.platform_staff enable row level security;
alter table public.lines enable row level security;
alter table public.line_access_grants enable row level security;
alter table public.workspace_records enable row level security;
alter table public.calls enable row level security;
alter table public.transcript_segments enable row level security;
alter table public.provider_connections enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_events enable row level security;
revoke all on public.workspaces,public.memberships,public.platform_staff,public.lines,public.line_access_grants,public.workspace_records,public.calls,public.transcript_segments,public.provider_connections,public.subscriptions,public.audit_events from anon,authenticated;
grant select on public.workspaces,public.memberships,public.platform_staff,public.lines,public.line_access_grants,public.workspace_records,public.calls,public.transcript_segments,public.provider_connections,public.subscriptions,public.audit_events to authenticated;
grant insert,update,delete on public.workspace_records to authenticated;

create policy workspace_read on public.workspaces for select to authenticated using(private.member_of(id));
create policy memberships_read on public.memberships for select to authenticated using(user_id=auth.uid() or private.manager_of(workspace_id));
create policy staff_self on public.platform_staff for select to authenticated using(user_id=auth.uid());
create policy line_read on public.lines for select to authenticated using(private.line_access(workspace_id,id,'read_summary') or private.line_access(workspace_id,id,'read_transcript') or private.line_access(workspace_id,id,'manage_rules'));
create policy grants_read on public.line_access_grants for select to authenticated using((user_id=auth.uid() and private.member_of(workspace_id)) or private.line_owner(workspace_id,line_id));
create policy record_read on public.workspace_records for select to authenticated using(
  (kind='ticket' and ((owner_id=auth.uid() and private.member_of(workspace_id)) or private.support_access())) or
  (kind<>'ticket' and private.line_access(workspace_id,line_id,'manage_rules'))
);
create policy record_insert on public.workspace_records for insert to authenticated with check(owner_id=auth.uid() and private.member_of(workspace_id) and
  ((kind='ticket' and line_id is null) or (kind<>'ticket' and private.line_access(workspace_id,line_id,'manage_rules'))));
create policy record_update on public.workspace_records for update to authenticated using(
  (kind='ticket' and ((owner_id=auth.uid() and private.member_of(workspace_id)) or private.support_access())) or
  (kind<>'ticket' and private.line_access(workspace_id,line_id,'manage_rules'))
) with check((kind='ticket' and ((owner_id=auth.uid() and private.member_of(workspace_id)) or private.support_access())) or (kind<>'ticket' and private.line_access(workspace_id,line_id,'manage_rules')));
create policy record_delete on public.workspace_records for delete to authenticated using(private.member_of(workspace_id) and ((kind='ticket' and owner_id=auth.uid()) or (kind<>'ticket' and private.line_access(workspace_id,line_id,'manage_rules'))));
create policy calls_read on public.calls for select to authenticated using(private.line_access(workspace_id,line_id,'read_summary'));
create policy transcripts_read on public.transcript_segments for select to authenticated using(private.line_access(workspace_id,line_id,'read_transcript') and expires_at>now());
create policy connections_read on public.provider_connections for select to authenticated using(private.member_of(workspace_id));
create policy billing_read on public.subscriptions for select to authenticated using(exists(select 1 from public.memberships where workspace_id=subscriptions.workspace_id and user_id=auth.uid() and status='active' and role in ('owner','admin','billing')));
create policy audit_read on public.audit_events for select to authenticated using(private.manager_of(workspace_id) or private.staff_access());

create function private.record_revision() returns trigger language plpgsql set search_path='' as $$
begin
  if row(new.id,new.workspace_id,new.line_id,new.owner_id,new.kind,new.created_at) is distinct from row(old.id,old.workspace_id,old.line_id,old.owner_id,old.kind,old.created_at) then raise exception 'Record scope is immutable'; end if;
  new.version=old.version+1; new.updated_at=now(); return new;
end; $$;
create trigger record_revision before update on public.workspace_records for each row execute function private.record_revision();
create function private.record_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.audit_events(workspace_id,actor_id,action,resource_id) values(coalesce(new.workspace_id,old.workspace_id),auth.uid(),lower(tg_op)||'.'||coalesce(new.kind,old.kind),coalesce(new.id,old.id));
  return coalesce(new,old);
end; $$;
create trigger record_audit after insert or update or delete on public.workspace_records for each row execute function private.record_audit();

create function public.create_workspace(workspace_name text,workspace_type text) returns uuid language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Verified account required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if (select count(*) from public.workspaces where created_by=auth.uid())>=5 then raise exception 'Workspace limit reached'; end if;
  insert into public.workspaces(name,type,created_by) values(trim(workspace_name),workspace_type,auth.uid()) returning id into w;
  insert into public.memberships values(w,auth.uid(),'owner','active');
  insert into public.lines(workspace_id,owner_id,name) values(w,auth.uid(),'My line');
  insert into public.audit_events(workspace_id,actor_id,action,resource_id) values(w,auth.uid(),'workspace.created',w);
  return w;
end; $$;
create function public.create_line(w uuid,line_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare l uuid;
begin
  if not private.member_of(w) then raise exception 'Membership required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(w::text,1));
  if (select count(*) from public.lines where workspace_id=w)>=20 then raise exception 'Line limit reached'; end if;
  insert into public.lines(workspace_id,owner_id,name) values(w,auth.uid(),trim(line_name)) returning id into l;
  return l;
end; $$;
create function public.invite_member(w uuid,email_address text,member_role text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
  if not private.manager_of(w) or member_role not in ('member','billing') then raise exception 'Not permitted'; end if;
  select id into u from auth.users where lower(email)=lower(trim(email_address)) and email_confirmed_at is not null;
  if u is not null then
    insert into public.memberships values(w,u,member_role,'invited') on conflict(workspace_id,user_id) do update set role=excluded.role,status='invited' where memberships.status='revoked';
    insert into public.audit_events(workspace_id,actor_id,action,resource_id) values(w,auth.uid(),'membership.invited',u);
  end if;
end; $$;
create function public.accept_membership(w uuid) returns void language plpgsql security definer set search_path='' as $$
begin update public.memberships set status='active' where workspace_id=w and user_id=auth.uid() and status='invited'; end; $$;
create function public.revoke_membership(w uuid,u uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.manager_of(w) then raise exception 'Not permitted'; end if;
  update public.memberships set status='revoked' where workspace_id=w and user_id=u and role in ('member','billing');
  delete from public.line_access_grants where workspace_id=w and user_id=u;
  insert into public.audit_events(workspace_id,actor_id,action,resource_id) values(w,auth.uid(),'membership.revoked',u);
end; $$;
create function public.set_line_grant(w uuid,l uuid,u uuid,c text,enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.line_owner(w,l) or not exists(select 1 from public.memberships where workspace_id=w and user_id=u and status='active') then raise exception 'Not permitted'; end if;
  if enabled then insert into public.line_access_grants values(w,l,u,c) on conflict do nothing;
  else delete from public.line_access_grants where workspace_id=w and line_id=l and user_id=u and capability=c; end if;
  insert into public.audit_events(workspace_id,actor_id,action,resource_id) values(w,auth.uid(),'line.grant_changed',l);
end; $$;
revoke all on function public.create_workspace(text,text),public.create_line(uuid,text),public.invite_member(uuid,text,text),public.accept_membership(uuid),public.revoke_membership(uuid,uuid),public.set_line_grant(uuid,uuid,uuid,text,boolean) from public;
grant execute on function public.create_workspace(text,text),public.create_line(uuid,text),public.invite_member(uuid,text,text),public.accept_membership(uuid),public.revoke_membership(uuid,uuid),public.set_line_grant(uuid,uuid,uuid,text,boolean) to authenticated;
revoke all on all functions in schema private from public;
commit;

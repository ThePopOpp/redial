begin;
-- A member's intent only. This table cannot activate or verify a voice route.
create table public.line_setup_drafts (
  workspace_id uuid not null,
  line_id uuid primary key,
  body jsonb not null check(jsonb_typeof(body)='object' and octet_length(body::text)<=3000),
  version integer not null default 1 check(version>0),
  updated_at timestamptz not null default now(),
  foreign key(workspace_id,line_id) references public.lines(workspace_id,id)
);
alter table public.line_setup_drafts enable row level security;
revoke all on public.line_setup_drafts from anon, authenticated;
grant select on public.line_setup_drafts to authenticated;
create policy setup_read on public.line_setup_drafts for select to authenticated
  using(private.line_access(workspace_id,line_id,'manage_rules'));

create function public.save_line_setup(w uuid,l uuid,expected_version integer,draft jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare next_version integer;
begin
  if not private.line_access(w,l,'manage_rules') then raise exception 'Line permission required'; end if;
  if expected_version is null or expected_version<0 or draft is null or jsonb_typeof(draft)<>'object'
    or octet_length(draft::text)>3000 then raise exception 'Invalid draft'; end if;
  if not (draft ?& array['carrier','otherCarrier','country','device','model','os','plan','route','condition','sourcePhone','ownsLine','understandsRouting'])
    or (select count(*) from jsonb_object_keys(draft))<>12
    or exists(select 1 from jsonb_each(draft) where key not in ('ownsLine','understandsRouting') and jsonb_typeof(value)<>'string')
    or draft->>'carrier' not in ('mint','tmobile','verizon','att','other')
    or draft->>'country' !~ '^[A-Z]{2}$'
    or (draft->>'country'<>'US' and draft->>'carrier'<>'other')
    or draft->>'device' not in ('Android','iPhone','Other')
    or length(trim(draft->>'model')) not between 1 and 80
    or length(trim(draft->>'os')) not between 1 and 60
    or length(trim(draft->>'plan')) not between 1 and 80
    or length(draft->>'otherCarrier')>80
    or (draft->>'carrier'='other' and length(trim(draft->>'otherCarrier'))=0)
    or draft->>'route' not in ('dedicated','conditional','all')
    or draft->>'condition' not in ('unanswered','busy','unreachable')
    or (draft->>'sourcePhone'<>'' and draft->>'sourcePhone' !~ '^\+[1-9][0-9]{7,14}$')
    or (draft->>'route'<>'dedicated' and draft->>'sourcePhone'='')
    or draft->'ownsLine'<>'true'::jsonb or draft->'understandsRouting'<>'true'::jsonb
  then raise exception 'Invalid draft'; end if;
  perform pg_advisory_xact_lock(hashtextextended(l::text,25));
  if expected_version=0 then
    insert into public.line_setup_drafts(workspace_id,line_id,body) values(w,l,draft) returning version into next_version;
  else
    update public.line_setup_drafts set body=draft,version=version+1,updated_at=now()
      where workspace_id=w and line_id=l and version=expected_version returning version into next_version;
    if next_version is null then raise exception 'Setup changed; reload'; end if;
  end if;
  insert into public.audit_events(workspace_id,actor_id,action,resource_id) values(w,auth.uid(),'line.setup_draft_saved',l);
  return next_version;
end; $$;
revoke all on function public.save_line_setup(uuid,uuid,integer,jsonb) from public;
grant execute on function public.save_line_setup(uuid,uuid,integer,jsonb) to authenticated;
create function public.can_manage_line_setup(w uuid,l uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select private.line_access(w,l,'manage_rules');
$$;
revoke all on function public.can_manage_line_setup(uuid,uuid) from public;
grant execute on function public.can_manage_line_setup(uuid,uuid) to authenticated;
commit;

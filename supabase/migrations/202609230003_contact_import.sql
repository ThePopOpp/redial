begin;
-- User-session RPC: RLS remains active and line permission is checked again.
-- One transaction imports all selected rows or none; retries skip exact phones.
create function public.import_contacts(w uuid,l uuid,contacts jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare item jsonb; added integer=0; skipped integer=0;
begin
  if not private.line_access(w,l,'manage_rules') then raise exception 'Line permission required'; end if;
  if contacts is null or jsonb_typeof(contacts) <> 'array' then raise exception 'Select 1 to 1000 numbers'; end if;
  if jsonb_array_length(contacts) not between 1 and 1000 then raise exception 'Select 1 to 1000 numbers'; end if;
  perform pg_advisory_xact_lock(hashtextextended(l::text,3));
  for item in select value from jsonb_array_elements(contacts) loop
    if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'name') is distinct from 'string' or jsonb_typeof(item->'phone') is distinct from 'string'
      or length(trim(item->>'name')) not between 1 and 100 or (item->>'phone') !~ '^\+[1-9][0-9]{7,14}$'
      or (item - 'name' - 'phone') <> '{}'::jsonb then raise exception 'Invalid contact'; end if;
    if exists(select 1 from public.workspace_records where workspace_id=w and line_id=l and kind='contact' and body->>'phone'=item->>'phone') then skipped=skipped+1;
    else
      insert into public.workspace_records(workspace_id,line_id,owner_id,kind,body)
      values(w,l,auth.uid(),'contact',jsonb_build_object('name',trim(item->>'name'),'phone',item->>'phone','policy','standard'));
      added=added+1;
    end if;
  end loop;
  return jsonb_build_object('added',added,'skipped',skipped);
end; $$;
revoke all on function public.import_contacts(uuid,uuid,jsonb) from public,anon;
grant execute on function public.import_contacts(uuid,uuid,jsonb) to authenticated;
create index records_contact_phone on public.workspace_records(workspace_id,line_id,(body->>'phone')) where kind='contact';
commit;

begin;
alter table public.workspace_records add constraint record_workspace_id unique(workspace_id,id);
create table public.support_messages (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, ticket_id uuid not null,
  author_id uuid not null default auth.uid() references auth.users(id), body text not null check(length(body) between 1 and 4000), created_at timestamptz not null default now(),
  foreign key(workspace_id,ticket_id) references public.workspace_records(workspace_id,id) on delete cascade
);
alter table public.support_messages enable row level security;
revoke all on public.support_messages from anon,authenticated;
grant select,insert on public.support_messages to authenticated;
create policy reply_read on public.support_messages for select to authenticated using(exists(select 1 from public.workspace_records r where r.id=ticket_id and r.workspace_id=support_messages.workspace_id and r.kind='ticket'));
create policy reply_write on public.support_messages for insert to authenticated with check(author_id=auth.uid() and private.support_access() and exists(select 1 from public.workspace_records r where r.id=ticket_id and r.workspace_id=support_messages.workspace_id and r.kind='ticket'));
commit;

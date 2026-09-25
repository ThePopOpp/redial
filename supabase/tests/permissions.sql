begin;
insert into auth.users values
('00000000-0000-4000-8000-000000000001','owner@example.test',now()),
('00000000-0000-4000-8000-000000000002','adult@example.test',now()),
('00000000-0000-4000-8000-000000000003','other@example.test',now()),
('00000000-0000-4000-8000-000000000004','staff@example.test',now());
create function public.test_assert(ok boolean,label text) returns void language plpgsql as $$ begin if not coalesce(ok,false) then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.create_workspace('Personal','personal') as workspace_a \gset
select id as line_a from public.lines where workspace_id=:'workspace_a' \gset
select public.invite_member(:'workspace_a','adult@example.test','billing');
select public.test_assert((select count(*)=1 from public.lines),'owner sees own line');
insert into public.workspace_records(workspace_id,line_id,kind,body) values(:'workspace_a',:'line_a','contact','{"name":"Private contact","phone":"+16025550101","policy":"standard"}') returning id as record_a \gset
insert into public.workspace_records(workspace_id,kind,body) values(:'workspace_a','ticket','{"subject":"Help","body":"Account help"}') returning id as ticket_a \gset
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.accept_membership(:'workspace_a');
select public.test_assert((select count(*)=0 from public.lines),'billing member has no line access');
select public.test_assert((select count(*)=0 from public.workspace_records),'billing member has no contact or ticket access');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select public.create_workspace('Business','business') as workspace_b \gset
select id as line_b from public.lines where workspace_id=:'workspace_b' \gset
select public.test_assert((select count(*)=1 from public.workspaces),'other tenant sees only own workspace');
select public.test_assert((select count(*)=0 from public.workspace_records),'other tenant cannot read contact');
do $$ begin
  begin update public.memberships set role='owner'; raise exception 'Privilege escalation succeeded'; exception when insufficient_privilege then null; end;
  begin insert into public.platform_staff values(auth.uid(),'admin',true); raise exception 'Staff escalation succeeded'; exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into public.calls(workspace_id,line_id,caller,phone,outcome,summary,started_at) values(:'workspace_a',:'line_a','Caller','+16025550101','message','Private summary',now()) returning id as call_a \gset
insert into public.transcript_segments(workspace_id,line_id,call_id,sequence,speaker,body,expires_at) values(:'workspace_a',:'line_a',:'call_a',0,'Caller','Private transcript',now()+interval '1 day');
insert into public.platform_staff values('00000000-0000-4000-8000-000000000004','support',true);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.set_line_grant(:'workspace_a',:'line_a','00000000-0000-4000-8000-000000000002','read_summary',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.test_assert((select count(*)=1 from public.calls),'summary grant works');
select public.test_assert((select count(*)=0 from public.transcript_segments),'summary grant does not expose transcript');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.set_line_grant(:'workspace_a',:'line_a','00000000-0000-4000-8000-000000000002','read_transcript',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.test_assert((select count(*)=1 from public.transcript_segments),'explicit transcript grant works');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.revoke_membership(:'workspace_a','00000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.test_assert((select count(*)=0 from public.calls),'revocation removes call access');
select public.test_assert((select count(*)=0 from public.transcript_segments),'revocation removes transcript access');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"aal":"aal1","user_metadata":{"role":"admin"}}',true);
select public.test_assert((select count(*)=0 from public.workspace_records),'staff without MFA cannot read support');
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
select public.test_assert((select count(*)=1 from public.workspace_records),'MFA support reads tickets only');
select public.test_assert((select count(*)=0 from public.calls),'MFA support has no call content access');
insert into public.support_messages(workspace_id,ticket_id,body) values(:'workspace_a',:'ticket_a','A staff reply');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.test_assert((select count(*)=1 from public.support_messages),'member can read staff reply to own ticket');
select set_config('test.record',:'record_a',true);
select set_config('test.other_workspace',:'workspace_b',true);
select set_config('test.other_line',:'line_b',true);
do $$ begin
  begin update public.workspace_records set workspace_id=current_setting('test.other_workspace')::uuid,line_id=current_setting('test.other_line')::uuid where id=current_setting('test.record')::uuid; raise exception 'Scope reassignment succeeded'; exception when raise_exception then if sqlerrm<>'Record scope is immutable' then raise; end if; end;
  begin insert into public.support_messages(workspace_id,ticket_id,body) select workspace_id,id,'Forged staff reply' from public.workspace_records where kind='ticket'; raise exception 'Staff impersonation succeeded'; exception when insufficient_privilege then null; end;
end $$;
update public.workspace_records set body='{"name":"Updated"}' where id=:'record_a' and version=1;
select public.test_assert((select version=2 from public.workspace_records where id=:'record_a'),'revision increments');
with stale as (update public.workspace_records set body='{}' where id=:'record_a' and version=1 returning id) select public.test_assert((select count(*)=0 from stale),'stale update cannot overwrite');
select public.test_assert((select count(*)>0 from public.audit_events),'mutations write audit metadata');
select set_config('test.import_workspace',:'workspace_a',true);
select set_config('test.import_line',:'line_a',true);
select public.test_assert((public.import_contacts(:'workspace_a',:'line_a','[{"name":"Import one","phone":"+442071234567"},{"name":"Import two","phone":"+442071234568"}]')->>'added')::int=2,'batch contact import persists selected numbers');
select public.test_assert((public.import_contacts(:'workspace_a',:'line_a','[{"name":"Changed name","phone":"+442071234567"}]')->>'skipped')::int=1,'import retry skips existing contact');
select public.test_assert((select body->>'name'='Import one' from public.workspace_records where body->>'phone'='+442071234567'),'import preserves existing fields');
do $$ begin
  begin
    perform public.import_contacts(current_setting('test.import_workspace')::uuid,current_setting('test.import_line')::uuid,'[{"name":"Must roll back","phone":"+442071234569"},{"name":"Invalid","phone":"911"}]');
    raise exception 'Invalid batch succeeded';
  exception when raise_exception then if sqlerrm<>'Invalid contact' then raise; end if; end;
  begin
    perform public.import_contacts(current_setting('test.import_workspace')::uuid,current_setting('test.other_line')::uuid,'[{"name":"Cross scope","phone":"+442071234569"}]');
    raise exception 'Cross-scope import succeeded';
  exception when raise_exception then if sqlerrm<>'Line permission required' then raise; end if; end;
end $$;
select public.test_assert((select count(*)=0 from public.workspace_records where body->>'phone'='+442071234569'),'invalid batch is atomic');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ begin
  begin perform public.import_contacts(current_setting('test.import_workspace')::uuid,current_setting('test.import_line')::uuid,'[{"name":"Denied","phone":"+442071234569"}]'); raise exception 'Revoked member imported';
  exception when raise_exception then if sqlerrm<>'Line permission required' then raise; end if; end;
end $$;
-- Carrier setup drafts are private intent, never activation evidence.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('test.setup', '{"carrier":"mint","otherCarrier":"","country":"US","device":"Android","model":"Pixel example","os":"Example version","plan":"Prepaid","route":"conditional","condition":"unanswered","sourcePhone":"+16025550149","ownsLine":true,"understandsRouting":true}',true);
select public.test_assert(public.save_line_setup(:'workspace_a',:'line_a',0,current_setting('test.setup')::jsonb)=1,'setup draft saves for line owner');
select public.test_assert((select status='unconfigured' from public.lines where id=:'line_a'),'saving setup cannot activate line');
select public.test_assert(public.save_line_setup(:'workspace_a',:'line_a',1,current_setting('test.setup')::jsonb)=2,'setup draft uses optimistic revisions');
do $$ begin
  begin perform public.save_line_setup(current_setting('test.import_workspace')::uuid,current_setting('test.import_line')::uuid,1,current_setting('test.setup')::jsonb); raise exception 'Stale save succeeded';
  exception when raise_exception then if sqlerrm<>'Setup changed; reload' then raise; end if; end;
  begin perform public.save_line_setup(current_setting('test.import_workspace')::uuid,current_setting('test.import_line')::uuid,2,current_setting('test.setup')::jsonb || '{"verified":true}'); raise exception 'Evidence injection succeeded';
  exception when raise_exception then if sqlerrm<>'Invalid draft' then raise; end if; end;
  begin perform public.save_line_setup(current_setting('test.import_workspace')::uuid,current_setting('test.import_line')::uuid,2,current_setting('test.setup')::jsonb || '{"ownsLine":null}'); raise exception 'Null acknowledgement succeeded';
  exception when raise_exception then if sqlerrm<>'Invalid draft' then raise; end if; end;
  begin update public.line_setup_drafts set version=99; raise exception 'Direct setup mutation succeeded'; exception when insufficient_privilege then null; end;
  begin perform public.save_line_setup(current_setting('test.import_workspace')::uuid,current_setting('test.other_line')::uuid,0,current_setting('test.setup')::jsonb); raise exception 'Cross tenant setup succeeded';
  exception when raise_exception then if sqlerrm<>'Line permission required' then raise; end if; end;
end $$;
select public.invite_member(:'workspace_a','adult@example.test','billing');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.accept_membership(:'workspace_a');
select public.test_assert((select count(*)=0 from public.line_setup_drafts),'billing member cannot read setup or source phone');
select public.test_assert(not public.can_manage_line_setup(:'workspace_a',:'line_a'),'billing member cannot manage setup');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.set_line_grant(:'workspace_a',:'line_a','00000000-0000-4000-8000-000000000002','manage_rules',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.test_assert((select count(*)=1 from public.line_setup_drafts),'explicit line manager can read setup');
select public.test_assert(public.save_line_setup(:'workspace_a',:'line_a',2,current_setting('test.setup')::jsonb)=3,'explicit line manager can update setup');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.revoke_membership(:'workspace_a','00000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.test_assert((select count(*)=0 from public.line_setup_drafts),'revocation removes setup access');
do $$ begin
  begin perform public.save_line_setup(current_setting('test.import_workspace')::uuid,current_setting('test.import_line')::uuid,3,current_setting('test.setup')::jsonb); raise exception 'Revoked member setup succeeded';
  exception when raise_exception then if sqlerrm<>'Line permission required' then raise; end if; end;
end $$;
rollback;

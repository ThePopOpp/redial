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
-- Staff capability model (202609260001)
reset role;
insert into auth.users values('00000000-0000-4000-8000-000000000005','superadmin@example.test',now());
-- The first owner is created by a privileged session, as documented. Everyone
-- after that goes through promote_staff.
insert into public.platform_staff(user_id,role,active) values('00000000-0000-4000-8000-000000000005','owner',true);
set role authenticated;

-- support staff: has support and customer capabilities, not staff administration
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
select public.test_assert((select count(*)=1 from public.staff_capabilities_for_me() where capability='support_read'),'support role carries support_read');
select public.test_assert((select count(*)=0 from public.staff_capabilities_for_me() where capability='staff_admin'),'support role does not carry staff administration');
select public.test_assert((select count(*)>0 from public.staff_customer_search('',50,0)),'support staff can search customers');
select public.test_assert((select count(*)=0 from public.staff_directory()),'support staff cannot list staff');
do $$ begin
  begin perform public.promote_staff('00000000-0000-4000-8000-000000000003','admin',true,null); raise exception 'Support promoted staff';
  exception when raise_exception then if sqlerrm<>'Not permitted' then raise; end if; end;
end $$;

-- the customer projection must never carry call content
select public.test_assert(public.staff_customer_overview(:'workspace_a')::text not like '%Private transcript%','staff customer overview returns no transcript text');
select public.test_assert(public.staff_customer_overview(:'workspace_a')::text not like '%Private summary%','staff customer overview returns no call summary text');
select public.test_assert((select count(*)>0 from public.audit_events where action='staff.customer_viewed'),'staff customer overview writes an audit row');

-- multi-factor authentication is required for every staff projection
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
select public.test_assert((select count(*)=0 from public.staff_capabilities_for_me()),'staff without MFA carries no capabilities');
select public.test_assert((select count(*)=0 from public.staff_customer_search('',50,0)),'staff without MFA cannot search customers');
do $$ begin
  begin perform public.staff_customer_overview(current_setting('test.import_workspace')::uuid); raise exception 'Unverified staff read succeeded';
  exception when raise_exception then if sqlerrm<>'Not permitted' then raise; end if; end;
end $$;

-- a signed-in member is not staff
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
select public.test_assert((select count(*)=0 from public.staff_customer_search('',50,0)),'a member cannot search customers');
select public.test_assert((select count(*)=0 from public.staff_audit_log(100)),'a member cannot read the platform audit log');
do $$ begin
  begin perform public.staff_customer_overview(current_setting('test.import_workspace')::uuid); raise exception 'Member staff read succeeded';
  exception when raise_exception then if sqlerrm<>'Not permitted' then raise; end if; end;
end $$;

-- owner: the only tier that may administer staff, and never on itself
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
select public.test_assert((select count(*)>0 from public.staff_directory()),'owner can list staff');
select public.test_assert((select count(*)>0 from public.staff_audit_log(100)),'owner can read the platform audit log');
do $$ begin
  begin perform public.promote_staff('00000000-0000-4000-8000-000000000005','analyst',true,null); raise exception 'Owner demoted itself';
  exception when raise_exception then if sqlerrm<>'Staff cannot change their own role' then raise; end if; end;
  begin perform public.promote_staff('00000000-0000-4000-8000-000000000003','wizard',true,null); raise exception 'Unknown role accepted';
  exception when raise_exception then if sqlerrm<>'Unknown role' then raise; end if; end;
end $$;
select public.promote_staff('00000000-0000-4000-8000-000000000003','finance',true,'Finance operator');
select public.test_assert((select count(*)=1 from public.staff_directory() where user_id='00000000-0000-4000-8000-000000000003' and role='finance' and active),'owner promotes a verified account');

-- finance sees billing and customers but not ticket content
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select public.test_assert((select count(*)=1 from public.staff_capabilities_for_me() where capability='billing_read'),'finance role carries billing_read');
select public.test_assert((select count(*)=0 from public.staff_capabilities_for_me() where capability='support_read'),'finance role does not carry support_read');
select public.test_assert((select count(*)=0 from public.workspace_records where kind='ticket'),'finance staff cannot read ticket content');

-- the last active owner cannot be removed
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
do $$ begin
  begin perform public.promote_staff('00000000-0000-4000-8000-000000000004','owner',false,null);
    perform public.promote_staff('00000000-0000-4000-8000-000000000005','owner',false,null);
    raise exception 'Last owner removed';
  exception when raise_exception then
    if sqlerrm not in ('At least one active owner must remain','Staff cannot change their own role') then raise; end if; end;
end $$;
select public.test_assert((select count(*)>0 from public.staff_directory() where role='owner' and active),'at least one active owner remains');

-- capability matrix and staff table stay closed to direct access
do $$ begin
  begin perform 1 from public.staff_capabilities; raise exception 'Capability matrix readable'; exception when insufficient_privilege then null; end;
  begin update public.platform_staff set role='owner'; raise exception 'Direct staff mutation succeeded'; exception when insufficient_privilege then null; end;
end $$;

-- Billing, catalog, operations and usage (202609260002)
-- The worker's service role writes provider facts. No member or staff path below
-- is allowed to forge one.
reset role;
insert into public.billing_products(code,name,kind) values('concierge','Concierge','membership') returning id as product_a \gset
insert into public.billing_products(code,name,kind) values('unreleased','Unreleased','membership') returning id as product_draft \gset
insert into public.plan_versions(product_id,version,features,limits,availability,published_at)
  values(:'product_a',1,'{"screening":true}','{"calls":1000}','available',now()) returning id as plan_a \gset
insert into public.plan_versions(product_id,version,features,limits) values(:'product_a',2,'{"screening":true}','{"calls":2000}') returning id as plan_draft \gset
insert into public.plan_versions(product_id,version,features,limits) values(:'product_draft',1,'{}','{}');
insert into public.prices(plan_version_id,cadence,currency,amount_minor,availability,square_plan_variation_id)
  values(:'plan_a','monthly','USD',1200,'available','VARIATIONEXAMPLE');
insert into public.prices(plan_version_id,cadence,currency,amount_minor) values(:'plan_draft','monthly','USD',1500);
insert into public.billing_customers(workspace_id,source,environment,provider_customer_id)
  values(:'workspace_a','square','sandbox','SQCUSTEXAMPLE');
insert into public.subscriptions(workspace_id,plan,status,source,environment,plan_version_id,
                                 provider_subscription_id,provider_status,current_period_start,current_period_end)
  values(:'workspace_a','Concierge','active','square','sandbox',:'plan_a','SQSUBEXAMPLE','ACTIVE',now()-interval '1 day',now()+interval '29 days');
insert into public.invoices(workspace_id,source,environment,provider_invoice_id,status,currency,total_minor,amount_paid_minor,issued_at,paid_at)
  values(:'workspace_a','square','sandbox','SQINVEXAMPLE','paid','USD',1200,1200,now(),now()) returning id as invoice_a \gset
insert into public.payments(workspace_id,invoice_id,source,environment,provider_payment_id,status,currency,amount_minor,fee_minor,card_brand,card_last_four,settled_at)
  values(:'workspace_a',:'invoice_a','square','sandbox','SQPAYEXAMPLE','completed','USD',1200,59,'VISA','4242',now()) returning id as payment_a \gset
insert into public.disputes(workspace_id,payment_id,source,environment,provider_dispute_id,state,currency,amount_minor)
  values(:'workspace_a',:'payment_a','square','sandbox','SQDISPEXAMPLE','inquiry','USD',1200);
insert into public.entitlements(workspace_id,feature,limit_value,source) values(:'workspace_a','screening.calls',1000,'plan');
insert into public.usage_windows(workspace_id,meter,period_start,period_end,included_quantity,consumed_quantity)
  values(:'workspace_a','screened_calls',date_trunc('day',now()),date_trunc('day',now())+interval '30 days',1000,12) returning id as window_a \gset
insert into public.usage_events(workspace_id,line_id,call_id,meter,unit,quantity,dedup_key,occurred_at)
  values(:'workspace_a',:'line_a',:'call_a','screened_calls','call',1,'dedup-example-0001',now());
insert into public.usage_reservations(workspace_id,window_id,quantity,expires_at,dedup_key)
  values(:'workspace_a',:'window_a',1,now()+interval '10 minutes','reserve-example-0001');
insert into public.checkout_operations(workspace_id,actor_id,idempotency_key,request_hash,quote,terms_version,quote_expires_at)
  values(:'workspace_a','00000000-0000-4000-8000-000000000001','checkout-key-0001',repeat('a',64),'{"amount_minor":1200}','2026-09-01',now()+interval '1 hour');
insert into public.billing_operations(workspace_id,kind,idempotency_key,request) values(:'workspace_a','reconcile','oper-key-0001','{}');
insert into public.webhook_inbox(provider,environment,external_event_id,event_type,payload,signature_verified)
  values('square','sandbox','evt-example-0001','invoice.payment_made','{"ok":true}',true);
insert into public.job_runs(job,run_key,lease_owner,lease_expires_at) values('billing.reconcile','2026-09-26','worker-1',now()+interval '5 minutes');
select set_config('test.payment',:'payment_a',true);
select set_config('test.plan',:'plan_a',true);

-- Money constraints the database refuses to break.
do $$ begin
  begin insert into public.prices(plan_version_id,cadence,currency,amount_minor)
    values(current_setting('test.plan')::uuid,'free','USD',500); raise exception 'Priced free cadence accepted';
  exception when check_violation then null; end;
  begin insert into public.prices(plan_version_id,cadence,currency,amount_minor,square_plan_variation_id)
    values(current_setting('test.plan')::uuid,'annual','USD',50,'TOOCHEAP'); raise exception 'Sub-minimum provider price accepted';
  exception when check_violation then null; end;
  begin insert into public.usage_events(workspace_id,meter,unit,quantity,dedup_key,occurred_at)
    values(current_setting('test.import_workspace')::uuid,'screened_calls','call',1,'dedup-example-0001',now());
    raise exception 'Replayed usage event counted twice';
  exception when unique_violation then null; end;
  begin insert into public.webhook_inbox(provider,environment,external_event_id,event_type,payload)
    values('square','sandbox','evt-example-0001','invoice.payment_made','{}');
    raise exception 'Replayed webhook accepted twice';
  exception when unique_violation then null; end;
end $$;

-- The catalog is published, not merely present. Anonymous visitors see exactly
-- what has been approved for sale and nothing that is still a draft.
set role anon;
select public.test_assert((select count(*)=1 from public.prices),'anonymous sees only a published price');
select public.test_assert((select count(*)=1 from public.plan_versions),'anonymous sees only a published plan version');
select public.test_assert((select count(*)=1 from public.billing_products),'a product without a published price is not public');
do $$ begin
  begin perform 1 from public.invoices; raise exception 'Anonymous read invoices'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.subscriptions; raise exception 'Anonymous read subscriptions'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.entitlements; raise exception 'Anonymous read entitlements'; exception when insufficient_privilege then null; end;
end $$;

-- A workspace owner holds the billing relationship.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
select public.test_assert((select count(*)=1 from public.prices),'a signed-in member sees only a published price');
select public.test_assert((select count(*)=1 from public.invoices),'workspace owner reads own invoices');
select public.test_assert((select count(*)=1 from public.payments),'workspace owner reads own payments');
select public.test_assert((select count(*)=1 from public.usage_windows),'workspace owner reads aggregate usage');
select public.test_assert((select count(*)=1 from public.entitlements),'workspace owner reads entitlements');
select public.test_assert((select card_brand='VISA' and card_last_four='4242' from public.payments),'a payment carries brand and last four only');
select public.test_assert((select count(*)=1 from public.checkout_operations),'the buyer reads their own checkout operation');

-- Provider identity, risk cases, per-call meters and worker leases are closed to
-- every signed-in session, however privileged inside its own workspace.
do $$ begin
  begin perform 1 from public.billing_customers; raise exception 'Provider customer identity readable'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.disputes; raise exception 'Dispute case readable'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.billing_operations; raise exception 'Billing operation ledger readable'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.usage_events; raise exception 'Per-call usage readable'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.usage_reservations; raise exception 'Usage reservation readable'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.webhook_inbox; raise exception 'Webhook inbox readable'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.job_runs; raise exception 'Job run readable'; exception when insufficient_privilege then null; end;
  begin insert into public.invoices(workspace_id,source,environment,provider_invoice_id,status,currency,total_minor)
    values(current_setting('test.import_workspace')::uuid,'square','sandbox','FORGED','unpaid','USD',0);
    raise exception 'Member forged an invoice'; exception when insufficient_privilege then null; end;
  begin update public.subscriptions set status='active'; raise exception 'Member set own subscription state'; exception when insufficient_privilege then null; end;
  begin update public.entitlements set limit_value=999999; raise exception 'Member widened own entitlement'; exception when insufficient_privilege then null; end;
  begin update public.usage_windows set consumed_quantity=0; raise exception 'Member reset own usage'; exception when insufficient_privilege then null; end;
  begin insert into public.billing_products(code,name,kind) values('forged','Forged','membership'); raise exception 'Member published a product'; exception when insufficient_privilege then null; end;
end $$;

-- An ordinary member knows what the workspace may do, not what it costs.
select public.invite_member(:'workspace_a','adult@example.test','member');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.accept_membership(:'workspace_a');
select public.test_assert((select count(*)=1 from public.entitlements),'ordinary member reads what the workspace may do');
select public.test_assert((select count(*)=0 from public.invoices),'ordinary member cannot read invoices');
select public.test_assert((select count(*)=0 from public.payments),'ordinary member cannot read payments');
select public.test_assert((select count(*)=0 from public.refunds),'ordinary member cannot read refunds');
select public.test_assert((select count(*)=0 from public.usage_windows),'ordinary member cannot read aggregate usage');
select public.test_assert((select count(*)=0 from public.checkout_operations),'a member cannot read another member''s checkout');

-- Another tenant sees none of it, staff role or not, without a capability.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select public.test_assert((select count(*)=0 from public.invoices),'other tenant cannot read invoices');
select public.test_assert((select count(*)=0 from public.payments),'other tenant cannot read payments');
select public.test_assert((select count(*)=0 from public.entitlements),'other tenant cannot read entitlements');
select public.test_assert((select count(*)=0 from public.usage_windows),'other tenant cannot read usage');
select public.test_assert(public.staff_billing_overview() is null,'staff without MFA get no billing overview');

-- Finance holds billing_read and billing_write; support holds neither.
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
select public.test_assert((public.staff_billing_overview()->>'invoices_unpaid')::int=0,'finance reads the platform billing overview');
select public.test_assert((public.staff_billing_overview()->>'mrr_minor')::bigint=1200,'monthly recurring value counts the active subscription');
select public.test_assert(jsonb_array_length(public.staff_workspace_billing(:'workspace_a')->'invoices')=1,'finance reads one workspace billing record');
select public.test_assert(public.staff_workspace_billing(:'workspace_a')::text not like '%SQSUBEXAMPLE%','billing projection hides the provider subscription handle');
select public.test_assert((select count(*)>0 from public.audit_events where action='staff.billing_viewed'),'reading a billing record writes an audit row');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
select public.test_assert(public.staff_billing_overview() is null,'support staff get no billing overview');
select public.test_assert(public.staff_customer_overview(:'workspace_a')::text not like '%SQSUBEXAMPLE%','customer overview hides the provider subscription handle');
do $$ begin
  begin perform public.staff_workspace_billing(current_setting('test.import_workspace')::uuid); raise exception 'Support read a billing record';
  exception when raise_exception then if sqlerrm<>'Not permitted' then raise; end if; end;
  begin perform public.request_refund(current_setting('test.import_workspace')::uuid,current_setting('test.payment')::uuid,100,'Support attempt','refund-key-000a');
    raise exception 'Support requested a refund';
  exception when raise_exception then if sqlerrm<>'Not permitted' then raise; end if; end;
end $$;

-- Requesting a refund and approving one are separate capabilities. Both are read
-- back through the audited projection, because staff are not members of this
-- workspace and the refunds table itself stays closed to them.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select public.request_refund(:'workspace_a',:'payment_a',400,'Duplicate charge','refund-key-0001') as refund_a \gset
select set_config('test.refund',:'refund_a',true);
select public.test_assert((select count(*)=0 from public.refunds),'finance cannot read the refunds table directly');
select public.test_assert((select count(*)=1 from jsonb_array_elements(public.staff_workspace_billing(:'workspace_a')->'refunds') r
  where r->>'status'='requested' and r->>'approved_by' is null),'a requested refund is not yet approved');
do $$ begin
  begin perform public.request_refund(current_setting('test.import_workspace')::uuid,current_setting('test.payment')::uuid,900,'Over balance','refund-key-0002');
    raise exception 'Refund exceeded the unrefunded balance';
  exception when raise_exception then if sqlerrm<>'Refund exceeds unrefunded balance' then raise; end if; end;
  begin perform public.approve_refund(current_setting('test.refund')::uuid); raise exception 'Finance approved a refund';
  exception when raise_exception then if sqlerrm<>'Not permitted' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
select public.approve_refund(:'refund_a');
select public.test_assert((select count(*)=1 from jsonb_array_elements(public.staff_workspace_billing(:'workspace_a')->'refunds') r
  where r->>'status'='approved' and r->>'approved_by'='00000000-0000-4000-8000-000000000005'),'an owner approves a refund another operator requested');
select public.test_assert((select count(*)>0 from public.audit_events where action='billing.refund_approved'),'refund approval is audited');
select public.request_refund(:'workspace_a',:'payment_a',100,'Owner request','refund-key-0003') as refund_b \gset
select set_config('test.refund_b',:'refund_b',true);
do $$ begin
  begin perform public.approve_refund(current_setting('test.refund_b')::uuid); raise exception 'Owner approved its own refund request';
  exception when raise_exception then if sqlerrm<>'Staff cannot approve their own refund request' then raise; end if; end;
end $$;

-- The worker's own role is the only path to provider identity and plumbing.
reset role;
select public.test_assert((select count(*)=1 from public.billing_customers),'the worker role reads provider customer identity');
select public.test_assert((select count(*)=1 from public.disputes),'the worker role reads dispute cases');
select public.test_assert((select count(*)=1 from public.usage_events),'the worker role reads per-call usage');
select public.test_assert((select count(*)=1 from public.usage_reservations),'the worker role reads usage reservations');
select public.test_assert((select count(*)=1 from public.webhook_inbox),'the worker role reads the webhook inbox');
select public.test_assert((select count(*)=1 from public.job_runs),'the worker role reads job runs');
select public.test_assert((select count(*)=2 from public.billing_operations),'the worker role reads the billing operation ledger');
select public.test_assert((select count(*)=1 from public.billing_operations where kind='refund'),'only the approved refund queued a provider operation');

-- Voice routing (202609260003)
-- The gateway's service role writes provider facts and call state. No member
-- path may forge a number, a destination or a screening outcome.
reset role;
insert into public.phone_numbers(workspace_id,line_id,e164,provider,environment,provider_sid,ownership,status)
  values(:'workspace_a',:'line_a','+16025550100','twilio','test','PN0123456789abcdef0123456789abcdef','redial_allocated','active') returning id as number_a \gset
insert into public.endpoints(workspace_id,line_id,kind,e164,label,is_forwarding_source,verified_at)
  values(:'workspace_a',:'line_a','pstn','+16025550122','My mobile',true,now());
insert into public.endpoints(workspace_id,line_id,kind,e164,label,ring_order,verified_at)
  values(:'workspace_a',:'line_a','pstn','+16025550133','Desk phone',2,now()) returning id as endpoint_a \gset
insert into public.line_routing(line_id,workspace_id,mode,greeting) values(:'line_a',:'workspace_a','simple','Who is calling?');
insert into public.call_screenings(workspace_id,line_id,provider_call_sid,from_e164,to_e164,mode,caller_said)
  values(:'workspace_a',:'line_a','CA0123456789abcdef0123456789abcdef','+16025550111','+16025550100','simple','Jane about the roof');
select set_config('test.line',:'line_a',true);

-- Loop prevention lives in the database, not only in the gateway.
do $$ begin
  begin insert into public.endpoints(workspace_id,line_id,kind,e164,label,verified_at)
    values(current_setting('test.import_workspace')::uuid,current_setting('test.line')::uuid,'pstn','+16025550122','Loop back',now());
    raise exception 'Forwarding source accepted as a destination';
  exception when raise_exception then if sqlerrm<>'Destination is the forwarding source' then raise; end if; end;
  begin insert into public.endpoints(workspace_id,line_id,kind,e164,label,verified_at)
    values(current_setting('test.import_workspace')::uuid,current_setting('test.line')::uuid,'pstn','+16025550100','Our own number',now());
    raise exception 'Redial number accepted as a destination';
  exception when raise_exception then if sqlerrm<>'Destination is the Redial number for this line' then raise; end if; end;
  -- Two lines answering one number would route by luck.
  begin insert into public.phone_numbers(workspace_id,line_id,e164,provider,environment,ownership,status)
    values(current_setting('test.other_workspace')::uuid,current_setting('test.other_line')::uuid,'+16025550100','twilio','test','redial_allocated','active');
    raise exception 'Duplicate active number accepted';
  exception when unique_violation then null; end;
  -- An assistant mode with no assistant would connect a caller to nothing.
  begin insert into public.line_routing(line_id,workspace_id,mode)
    values(current_setting('test.other_line')::uuid,current_setting('test.other_workspace')::uuid,'ai');
    raise exception 'AI mode without a SIP assistant accepted';
  exception when check_violation then null; end;
  begin insert into public.endpoints(workspace_id,line_id,kind,e164,label,verified_at)
    values(current_setting('test.import_workspace')::uuid,current_setting('test.line')::uuid,'pstn','6025550144','Not E164',now());
    raise exception 'Non-E.164 destination accepted';
  exception when check_violation then null; end;
end $$;

-- The line owner manages routing through the same grant that governs the rules.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
select public.test_assert((select count(*)=1 from public.phone_numbers),'line owner reads the number for their line');
select public.test_assert((select count(*)=2 from public.endpoints),'line owner reads their destinations');
select public.test_assert((select count(*)=1 from public.line_routing),'line owner reads how the line answers');
select public.test_assert((select count(*)=1 from public.call_screenings),'line owner reads screened calls');
do $$ begin
  begin insert into public.phone_numbers(workspace_id,line_id,e164,provider,environment,ownership)
    values(current_setting('test.import_workspace')::uuid,current_setting('test.line')::uuid,'+16025550155','twilio','test','redial_allocated');
    raise exception 'Member claimed a number'; exception when insufficient_privilege then null; end;
  begin insert into public.endpoints(workspace_id,line_id,kind,e164,label,verified_at)
    values(current_setting('test.import_workspace')::uuid,current_setting('test.line')::uuid,'pstn','+16025550166','Forged',now());
    raise exception 'Member added a destination directly'; exception when insufficient_privilege then null; end;
  -- Self-verifying a destination would turn screening into a dialer for
  -- someone else's traffic.
  begin update public.endpoints set verified_at=now(); raise exception 'Member verified a destination';
    exception when insufficient_privilege then null; end;
  begin update public.line_routing set mode='ai'; raise exception 'Member changed the answering mode';
    exception when insufficient_privilege then null; end;
  begin update public.call_screenings set outcome='connected'; raise exception 'Member rewrote a call outcome';
    exception when insufficient_privilege then null; end;
end $$;

-- A member of the same workspace without the line grant sees none of it.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.test_assert((select count(*)=0 from public.phone_numbers),'member without the line grant cannot read the number');
select public.test_assert((select count(*)=0 from public.endpoints),'member without the line grant cannot read destinations');
select public.test_assert((select count(*)=0 from public.line_routing),'member without the line grant cannot read routing');
select public.test_assert((select count(*)=0 from public.call_screenings),'member without the line grant cannot read screened calls');

-- Another tenant sees none of it either.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select public.test_assert((select count(*)=0 from public.phone_numbers),'other tenant cannot read the number');
select public.test_assert((select count(*)=0 from public.endpoints),'other tenant cannot read destinations');
select public.test_assert((select count(*)=0 from public.call_screenings),'other tenant cannot read screened calls');

-- A summary grant exposes the screened call but not the rules behind it.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.set_line_grant(:'workspace_a',:'line_a','00000000-0000-4000-8000-000000000002','read_summary',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.test_assert((select count(*)=1 from public.call_screenings),'a summary grant exposes screened calls');
select public.test_assert((select count(*)=0 from public.line_routing),'a summary grant does not expose routing');
select public.test_assert((select count(*)=0 from public.endpoints),'a summary grant does not expose destinations');

-- Anonymous reaches none of it.
set role anon;
do $$ begin
  begin perform 1 from public.phone_numbers; raise exception 'Anonymous read numbers'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.endpoints; raise exception 'Anonymous read destinations'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.line_routing; raise exception 'Anonymous read routing'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.call_screenings; raise exception 'Anonymous read screened calls'; exception when insufficient_privilege then null; end;
end $$;

-- The gateway's own role is the only path that writes call state.
reset role;
select public.test_assert((select count(*)=1 from public.call_screenings where outcome='screening'),'the gateway role reads and writes call state');
select public.test_assert((select count(*)=1 from public.phone_numbers where status='active'),'the gateway role resolves the dialled number');

-- The backend role the worker and the voice gateway connect as (202610010001).
-- Dropping and recreating the public schema deleted the default privileges that
-- normally grant it, so every table created afterwards was unreachable by the
-- backend while still looking correct to a member. The gateway answered a real
-- call with "something went wrong" and Postgres logged "permission denied for
-- table phone_numbers". These assertions are what should have caught it.
set role service_role;
select public.test_assert((select count(*)=1 from public.phone_numbers),'the backend role resolves a dialled number');
select public.test_assert((select count(*)>0 from public.endpoints),'the backend role reads destinations');
select public.test_assert((select count(*)=1 from public.line_routing),'the backend role reads how a line answers');
select public.test_assert((select count(*)=1 from public.call_screenings),'the backend role reads call state');
select public.test_assert((select count(*)=1 from public.webhook_inbox),'the backend role reads the webhook inbox');
select public.test_assert((select count(*)=1 from public.billing_customers),'the backend role reads provider customer identity');
select public.test_assert((select count(*)=1 from public.usage_events),'the backend role reads per-call usage');
-- It writes as well as reads: the gateway records a call before the caller
-- hears anything.
insert into public.call_screenings(workspace_id,line_id,provider_call_sid,from_e164,to_e164,mode)
  values(current_setting('test.import_workspace')::uuid,current_setting('test.line')::uuid,
         'CAffffffffffffffffffffffffffffffff','+16025550199','+16025550100','simple');
select public.test_assert((select count(*)=2 from public.call_screenings),'the backend role records a call in flight');
-- Every table in public must be reachable by it, so a future migration that
-- forgets cannot reintroduce this.
select coalesce(string_agg(c.relname, ' ' order by c.relname), '') as unreadable_by_backend
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and not has_table_privilege('service_role', c.oid, 'SELECT') \gset
-- Passing the oid avoids resolving a table name through the search path, and
-- names every offender rather than only counting them.
select public.test_assert(:'unreadable_by_backend' = '',
  'every public table is readable by the backend role');
reset role;


-- =====================================================================
-- Call logs, recordings and transcription (202610020001)
-- =====================================================================
-- The point of these is the consent guard. twiml.mjs already emits
-- record="record-from-answer-dual" whenever a line sets recording_enabled, so
-- before this migration a single UPDATE started two-party capture at the
-- provider with nothing on this side holding a reference, a consent record or a
-- deletion deadline. Several assertions below exist to prove the backend role
-- cannot do it either.
reset role;
insert into auth.users values('00000000-0000-4000-8000-000000000006','listener@example.test',now());
select set_config('test.cw',:'workspace_a',true);
select set_config('test.cl',:'line_a',true);
select set_config('test.ccall',:'call_a',true);

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.invite_member(:'workspace_a','listener@example.test','member');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
select public.accept_membership(:'workspace_a');

-- Capture is refused until consent exists, by the owner's own RPC ...
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
  begin
    perform public.set_capture_enabled(current_setting('test.cw')::uuid,
      current_setting('test.cl')::uuid,'call_recording',true);
  exception when others then raise notice 'PASS: recording cannot be enabled before consent'; return; end;
  raise exception 'FAIL: recording was enabled with no consent record';
end $$;

-- ... and by the trigger, for the backend role. service_role carries bypassrls,
-- which skips policies and not triggers, so this is the assertion that proves
-- the gateway and the worker are held to it as well.
reset role;
set role service_role;
do $$ begin
  begin
    update public.line_routing set recording_enabled=true
      where line_id=current_setting('test.cl')::uuid;
  exception when check_violation then raise notice 'PASS: the backend role cannot enable recording without consent'; return; end;
  raise exception 'FAIL: the backend role enabled recording with no consent record';
end $$;
reset role;

-- Only the line owner. Not a workspace administrator and not the billing owner:
-- the access matrix gives neither call content by default, and enabling
-- recording is a legal decision about that line's calls.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
do $$ begin
  begin
    perform public.record_capture_consent(current_setting('test.cw')::uuid,
      current_setting('test.cl')::uuid,'call_recording',true,'v1','Attempted by a plain member');
  exception when others then raise notice 'PASS: only the line owner records consent'; return; end;
  raise exception 'FAIL: a plain member recorded capture consent';
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.record_capture_consent(:'workspace_a',:'line_a','call_recording',true,'v1','Owner confirmed the announcement is played') as consent_a \gset
select public.set_capture_enabled(:'workspace_a',:'line_a','call_recording',true);
select public.test_assert((select recording_enabled from public.line_routing where line_id=:'line_a'),
  'recording turns on once consent is recorded');

-- Withdrawal stops the capture rather than merely recording a preference.
select public.record_capture_consent(:'workspace_a',:'line_a','call_recording',false,'v1','Owner withdrew consent');
select public.test_assert((select not recording_enabled from public.line_routing where line_id=:'line_a'),
  'withdrawing consent stops recording immediately');

-- Transcription is its own decision; a recording consent must not carry it.
do $$ begin
  begin
    perform public.set_capture_enabled(current_setting('test.cw')::uuid,
      current_setting('test.cl')::uuid,'call_transcription',true);
  exception when others then raise notice 'PASS: recording consent does not imply transcription'; return; end;
  raise exception 'FAIL: transcription was enabled under a recording consent';
end $$;

select public.record_capture_consent(:'workspace_a',:'line_a','call_recording',true,'v1','Owner reinstated consent') as consent_b \gset

-- A recording row cannot exist without the consent it was captured under.
reset role;
do $$ begin
  begin
    insert into public.recordings(workspace_id,line_id,call_id,provider_recording_sid,
      duration_seconds,consent_event_id,retention_deadline)
      values(current_setting('test.cw')::uuid,current_setting('test.cl')::uuid,
        current_setting('test.ccall')::uuid,'RE'||repeat('b',32),10,null,now()+interval '30 days');
  exception when others then raise notice 'PASS: a recording cannot be stored without consent'; return; end;
  raise exception 'FAIL: a recording was stored with no consent reference';
end $$;
insert into public.recordings(workspace_id,line_id,call_id,provider_recording_sid,
  duration_seconds,consent_event_id,retention_deadline)
  values(:'workspace_a',:'line_a',:'call_a','RE'||repeat('a',32),42,:'consent_b',now()+interval '30 days')
  returning id as recording_a \gset
select set_config('test.crecording',:'recording_a',true);

-- Audio needs its own grant. read_transcript must never reach it: a written
-- record and a voice recording are different disclosures.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.set_line_grant(:'workspace_a',:'line_a','00000000-0000-4000-8000-000000000006','read_summary',true);
select public.set_line_grant(:'workspace_a',:'line_a','00000000-0000-4000-8000-000000000006','read_transcript',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
select public.test_assert((select count(*)=1 from public.calls),'the call log follows read_summary');
select public.test_assert((select count(*)=0 from public.recordings),
  'a transcript grant does not expose the recording');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.set_line_grant(:'workspace_a',:'line_a','00000000-0000-4000-8000-000000000006','read_recording',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
select public.test_assert((select count(*)=1 from public.recordings),'an explicit recording grant works');

-- Whether a line is recorded is a rules question, so consent history follows
-- manage_rules. Knowing a call happened is not knowing whether it was recorded.
select public.test_assert((select count(*)=0 from public.consent_events),
  'reading recordings does not expose the consent history');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.set_line_grant(:'workspace_a',:'line_a','00000000-0000-4000-8000-000000000006','manage_rules',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
select public.test_assert((select count(*)>0 from public.consent_events),'the rules grant reads consent history');

-- Retention is enforced at read time as well as by the purge, so a recording
-- past its deadline is unreadable whether or not the sweep has run.
reset role;
update public.recordings set retention_deadline=now()-interval '1 second' where id=:'recording_a';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
select public.test_assert((select count(*)=0 from public.recordings),
  'a recording past its retention deadline is unreadable');
reset role;
update public.recordings set retention_deadline=now()+interval '30 days',
  deletion_state='deleted', deleted_at=now() where id=:'recording_a';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
select public.test_assert((select count(*)=0 from public.recordings),
  'a deleted recording stays unreadable inside its retention window');
reset role;
update public.recordings set deletion_state='retained', deleted_at=null where id=:'recording_a';

-- deleted_at and the deletion state cannot disagree.
do $$ begin
  begin
    update public.recordings set deletion_state='deleted', deleted_at=null
      where id=current_setting('test.crecording')::uuid;
  exception when check_violation then raise notice 'PASS: a deletion cannot be claimed without its timestamp'; return; end;
  raise exception 'FAIL: a recording was marked deleted with no deletion time';
end $$;

-- Another tenant sees none of it.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select public.test_assert((select count(*)=0 from public.recordings),'another tenant cannot read recordings');
select public.test_assert((select count(*)=0 from public.consent_events),'another tenant cannot read consent history');
select public.test_assert((select count(*)=0 from public.recording_access_events),'another tenant cannot read recording access');

-- Revoking membership takes the audio with it.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.revoke_membership(:'workspace_a','00000000-0000-4000-8000-000000000006');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',true);
select public.test_assert((select count(*)=0 from public.recordings),'revoking membership removes recording access');
reset role;

-- ---------------------------------------------------------------------------
-- Account types and deposits
-- ---------------------------------------------------------------------------
-- The catalog is a staff surface. A member with billing access to their own
-- workspace still has no say in what anything costs.
set role authenticated;
select set_config('test.workspace_a',:'workspace_a',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{}',true);
do $$ begin
  begin perform public.create_billing_product('member_made','Member made','membership');
    raise exception 'A member created a product';
  exception when raise_exception then if sqlerrm<>'Not permitted' then raise; end if; end;
end $$;
select public.test_assert(public.staff_catalog() is null,'a member cannot read the staff catalog');

-- Support staff can read billing but must not set prices: catalog_write is a
-- separate grant from billing_read on purpose.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
do $$ begin
  begin perform public.create_billing_product('support_made','Support made','membership');
    raise exception 'Support staff created a product';
  exception when raise_exception then if sqlerrm<>'Not permitted' then raise; end if; end;
end $$;

-- The platform owner holds catalog_write and can build a plan.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
select public.test_assert((select count(*)=1 from public.staff_capabilities_for_me() where capability='catalog_write'),'owner role carries catalog_write');
select public.create_billing_product('estate_managed','Estate Managed','membership') as catalog_product \gset
select public.create_plan_version(:'catalog_product','{"screening":true}','{"lines":1}') as catalog_plan \gset
select public.set_plan_price(:'catalog_plan','monthly','USD',1200,null) as catalog_price \gset
select set_config('test.catalog_plan',:'catalog_plan',true);
select set_config('test.catalog_price',:'catalog_price',true);

-- A price cannot be offered before the plan it prices.
do $$ begin
  begin perform public.publish_price(current_setting('test.catalog_price')::uuid);
    raise exception 'A price was published ahead of its plan';
  exception when raise_exception then if sqlerrm<>'Publish the plan version before its price' then raise; end if; end;
end $$;
select public.publish_plan_version(:'catalog_plan');
select public.publish_price(:'catalog_price');

-- What a subscriber was sold cannot be rewritten underneath them. Asserted
-- against a privileged writer: `authenticated` holds no UPDATE on the catalog
-- at all, so this proves the trigger and not just the missing grant.
reset role;
do $$ begin
  begin update public.plan_versions set features='{"screening":false}' where id=current_setting('test.catalog_plan')::uuid;
    raise exception 'A published plan version was edited';
  exception when check_violation then raise notice 'PASS: a published plan version is immutable'; end;
end $$;
do $$ begin
  begin update public.prices set amount_minor=9900 where id=current_setting('test.catalog_price')::uuid;
    raise exception 'A published price was edited';
  exception when check_violation then raise notice 'PASS: a published price is immutable'; end;
end $$;
do $$ begin
  begin update public.plan_versions set availability='draft' where id=current_setting('test.catalog_plan')::uuid;
    raise exception 'A published plan returned to draft';
  exception when check_violation then raise notice 'PASS: a published plan cannot return to draft'; end;
end $$;

set role authenticated;
-- Deposits. A staff adjustment is capability-gated and must carry a reason.
select public.adjust_workspace_credit(:'workspace_a',5000,'USD','Opening deposit','deposit-key-0001') as catalog_credit \gset
select set_config('test.catalog_credit',:'catalog_credit',true);
-- Staff wrote the entry but are not a billing member of this workspace, so the
-- member-facing balance refuses them too. Staff read balances through their own
-- projection, not through this one.
select public.test_assert(public.workspace_credit_balance(:'workspace_a') is null,'staff do not read a balance through the member function');
do $$ begin
  begin perform public.adjust_workspace_credit(current_setting('test.workspace_a')::uuid,100,'USD','Replay','deposit-key-0001');
    raise exception 'A duplicate idempotency key was accepted';
  exception when unique_violation then raise notice 'PASS: a replayed credit entry is refused'; end;
end $$;

-- The balance is the refundable amount: an account cannot be overdrawn.
do $$ begin
  begin perform public.adjust_workspace_credit(current_setting('test.workspace_a')::uuid,-6000,'USD','Over','deposit-key-0002');
    raise exception 'The credit balance went negative';
  exception when check_violation then raise notice 'PASS: the credit balance cannot go negative'; end;
end $$;

-- One currency per account; summing mixed currencies is not a balance.
do $$ begin
  begin perform public.adjust_workspace_credit(current_setting('test.workspace_a')::uuid,100,'GBP','Mixed','deposit-key-0003');
    raise exception 'A second currency was accepted';
  exception when check_violation then raise notice 'PASS: an account holds one currency'; end;
end $$;

-- The ledger is append-only, including for the role that bypasses policies.
reset role;
do $$ begin
  begin update public.credit_entries set amount_minor=1 where id=current_setting('test.catalog_credit')::uuid;
    raise exception 'A ledger entry was edited';
  exception when check_violation then raise notice 'PASS: the credit ledger refuses an edit'; end;
end $$;
do $$ begin
  begin delete from public.credit_entries where id=current_setting('test.catalog_credit')::uuid;
    raise exception 'A ledger entry was deleted';
  exception when check_violation then raise notice 'PASS: the credit ledger refuses a delete'; end;
end $$;

-- The member sees their own deposit; another tenant sees none of it.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{}',true);
select public.test_assert((select count(*)=1 from public.credit_entries),'the billing owner reads their own credit ledger');
select public.test_assert(public.workspace_credit_balance(:'workspace_a')=5000,'a deposit raises the credit balance');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select public.test_assert((select count(*)=0 from public.credit_entries),'another tenant cannot read the credit ledger');
-- The balance function takes a workspace id, so it has to re-check the caller:
-- a policy on the table does not constrain a security-definer function.
select public.test_assert(public.workspace_credit_balance(:'workspace_a') is null,'another tenant cannot read the credit balance');
reset role;

-- ---------------------------------------------------------------------------
-- A one-party recording basis
-- ---------------------------------------------------------------------------
-- The owner can rely on a one-party jurisdiction instead of the other party's
-- agreement, and the row says which it is rather than recording a disclosure
-- that never happened.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{}',true);
select set_config('test.line_a',:'line_a',true);
select public.record_one_party_basis(:'workspace_a',:'line_a','call_recording','US-AZ','Arizona one-party, owner is a party to the call') as basis_a \gset
select set_config('test.basis_a',:'basis_a',true);
select public.test_assert((select legal_basis='one_party_recording' and channel='no_disclosure' and jurisdiction='US-AZ'
  from public.consent_events where id=:'basis_a'),'a one-party basis claims no disclosure');

-- It is a basis, so it satisfies the capture guard the same way consent does.
select public.set_capture_enabled(:'workspace_a',:'line_a','call_recording',true);
select public.test_assert((select recording_enabled from public.line_routing where workspace_id=:'workspace_a' and line_id=:'line_a'),'a one-party basis enables recording');

-- And it is still revocable: a withdrawal is a newer row, and the trigger turns
-- the capture off rather than recording a preference about it.
select public.record_capture_consent(:'workspace_a',:'line_a','call_recording',false,'v1','Withdrawn by the owner');
select public.test_assert((select not recording_enabled from public.line_routing where workspace_id=:'workspace_a' and line_id=:'line_a'),'withdrawing after a one-party basis stops the capture');

-- A jurisdiction is not optional: the basis is a claim about a place's law.
do $$ begin
  begin perform public.record_one_party_basis(current_setting('test.workspace_a')::uuid,current_setting('test.line_a')::uuid,'call_recording',null,'No place');
    raise exception 'A basis was recorded with no jurisdiction';
  exception when raise_exception then if sqlerrm not like 'Give the jurisdiction%' then raise; end if; end;
end $$;

-- The shape constraint holds against a privileged writer too: a one-party row
-- cannot claim an announcement, and a consent row cannot carry a jurisdiction.
reset role;
do $$ begin
  begin update public.consent_events set channel='ivr_announcement' where id=current_setting('test.basis_a')::uuid;
    raise exception 'A one-party basis claimed a disclosure';
  exception when check_violation then raise notice 'PASS: a one-party basis cannot claim a disclosure'; end;
end $$;
set role authenticated;

-- Another tenant still sees none of it.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select public.test_assert((select count(*)=0 from public.consent_events),'another tenant cannot read a recording basis');
reset role;

-- ---------------------------------------------------------------------------
-- AI screening
-- ---------------------------------------------------------------------------
-- Sending what a caller says to a model is its own disclosure. Agreeing to a
-- recording is not agreeing to that, so the third purpose has its own basis.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{}',true);
do $$ begin
  begin perform public.set_capture_enabled(current_setting('test.workspace_a')::uuid,current_setting('test.line_a')::uuid,'ai_screening',true);
    raise exception 'AI screening switched on with no basis';
  exception when raise_exception then if sqlerrm not like 'Record a basis%' then raise; end if; end;
end $$;
select public.test_assert((select not ai_screening_enabled from public.line_routing where workspace_id=:'workspace_a' and line_id=:'line_a'),'AI screening is off until a basis exists');

-- A recording basis is not an AI basis.
select public.record_one_party_basis(:'workspace_a',:'line_a','call_recording','US-AZ','Recording only');
do $$ begin
  begin perform public.set_capture_enabled(current_setting('test.workspace_a')::uuid,current_setting('test.line_a')::uuid,'ai_screening',true);
    raise exception 'A recording basis enabled AI screening';
  exception when raise_exception then if sqlerrm not like 'Record a basis%' then raise; end if; end;
end $$;

-- With its own basis it turns on, and withdrawing stops it.
select public.record_capture_consent(:'workspace_a',:'line_a','ai_screening',true,'v1','Callers are told an AI assistant answers');
select public.set_capture_enabled(:'workspace_a',:'line_a','ai_screening',true);
select public.test_assert((select ai_screening_enabled from public.line_routing where workspace_id=:'workspace_a' and line_id=:'line_a'),'an ai_screening basis enables AI screening');
select public.record_capture_consent(:'workspace_a',:'line_a','ai_screening',false,'v1','Withdrawn');
select public.test_assert((select not ai_screening_enabled from public.line_routing where workspace_id=:'workspace_a' and line_id=:'line_a'),'withdrawing the AI basis stops the screening');

-- The caller notice is a presentation choice, so it needs no basis, but it is
-- still owner-only and audited.
select public.set_ai_notice(:'workspace_a',:'line_a',false);
select public.test_assert((select not ai_notice_enabled from public.line_routing where workspace_id=:'workspace_a' and line_id=:'line_a'),'the line owner can turn the caller notice off');

-- The guard holds against the backend role, which skips policies and not triggers.
reset role;
do $$ begin
  begin update public.line_routing set ai_screening_enabled=true
    where workspace_id=current_setting('test.workspace_a')::uuid and line_id=current_setting('test.line_a')::uuid;
    raise exception 'The backend role enabled AI screening with no basis';
  exception when check_violation then raise notice 'PASS: the backend role cannot enable AI screening without a basis'; end;
end $$;

-- The assistant profile answers for a line and is service_role only, so a
-- member cannot read another workspace's assistant configuration.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$ begin
  begin perform public.line_assistant_profile(current_setting('test.workspace_a')::uuid,current_setting('test.line_a')::uuid);
    raise exception 'A member read the assistant profile';
  exception when insufficient_privilege then raise notice 'PASS: the assistant profile is not reachable by a member'; end;
end $$;
reset role;

rollback;

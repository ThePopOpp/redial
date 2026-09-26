'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { verifiedAccount } from '@/lib/supabase/server';
import { appOrigin } from '@/lib/supabase/config';
import { recordSchemas, uuid, views, capabilities, type RecordKind } from './model';
import { z } from 'zod';

export async function dashboardAction(form: FormData) {
  if ((await headers()).get('origin') !== appOrigin()) redirect('/app?notice=origin');
  const account = await verifiedAccount(); if (!account) redirect('/sign-in');
  const { db } = account;
  const w = String(form.get('workspace') || ''), l = String(form.get('line') || '');
  const view = String(form.get('view') || 'overview');
  let target = `/app/${views.includes(view as typeof views[number]) ? view : 'overview'}?workspace=${uuid.safeParse(w).success ? w : ''}&line=${uuid.safeParse(l).success ? l : ''}`;
  let notice = 'saved';
  try {
    const action = form.get('action');
    if (action === 'workspace') {
      const input = z.object({ name: z.string().trim().min(1).max(100), type: z.enum(['personal','business']) }).parse({ name: form.get('name'), type: form.get('type') });
      const { data, error } = await db.rpc('create_workspace',{workspace_name:input.name,workspace_type:input.type});
      if (error) throw error; target = `/app/overview?workspace=${data}`;
    } else if (action === 'accept') {
      const { error } = await db.rpc('accept_membership',{w:uuid.parse(w)}); if (error) throw error;
    } else {
      uuid.parse(w);
      const { data: member, error: memberError } = await db.from('memberships').select('role').eq('workspace_id',w).eq('user_id',account.user.id).eq('status','active').maybeSingle();
      if (memberError || !member) throw new Error('Access denied');
      if (action === 'line') {
        const { data, error } = await db.rpc('create_line',{w,line_name:z.string().trim().min(1).max(100).parse(form.get('name'))}); if (error) throw error;
        target = `/app/numbers?workspace=${w}&line=${data}`;
      } else if (action === 'invite') {
        const { error } = await db.rpc('invite_member',{w,email_address:z.email().parse(form.get('email')),member_role:z.enum(['member','billing']).parse(form.get('role'))}); if (error) throw error;
        notice = 'invited';
      } else if (action === 'revoke') {
        const { error } = await db.rpc('revoke_membership',{w,u:uuid.parse(form.get('user'))}); if (error) throw error;
      } else if (action === 'grant') {
        const { error } = await db.rpc('set_line_grant',{w,l:uuid.parse(l),u:uuid.parse(form.get('user')),c:z.enum(capabilities).parse(form.get('capability')),enabled:form.get('enabled')==='true'}); if (error) throw error;
      } else if (action === 'save' || action === 'delete') {
        const kind = z.enum(Object.keys(recordSchemas) as [RecordKind,...RecordKind[]]).parse(form.get('kind'));
        const id = uuid.parse(form.get('id'));
        const version = z.coerce.number().int().min(0).parse(form.get('version'));
        if (kind !== 'ticket') uuid.parse(l);
        if (action === 'delete') {
          const { data, error } = await db.from('workspace_records').delete().eq('workspace_id',w).eq('id',id).eq('version',version).select('id');
          if (error || !data?.length) throw new Error('Conflict');
        } else {
          const shape = recordSchemas[kind].shape;
          const raw = Object.fromEntries(Object.keys(shape).map(key => [key, ['vip','done','email'].includes(key) ? form.has(key) : ['retentionDays','maxSeconds'].includes(key) ? Number(form.get(key)) : String(form.get(key) || '')]));
          if (kind === 'callback') raw.scheduledAt = new Date(String(raw.scheduledAt) + 'Z').toISOString();
          const body = recordSchemas[kind].parse(raw);
          const result = version ? await db.from('workspace_records').update({body}).eq('workspace_id',w).eq('id',id).eq('kind',kind).eq('version',version).select('id') : await db.from('workspace_records').insert({id,workspace_id:w,line_id:kind==='ticket'?null:l,owner_id:account.user.id,kind,body}).select('id');
          if (result.error || !result.data?.length) throw new Error('Conflict');
        }
      } else throw new Error('Unsupported action');
    }
  } catch { notice = 'failed'; }
  revalidatePath('/app','layout'); redirect(`${target}&notice=${notice}`);
}

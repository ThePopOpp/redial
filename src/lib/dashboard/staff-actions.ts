'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { appOrigin } from '@/lib/supabase/config';
import { staffAccount } from '@/lib/supabase/staff';

type MfaState={message:string;secret?:string;qr?:string;factor?:string};

export async function mfaAction(_previous:MfaState,form:FormData): Promise<MfaState> {
  if((await headers()).get('origin')!==appOrigin()) return {message:'Use the configured Redial domain.'};
  const account=await staffAccount(); if(!account) return {message:'Staff access is unavailable.'};
  if(form.get('action')==='enroll') {
    // Clear abandoned attempts first. Reloading the page before verifying leaves
    // an unverified factor behind, and without this they accumulate until
    // Supabase refuses another. Only unverified factors are removed, so a
    // working authenticator is never revoked here.
    const {data:existing}=await account.db.auth.mfa.listFactors();
    for(const stale of (existing?.all??[]).filter(f=>f.status==='unverified')) {
      await account.db.auth.mfa.unenroll({factorId:stale.id});
    }
    // A stable name, so the authenticator entry reads "Redial operations" rather
    // than a timestamp. Clearing stale factors above is what keeps it unique.
    const {data,error}=await account.db.auth.mfa.enroll({factorType:'totp',friendlyName:'Redial operations'});
    if(error) return {message:'Authenticator enrollment could not be started. Try again or contact your administrator.'};
    return {message:'Scan this with your authenticator, or add the setup key by hand, then enter the six-digit code it shows.',
      secret:data.totp.secret,qr:data.totp.qr_code,factor:data.id};
  }
  const input=z.object({factorId:z.uuid(),code:z.string().regex(/^\d{6}$/)}).safeParse({factorId:form.get('factor'),code:form.get('code')});
  if(!input.success) return {message:'Enter a six-digit code.'};
  const {error}=await account.db.auth.mfa.challengeAndVerify(input.data);
  if(error) return {message:'The code could not be verified. Try a fresh code.',factor:input.data.factorId};
  redirect('/ops');
}

export async function supportReply(form:FormData) {
  if((await headers()).get('origin')!==appOrigin()) redirect('/ops?notice=failed');
  const account=await staffAccount(); if(!account?.mfa || !['support','admin'].includes(account.role)) redirect('/staff-sign-in');
  const input=z.object({workspace_id:z.uuid(),ticket_id:z.uuid(),body:z.string().trim().min(1).max(4000)}).safeParse(Object.fromEntries(['workspace_id','ticket_id','body'].map(k=>[k,form.get(k)])));
  if(!input.success) redirect('/ops?notice=failed');
  const {error}=await account.db.from('support_messages').insert({...input.data,author_id:account.user.id});
  if(error) redirect('/ops?notice=failed');
  revalidatePath('/app','layout'); revalidatePath('/ops','layout'); redirect('/ops?notice=saved');
}

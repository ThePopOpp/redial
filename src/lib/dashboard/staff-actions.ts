'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { appOrigin } from '@/lib/supabase/config';
import { staffAccount } from '@/lib/supabase/staff';

export async function mfaAction(_previous:{message:string;secret?:string;factor?:string},form:FormData): Promise<{message:string;secret?:string;factor?:string}> {
  if((await headers()).get('origin')!==appOrigin()) return {message:'Use the configured Redial domain.'};
  const account=await staffAccount(); if(!account) return {message:'Staff access is unavailable.'};
  if(form.get('action')==='enroll') {
    const {data,error}=await account.db.auth.mfa.enroll({factorType:'totp',friendlyName:`Redial ${new Date().toISOString()}`});
    if(error) return {message:'Authenticator enrollment could not be started. Try again or contact your administrator.'};
    return {message:'Add this secret to your authenticator, then enter its six-digit code.',secret:data.totp.secret,factor:data.id};
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

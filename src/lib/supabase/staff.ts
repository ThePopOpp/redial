import 'server-only';
import { verifiedAccount } from './server';
export async function staffAccount() {
  const account=await verifiedAccount(); if(!account) return null;
  const {data:staff,error}=await account.db.from('platform_staff').select('role,active').eq('user_id',account.user.id).maybeSingle();
  if(error || !staff?.active) return null;
  const {data,error:claimError}=await account.db.auth.getClaims();
  return {...account,role:String(staff.role),mfa:!claimError && data?.claims.aal==='aal2'};
}

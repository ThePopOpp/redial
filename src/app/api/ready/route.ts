import { supabaseConfig, appOrigin } from '@/lib/supabase/config';
export const dynamic='force-dynamic';
export async function GET() {
  try {
    const config=supabaseConfig(); appOrigin();
    if(!config) return Response.json({status:'not_configured'},{status:503,headers:{'Cache-Control':'no-store'}});
    const result=await fetch(`${config.url}/auth/v1/health`,{headers:{apikey:config.key},signal:AbortSignal.timeout(5000),cache:'no-store'});
    return Response.json({status:result.ok?'auth_reachable':'unavailable',databasePermissions:'require_authenticated_verification'},{status:result.ok?200:503,headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}}); }
}

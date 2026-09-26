import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseConfig, appOrigin } from './config';

export async function serverSupabase() {
  const config = supabaseConfig();
  if (!config) return null;
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: appOrigin().startsWith('https://') },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => {
        try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); }
        catch { /* Server Components cannot write; the proxy refreshes their session. */ }
      },
    },
  });
}

export async function verifiedAccount() {
  const db = await serverSupabase();
  if (!db) return null;
  const { data, error } = await db.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at) return null;
  return { db, user: data.user };
}

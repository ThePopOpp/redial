import 'server-only';

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) throw new Error('Supabase requires HTTPS.');
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error('SUPABASE_URL must be an origin.');
  if (!key.startsWith('sb_publishable_')) {
    let role: unknown;
    try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch { /* Invalid public key. */ }
    if (role !== 'anon') throw new Error('Use a Supabase publishable or legacy anon key, never a secret/service-role key.');
  }
  return { url: parsed.origin, key };
}

export function appOrigin() {
  const value = process.env.APP_BASE_URL || 'http://127.0.0.1:4317';
  const parsed = new URL(value);
  if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) throw new Error('APP_BASE_URL must be an origin.');
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) throw new Error('APP_BASE_URL requires HTTPS.');
  return parsed.origin;
}

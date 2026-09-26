import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { pathToFileURL } from 'node:url';

// Offline checks only. Never send credentials, make calls, or print env values.
export function checkLaunchConfig(env) {
  const results = [];
  const check = (key, ok, detail) => results.push({ key, status: ok ? 'pass' : 'blocked', detail });
  let app;
  // REDIAL_SITE_URL is the current name; APP_BASE_URL remains a deprecated fallback.
  try { app = new URL(env.REDIAL_SITE_URL || env.APP_BASE_URL); } catch { /* report below */ }
  check('REDIAL_SITE_URL', Boolean(app && app.protocol === 'https:' && !app.username && !app.password && app.pathname === '/' && !app.search && !app.hash && !['localhost','127.0.0.1','[::1]'].includes(app.hostname) && !app.hostname.endsWith('.invalid') && !app.hostname.endsWith('.test') && !app.hostname.endsWith('.example')), 'Public HTTPS origin required for staging; local review can use loopback.');
  let supabase;
  try { supabase = new URL(env.SUPABASE_URL); } catch { /* report below */ }
  check('SUPABASE_URL', Boolean(supabase && supabase.protocol === 'https:' && !supabase.username && !supabase.password && supabase.pathname === '/' && !supabase.search && !supabase.hash), 'Use the Supabase project HTTPS origin. Reachability is not checked here.');
  let publicKey = env.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_') && env.SUPABASE_PUBLISHABLE_KEY.length > 25;
  try { const payload = JSON.parse(Buffer.from((env.SUPABASE_PUBLISHABLE_KEY || '').split('.')[1], 'base64url')); publicKey ||= payload.role === 'anon'; } catch { /* legacy anon key optional */ }
  check('SUPABASE_PUBLISHABLE_KEY', Boolean(publicKey), 'Publishable/anon key only; this check does not verify the key with Supabase.');
  const forbidden = Object.keys(env).filter(key => /^(NEXT_PUBLIC_.*(SECRET|SERVICE_ROLE|AUTH_TOKEN|API_KEY)|SUPABASE_(SERVICE_ROLE_KEY|SECRET_KEY)|TWILIO_(AUTH_TOKEN|API_SECRET)|XAI_API_KEY|RESEND_API_KEY|SQUARE_(ACCESS_TOKEN|WEBHOOK_SIGNATURE_KEY|REFRESH_TOKEN)|OPENROUTER_API_KEY)$/.test(key) && env[key]);
  check('WEB_SECRET_ISOLATION', forbidden.length === 0, 'Keep provider and privileged database secrets out of the web environment; use isolated gateway/worker environments when implemented.');
  check('LIVE_CALL_IMPLEMENTATION', false, 'Voice gateway, durable jobs, consent, quotas and verified provider fallback remain implementation gates.');
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const file = process.argv[2];
    const env = file ? parseEnv(readFileSync(file, 'utf8')) : process.env;
    const results = checkLaunchConfig(env);
    process.stdout.write(`${JSON.stringify({ scope: 'offline configuration only', productionReady: false, results }, null, 2)}\n`);
    process.exitCode = results.some(result => result.status === 'blocked') ? 1 : 0;
  } catch {
    process.stderr.write('Could not read environment configuration. No values were printed.\n');
    process.exitCode = 1;
  }
}

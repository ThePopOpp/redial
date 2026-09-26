import { readRuntime } from '../config/runtime.mjs';
import { checkEmailProviders } from '../config/email-checks.mjs';

// Operator-invoked, read-only probes. Never send mail, provision numbers, place
// calls, change Auth settings, or log provider response bodies/credentials.
async function get(url, headers) {
  const response = await fetch(url, { headers, redirect: 'error', signal: AbortSignal.timeout(15000) });
  return response;
}
async function probe(name, operation) {
  try { console.log(`${name}: ${await operation()}`); }
  catch { console.error(`${name}: check failed (network, TLS, or authentication). Check the provider dashboard.`); process.exitCode = 1; }
}

try {
  const config = readRuntime();
  await probe('Supabase', async () => {
    if (!config.supabase.publishableKey) return 'not configured';
    const response = await get(`${config.supabase.url}/auth/v1/settings`, { apikey: config.supabase.publishableKey });
    if (!response.ok) throw new Error();
    return 'project Auth endpoint accepted the publishable key; app sign-in and RLS are not implemented';
  });
  await probe('Twilio', async () => {
    if (!config.twilio.authToken) return 'not configured';
    const response = await get(`https://api.twilio.com/2010-04-01/Accounts/${config.twilio.accountSid}.json`, {
      Authorization: `Basic ${Buffer.from(`${config.twilio.accountSid}:${config.twilio.authToken}`).toString('base64')}`,
    });
    if (!response.ok) throw new Error();
    const account = await response.json();
    if (account.sid !== config.twilio.accountSid || account.status !== 'active') throw new Error();
    return 'active account credentials verified; no numbers or call routes changed';
  });
  for (const check of await checkEmailProviders(config.email)) {
    console.log(`Email ${check.role} (${check.provider}): ${check.detail}`);
    if (['unverified', 'failed'].includes(check.status)) process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message); process.exitCode = 1;
}

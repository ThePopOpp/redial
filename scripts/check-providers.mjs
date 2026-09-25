import nodemailer from 'nodemailer';
import { readRuntime } from '../config/runtime.mjs';

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
  await probe('Email', async () => {
    if (config.email.provider === 'disabled') return 'disabled';
    if (config.email.provider === 'resend') {
      const response = await get('https://api.resend.com/domains', { Authorization: `Bearer ${config.email.resendKey}` });
      if (response.status === 403) { process.exitCode = 1; return 'domain verification unavailable with this key; verify the sender domain in Resend (keep sending-only permissions)'; }
      if (!response.ok) throw new Error();
      const result = await response.json();
      const domain = config.email.from.split('@')[1].toLowerCase();
      if (!result.data?.some(item => item.name.toLowerCase() === domain && item.status === 'verified')) {
        process.exitCode = 1; return 'sender domain is not verified in the returned domains; check the Resend dashboard';
      }
      return 'sender domain verified; no email sent';
    }
    const smtp = config.email.smtp;
    const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, requireTLS: true,
      auth: { user: smtp.user, pass: smtp.password }, tls: { minVersion: 'TLSv1.2' },
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 15000, logger: false, debug: false });
    try { await transport.verify(); } finally { transport.close(); }
    return 'SMTP TLS and authentication verified; no email sent (sender acceptance remains untested)';
  });
} catch (error) {
  console.error(error.message); process.exitCode = 1;
}

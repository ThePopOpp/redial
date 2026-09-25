import nodemailer from 'nodemailer';

// Inspect both configured providers independently. This checks readiness only;
// it never sends messages or switches a queued message between providers.
export async function checkEmailProviders(email, { fetchImpl = fetch, createTransport = nodemailer.createTransport } = {}) {
  const results = [];
  async function inspect(provider, role) {
    try {
      if (provider === 'resend') {
        const response = await fetchImpl('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${email.resendKey}` },
          redirect: 'error', signal: AbortSignal.timeout(15000) });
        if (response.status === 403) return { provider, role, status: 'unverified', detail: 'domain verification unavailable with this key; verify the sender domain in Resend (keep sending-only permissions)' };
        if (!response.ok) throw new Error();
        const result = await response.json();
        const domain = email.from.split('@')[1].toLowerCase();
        if (!result.data?.some(item => item.name.toLowerCase() === domain && item.status === 'verified')) {
          return { provider, role, status: 'unverified', detail: 'sender domain is not verified in the returned domains; check the Resend dashboard' };
        }
        return { provider, role, status: 'verified', detail: 'sender domain verified; no email sent' };
      }
      const smtp = email.smtp;
      const transport = createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, requireTLS: true,
        auth: { user: smtp.user, pass: smtp.password }, tls: { minVersion: 'TLSv1.2' },
        connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 15000, logger: false, debug: false });
      try { await transport.verify(); } finally { transport.close(); }
      return { provider, role, status: 'verified', detail: 'SMTP TLS and authentication verified; no email sent (sender acceptance remains untested)' };
    } catch {
      return { provider, role, status: 'failed', detail: 'check failed (network, TLS, or authentication). Check the provider dashboard.' };
    }
  }
  if (email.provider === 'disabled') return [{ provider: 'disabled', role: 'primary', status: 'disabled', detail: 'disabled' }];
  results.push(await inspect(email.provider, 'primary'));
  if (email.fallbackProvider === 'smtp') results.push(await inspect('smtp', 'fallback'));
  return results;
}

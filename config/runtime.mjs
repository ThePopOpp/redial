import path from 'node:path';

// Shared by Next, the container entry point, and the operator checks. Never log
// this object: it contains server credentials. Errors contain field names only.
export function readRuntime(env = process.env) {
  const errors = [];
  const value = name => (env[name] ?? '').trim();
  const requireValue = name => { const result = value(name); if (!result) errors.push(`${name} is required`); return result; };
  const deployment = value('REDIAL_DEPLOYMENT') || 'local';
  // Local development and the browser-test Supabase double both run over
  // loopback HTTP. Hosted deployments stay HTTPS-only.
  const loopback = url => ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.hostname === '::1';
  if (!['local', 'development'].includes(deployment)) errors.push('REDIAL_DEPLOYMENT must be local or development');
  if (value('REDIAL_DATA_DIR') && !path.isAbsolute(value('REDIAL_DATA_DIR'))) errors.push('REDIAL_DATA_DIR must be an absolute path');
  let siteUrl = null;
  if (deployment === 'development' || value('REDIAL_SITE_URL')) {
    try {
      siteUrl = new URL(requireValue('REDIAL_SITE_URL'));
      const permitted = siteUrl.protocol === 'https:' || (deployment === 'local' && siteUrl.protocol === 'http:' && loopback(siteUrl));
      if (!permitted || siteUrl.username || siteUrl.password || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash) throw new Error();
    } catch { errors.push('REDIAL_SITE_URL must be an HTTPS origin without a path, query, or credentials'); }
  }
  const username = value('REDIAL_DEV_USERNAME');
  const password = env.REDIAL_DEV_PASSWORD ?? '';
  if (deployment === 'development') {
    if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username)) errors.push('REDIAL_DEV_USERNAME must contain 3–64 letters, digits, dots, underscores, or hyphens');
    if (password.length < 24 || /^(change|replace|example)/i.test(password)) errors.push('REDIAL_DEV_PASSWORD must be a unique secret of at least 24 characters');
  }
  const supabase = { url: value('SUPABASE_URL'), publishableKey: value('SUPABASE_PUBLISHABLE_KEY') };
  if (supabase.url || supabase.publishableKey) {
    requireValue('SUPABASE_URL'); requireValue('SUPABASE_PUBLISHABLE_KEY');
    try {
      const url = new URL(supabase.url);
      const hosted = url.protocol === 'https:' && /^[a-z0-9]+\.supabase\.co$/.test(url.hostname) && !url.port;
      const double = deployment === 'local' && url.protocol === 'http:' && loopback(url);
      if ((!hosted && !double) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    } catch { errors.push('SUPABASE_URL must be a hosted Supabase HTTPS project origin'); }
    if (!supabase.publishableKey.startsWith('sb_publishable_')) errors.push('SUPABASE_PUBLISHABLE_KEY must be a publishable key, not a server secret');
  }
  const twilio = { accountSid: value('TWILIO_ACCOUNT_SID'), authToken: value('TWILIO_AUTH_TOKEN') };
  if (twilio.accountSid || twilio.authToken) {
    if (!/^AC[0-9a-f]{32}$/i.test(twilio.accountSid)) errors.push('TWILIO_ACCOUNT_SID must be an account SID');
    if (!/^[0-9a-f]{32}$/i.test(twilio.authToken)) errors.push('TWILIO_AUTH_TOKEN must be a 32-character account token');
  }
  const provider = value('REDIAL_EMAIL_PROVIDER') || 'disabled';
  const fallbackProvider = value('REDIAL_EMAIL_FALLBACK_PROVIDER') || 'disabled';
  const email = { provider, fallbackProvider, from: value('EMAIL_FROM'), resendKey: value('RESEND_API_KEY'), smtp: {
    host: value('SMTP_HOST'), port: Number(value('SMTP_PORT') || '465'), secure: (value('SMTP_SECURE') || 'true') === 'true',
    user: value('SMTP_USER'), password: env.SMTP_PASSWORD ?? '',
  } };
  if (!['disabled', 'resend', 'smtp'].includes(provider)) errors.push('REDIAL_EMAIL_PROVIDER must be disabled, resend, or smtp');
  if (!['disabled', 'smtp'].includes(fallbackProvider)) errors.push('REDIAL_EMAIL_FALLBACK_PROVIDER must be disabled or smtp');
  if (fallbackProvider === 'smtp' && provider !== 'resend') errors.push('SMTP fallback requires REDIAL_EMAIL_PROVIDER=resend');
  if (provider !== 'disabled') {
    if (!/^[^\r\n<>]+@[^\s<>]+\.[^\s<>]+$/.test(email.from)) errors.push('EMAIL_FROM must be a bare sender email address');
    if (provider === 'resend' && !requireValue('RESEND_API_KEY').startsWith('re_')) errors.push('RESEND_API_KEY must be a Resend API key');
    if (provider === 'smtp' || fallbackProvider === 'smtp') {
      requireValue('SMTP_HOST'); requireValue('SMTP_USER'); requireValue('SMTP_PASSWORD');
      if (!/^[a-z0-9.-]+$/i.test(email.smtp.host)) errors.push('SMTP_HOST must be a hostname');
      if (![465, 587].includes(email.smtp.port)) errors.push('SMTP_PORT must be 465 or 587');
      if (value('SMTP_SECURE') && !['true', 'false'].includes(value('SMTP_SECURE'))) errors.push('SMTP_SECURE must be true or false');
      if (email.smtp.secure !== (email.smtp.port === 465)) errors.push('SMTP_SECURE must be true for port 465 and false for STARTTLS on port 587');
    }
  }
  if (errors.length) throw new Error(`Invalid environment: ${[...new Set(errors)].join('; ')}`);
  return { deployment, siteUrl: siteUrl?.origin ?? null, username, password, secureCookies: deployment === 'development',
    dataDir: value('REDIAL_DATA_DIR') || path.join(process.cwd(), '.redial'), supabase, twilio, email };
}

export function configurationSummary(config) {
  return { deployment: config.deployment, supabase: config.supabase.publishableKey ? 'configured' : 'not configured',
    twilio: config.twilio.authToken ? 'configured' : 'not configured', email: config.email.provider, emailFallback: config.email.fallbackProvider,
    liveAuthentication: 'not implemented', liveCalling: 'not implemented', emailDelivery: 'not implemented' };
}

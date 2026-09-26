// Voice gateway environment. A second unit that may hold provider secrets, kept
// apart from both the web application and the billing worker: it is reachable by
// a provider webhook, so it has a different exposure profile from either.
//
// Never log the object this returns. Errors below name fields, never values.

export function readGatewayConfig(env = process.env) {
  const errors = [];
  const value = name => (env[name] ?? '').trim();
  const required = name => { const result = value(name); if (!result) errors.push(`${name} is required`); return result; };

  const supabaseUrl = required('SUPABASE_URL');
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      const hosted = url.protocol === 'https:' && /^[a-z0-9]+\.supabase\.co$/.test(url.hostname) && !url.port;
      const loopback = url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
      if ((!hosted && !loopback) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    } catch { errors.push('SUPABASE_URL must be a Supabase project origin'); }
  }

  // The gateway reads routing and writes call state. Those tables carry no
  // policy for anon or authenticated, so a publishable key would read nothing
  // and fail silently at the first call rather than at startup.
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceRoleKey) {
    const secretKey = serviceRoleKey.startsWith('sb_secret_') && serviceRoleKey.length > 25;
    let legacyServiceRole = false;
    try {
      const payload = JSON.parse(Buffer.from(serviceRoleKey.split('.')[1], 'base64url').toString('utf8'));
      legacyServiceRole = payload.role === 'service_role';
    } catch { /* not a JWT either; reported below */ }
    if (!secretKey && !legacyServiceRole) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY must be a secret or service-role key, not a publishable key');
    }
  }

  const accountSid = required('TWILIO_ACCOUNT_SID');
  if (accountSid && !/^AC[0-9a-f]{32}$/i.test(accountSid)) errors.push('TWILIO_ACCOUNT_SID must be an account SID');
  // The auth token is the webhook signing key as well as an API credential.
  const authToken = required('TWILIO_AUTH_TOKEN');
  if (authToken && !/^[0-9a-f]{32}$/i.test(authToken)) errors.push('TWILIO_AUTH_TOKEN must be a 32-character account token');

  // The origin Twilio was configured with. Signature verification covers the
  // full URL, and rebuilding it from forwarded headers would let a caller choose
  // what is verified, so this is configuration and never derived per request.
  const publicOrigin = required('REDIAL_GATEWAY_ORIGIN');
  if (publicOrigin) {
    try {
      const url = new URL(publicOrigin);
      if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    } catch { errors.push('REDIAL_GATEWAY_ORIGIN must be an HTTPS origin with no path, query or credentials'); }
  }

  // test refuses to bridge a call to a real destination. It exists so the
  // gateway can be deployed and its webhooks exercised before anyone's phone is
  // in the path, and it is the default for the same reason.
  const environment = value('REDIAL_GATEWAY_ENVIRONMENT') || 'test';
  if (!['test', 'live'].includes(environment)) errors.push('REDIAL_GATEWAY_ENVIRONMENT must be test or live');
  // Connecting a real caller to a real handset is a separate, explicit decision
  // from merely running in live mode.
  const bridging = value('REDIAL_GATEWAY_BRIDGE_CALLS') || 'disabled';
  if (!['disabled', 'enabled'].includes(bridging)) errors.push('REDIAL_GATEWAY_BRIDGE_CALLS must be disabled or enabled');
  if (environment === 'live' && bridging !== 'enabled') {
    // Not an error: a live-mode gateway that only screens and takes messages is
    // a valid, useful state. Recorded so the startup summary can say so.
  }

  const port = Number(value('PORT') || '3002');
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('PORT must be a TCP port number');

  if (errors.length) throw new Error(`Invalid gateway environment: ${[...new Set(errors)].join('; ')}`);
  return {
    supabase: { url: supabaseUrl, serviceRoleKey },
    twilio: { accountSid, authToken },
    publicOrigin, environment, bridging, port,
  };
}

// Safe to log. Reports presence and posture, never a value.
export function gatewaySummary(config) {
  return {
    unit: 'voice-gateway',
    origin: config.publicOrigin,
    environment: config.environment,
    twilioCredentials: config.twilio.authToken ? 'configured' : 'not configured',
    signatureValidation: 'required',
    bridgeCalls: config.bridging,
    recordingDefault: 'off',
    aiScreening: 'per line, when a SIP assistant is configured',
  };
}

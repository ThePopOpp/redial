// Worker environment. This is the only deployment unit permitted to hold
// provider secrets and the Supabase service-role key, and it never runs inside
// the Next process. scripts/check-launch-config.mjs fails the web environment if
// any of these names appear there.
//
// Never log the object this returns. Errors below name fields, never values.

const ENVIRONMENTS = ['sandbox', 'production'];

export function readWorkerConfig(env = process.env) {
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

  // The worker bypasses row level security deliberately: it owns provider
  // identity, per-call meters and worker leases, which carry no policy. A
  // publishable key here would silently read nothing rather than fail loudly,
  // so the wrong key is rejected outright.
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

  const environment = value('SQUARE_ENVIRONMENT') || 'sandbox';
  if (!ENVIRONMENTS.includes(environment)) errors.push(`SQUARE_ENVIRONMENT must be ${ENVIRONMENTS.join(' or ')}`);
  const accessToken = required('SQUARE_ACCESS_TOKEN');
  const signatureKey = required('SQUARE_WEBHOOK_SIGNATURE_KEY');
  if (signatureKey && signatureKey.length < 16) errors.push('SQUARE_WEBHOOK_SIGNATURE_KEY is too short to be a Square signature key');

  // Square signs the exact configured notification URL concatenated with the
  // raw body. A URL rebuilt from client-forwarded headers behind Coolify would
  // let a caller choose what we verify against, so the value is configured, and
  // it must match character for character.
  const webhookUrl = required('SQUARE_WEBHOOK_URL');
  if (webhookUrl) {
    try {
      const url = new URL(webhookUrl);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error();
    } catch { errors.push('SQUARE_WEBHOOK_URL must be the exact HTTPS notification URL, without query or fragment'); }
  }

  // A sandbox token cannot charge anyone. A production token can, so it is not
  // enough to set it: the operator must separately state that live commerce is
  // authorized. Reversing this default would make a copied environment file a
  // way to start charging real cards.
  const productionAuthorized = value('REDIAL_SQUARE_PRODUCTION_AUTHORIZED') === 'yes';
  if (environment === 'production' && !productionAuthorized) {
    errors.push('SQUARE_ENVIRONMENT=production requires REDIAL_SQUARE_PRODUCTION_AUTHORIZED=yes');
  }

  // Outbound provider calls are a separate switch again. Reconciliation,
  // verification and internal maintenance run without it; creating a
  // subscription or sending a refund to Square does not.
  const providerCalls = value('REDIAL_WORKER_PROVIDER_CALLS') || 'disabled';
  if (!['disabled', 'enabled'].includes(providerCalls)) errors.push('REDIAL_WORKER_PROVIDER_CALLS must be disabled or enabled');

  const workerId = value('REDIAL_WORKER_ID') || `worker-${process.pid}`;
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(workerId)) errors.push('REDIAL_WORKER_ID must be 1-80 letters, digits, dots, underscores or hyphens');

  const port = Number(value('PORT') || '3001');
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('PORT must be a TCP port number');
  const leaseSeconds = Number(value('REDIAL_WORKER_LEASE_SECONDS') || '60');
  if (!Number.isInteger(leaseSeconds) || leaseSeconds < 10 || leaseSeconds > 900) errors.push('REDIAL_WORKER_LEASE_SECONDS must be between 10 and 900');
  const pollSeconds = Number(value('REDIAL_WORKER_POLL_SECONDS') || '5');
  if (!Number.isInteger(pollSeconds) || pollSeconds < 1 || pollSeconds > 300) errors.push('REDIAL_WORKER_POLL_SECONDS must be between 1 and 300');

  if (errors.length) throw new Error(`Invalid worker environment: ${[...new Set(errors)].join('; ')}`);
  return {
    supabase: { url: supabaseUrl, serviceRoleKey },
    square: { environment, accessToken, signatureKey, webhookUrl, productionAuthorized },
    providerCalls, workerId, port, leaseSeconds, pollSeconds,
  };
}

// Safe to log. Deliberately reports presence, never a value or a prefix.
export function workerSummary(config) {
  return {
    unit: 'worker',
    workerId: config.workerId,
    squareEnvironment: config.square.environment,
    squareCredentials: config.square.accessToken ? 'configured' : 'not configured',
    webhookSignatureKey: config.square.signatureKey ? 'configured' : 'not configured',
    providerCalls: config.providerCalls,
    productionAuthorized: config.square.productionAuthorized,
    subscriptionCreation: 'not implemented',
    entitlementGrant: 'not implemented',
  };
}

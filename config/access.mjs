import { createHash, timingSafeEqual } from 'node:crypto';

function matches(candidate, expected) {
  return timingSafeEqual(createHash('sha256').update(candidate).digest(), createHash('sha256').update(expected).digest());
}

// Do not trust X-Forwarded-Host. Coolify must preserve the original Host, and
// terminate HTTPS. The configured origin is used for all hosted CSRF checks.
export function checkAccess(request, config, mutation = false) {
  const host = request.headers.get('host') ?? '';
  let origin;
  if (config.deployment !== 'local') {
    if (host !== new URL(config.siteUrl).host) return { status: 403, code: 'HOST', message: 'This hostname is not allowed.' };
    // Only the password-gated preview challenges. On the public site Supabase
    // auth protects /app and /ops; there is no shared password to present.
    if (config.deployment === 'development') {
      const header = request.headers.get('authorization') ?? '';
      const token = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header)?.[1];
      const credentials = token && token.length <= 4096 ? Buffer.from(token, 'base64').toString('utf8') : '';
      if (!matches(credentials, `${config.username}:${config.password}`)) return { status: 401, code: 'DEV_ACCESS', message: 'Development preview access is required.' };
    }
    origin = config.siteUrl;
  } else {
    if (!/^(?:127\.0\.0\.1|localhost|\[::1\]):[1-9]\d{0,4}$/.test(host)) return { status: 403, code: 'LOCAL_ONLY', message: 'This preview is available on the local server only.' };
    origin = new URL(`${new URL(request.url).protocol}//${host}`).origin;
  }
  const site = request.headers.get('sec-fetch-site');
  const navigation = request.headers.get('sec-fetch-mode') === 'navigate';
  const refuse = { status: 403, code: 'ORIGIN', message: 'This request must come from the Redial site.' };

  // Cross-site request forgery is a property of requests that change
  // something, so the Origin check is applied to those.
  if (mutation) {
    if (request.headers.get('origin') !== origin) return refuse;
    if (site === 'cross-site') return refuse;
    return null;
  }

  // A safe request that is cross-site and is not a top-level navigation is
  // something embedding or fetching this site, which nothing legitimately does.
  //
  // A cross-site navigation is a person clicking a link, and refusing those was
  // a real outage: every inbound link returned 403 — the confirmation email, the
  // password reset, a search result, a shared URL — while typing the address by
  // hand worked, because that sends `Sec-Fetch-Site: none`. It survived the
  // password-gated preview because almost nothing linked inward and the
  // password came first.
  //
  // Allowing them gives nothing away. Session cookies are SameSite=Strict, so a
  // cross-site request carries no session and reads nothing a stranger could not
  // already see, and every page behind the login re-checks identity server-side.
  if (site === 'cross-site' && !navigation) return refuse;
  return null;
}

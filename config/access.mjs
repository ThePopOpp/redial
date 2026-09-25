import { createHash, timingSafeEqual } from 'node:crypto';

function matches(candidate, expected) {
  return timingSafeEqual(createHash('sha256').update(candidate).digest(), createHash('sha256').update(expected).digest());
}

// Do not trust X-Forwarded-Host. Coolify must preserve the original Host, and
// terminate HTTPS. The configured origin is used for all hosted CSRF checks.
export function checkAccess(request, config, mutation = false) {
  const host = request.headers.get('host') ?? '';
  let origin;
  if (config.deployment === 'development') {
    if (host !== new URL(config.siteUrl).host) return { status: 403, code: 'HOST', message: 'This hostname is not allowed.' };
    const header = request.headers.get('authorization') ?? '';
    const token = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header)?.[1];
    const credentials = token && token.length <= 4096 ? Buffer.from(token, 'base64').toString('utf8') : '';
    if (!matches(credentials, `${config.username}:${config.password}`)) return { status: 401, code: 'DEV_ACCESS', message: 'Development preview access is required.' };
    origin = config.siteUrl;
  } else {
    if (!/^(?:127\.0\.0\.1|localhost|\[::1\]):[1-9]\d{0,4}$/.test(host)) return { status: 403, code: 'LOCAL_ONLY', message: 'This preview is available on the local server only.' };
    origin = new URL(`${new URL(request.url).protocol}//${host}`).origin;
  }
  if ((mutation && request.headers.get('origin') !== origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return { status: 403, code: 'ORIGIN', message: 'This request must come from the preview site.' };
  }
  return null;
}

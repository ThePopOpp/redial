import { createHmac, timingSafeEqual } from 'node:crypto';

// Twilio signs the full request URL with the POST parameters appended: keys
// sorted, each key immediately followed by its value, no separators. HMAC-SHA1
// with the account auth token, base64.
//
// SHA-1 is Twilio's choice, not ours. It is a MAC here rather than a collision-
// resistant hash, so it is fit for purpose, but it is why this cannot be swapped
// for the SHA-256 helper the Square path uses.
//
// The reference implementations this was written against did not validate voice
// webhooks at all. Without this, anyone who learns the URL can post a forged
// call and make the gateway dial a number of their choosing.
export function twilioSignatureIsValid({ authToken, url, params, signature }) {
  if (typeof authToken !== 'string' || !authToken) return false;
  if (typeof url !== 'string' || !url) return false;
  if (typeof signature !== 'string' || !signature) return false;

  const payload = Object.keys(params ?? {}).sort()
    .reduce((acc, key) => acc + key + String(params[key] ?? ''), url);
  const expected = createHmac('sha1', authToken).update(Buffer.from(payload, 'utf8')).digest();

  let provided;
  try { provided = Buffer.from(signature, 'base64'); } catch { return false; }
  // Compare fixed-width digests of both sides so a length mismatch costs the
  // same as a value mismatch and timingSafeEqual cannot throw.
  const left = createHmac('sha1', authToken).update(expected).digest();
  const right = createHmac('sha1', authToken).update(provided).digest();
  return timingSafeEqual(left, right);
}

// The URL Twilio signed is the one configured on the number, which is not
// necessarily the one this process sees behind Coolify's proxy. Rebuilding it
// from X-Forwarded-Host would let a caller choose the string we verify against,
// so the public origin is configuration and only the path and query come from
// the request.
export function signedUrl(publicOrigin, requestUrl) {
  const incoming = new URL(requestUrl, 'http://placeholder.invalid');
  return new URL(incoming.pathname + incoming.search, publicOrigin).toString();
}

export function formParams(body) {
  const params = {};
  for (const [key, value] of new URLSearchParams(body)) params[key] = value;
  return params;
}

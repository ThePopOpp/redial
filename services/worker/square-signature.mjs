import { createHmac, timingSafeEqual } from 'node:crypto';

// Square signs the concatenation of the exact notification URL and the raw
// request body with the webhook signature key, HMAC-SHA256, base64.
//
// Three things matter and each has burned someone before:
//
// The body must be the bytes as received. Parsing to JSON and re-serialising
// changes key order and whitespace, and the signature then never matches.
//
// The URL must be the configured one, not one rebuilt from forwarded headers.
// Behind a reverse proxy a caller controls X-Forwarded-Host, so deriving the URL
// from the request would let them pick the string we verify against.
//
// The comparison must be timing-safe, and must not leak length either.
export function squareSignatureIsValid({ notificationUrl, rawBody, signature, signatureKey }) {
  if (typeof notificationUrl !== 'string' || !notificationUrl) return false;
  if (typeof signature !== 'string' || !signature) return false;
  if (typeof signatureKey !== 'string' || !signatureKey) return false;
  if (!Buffer.isBuffer(rawBody) && typeof rawBody !== 'string') return false;

  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
  const expected = createHmac('sha256', signatureKey)
    .update(Buffer.concat([Buffer.from(notificationUrl, 'utf8'), body]))
    .digest();

  let provided;
  try { provided = Buffer.from(signature, 'base64'); } catch { return false; }
  // timingSafeEqual throws on a length mismatch, which would itself be a signal.
  // Compare digests of both instead, so every rejection costs the same.
  const guard = createHmac('sha256', signatureKey);
  const left = createHmac('sha256', signatureKey).update(expected).digest();
  const right = guard.update(provided).digest();
  return timingSafeEqual(left, right);
}

// Square's documented header. Matched case-insensitively because Node lowercases
// incoming header names but operators read the documented spelling.
export const SQUARE_SIGNATURE_HEADER = 'x-square-hmacsha256-signature';

export function readSquareSignature(headers) {
  if (!headers) return '';
  const direct = headers[SQUARE_SIGNATURE_HEADER];
  if (typeof direct === 'string') return direct;
  for (const [name, headerValue] of Object.entries(headers)) {
    if (name.toLowerCase() === SQUARE_SIGNATURE_HEADER && typeof headerValue === 'string') return headerValue;
  }
  return '';
}

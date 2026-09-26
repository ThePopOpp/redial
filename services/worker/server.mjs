import { createServer } from 'node:http';
import { squareSignatureIsValid, readSquareSignature } from './square-signature.mjs';

const MAX_BODY_BYTES = 64_000;

// Webhook ingress lives in the worker because signature verification needs the
// signature key, and the web tier is forbidden from holding it. The web tier
// therefore cannot accept a Square notification at all, which is the intended
// shape rather than a limitation.
export function createWebhookServer({ config, store, log }) {
  const notificationPath = new URL(config.square.webhookUrl).pathname;

  return createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health/live') return respond(response, 200, { status: 'live' });

    if (request.method !== 'POST' || request.url !== notificationPath) {
      // Deliberately terse. An unexpected path learns nothing about what exists.
      return respond(response, 404, { error: 'not found' });
    }

    const chunks = [];
    let size = 0;
    let aborted = false;
    request.on('data', chunk => {
      if (aborted) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        aborted = true;
        respond(response, 413, { error: 'payload too large' });
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', async () => {
      if (aborted) return;
      // The raw bytes as received. Parsing first and re-serialising would change
      // key order and whitespace, and the signature would never match again.
      const rawBody = Buffer.concat(chunks);
      const signatureVerified = squareSignatureIsValid({
        notificationUrl: config.square.webhookUrl,
        rawBody,
        signature: readSquareSignature(request.headers),
        signatureKey: config.square.signatureKey,
      });

      let payload = null;
      try { payload = JSON.parse(rawBody.toString('utf8')); } catch { payload = null; }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        // Recorded as a rejected delivery rather than silently dropped, but a
        // body we cannot parse is never retried.
        log.warn({ event: 'webhook.unparsable', signatureVerified });
        return respond(response, 400, { error: 'invalid body' });
      }

      try {
        await store.recordWebhook({
          provider: 'square',
          environment: config.square.environment,
          externalEventId: String(payload.event_id ?? payload.merchant_id ?? '').slice(0, 200) || `unidentified-${Date.now()}`,
          eventType: String(payload.type ?? 'unknown').slice(0, 100),
          merchantReference: payload.merchant_id ? String(payload.merchant_id).slice(0, 128) : null,
          providerCreatedAt: payload.created_at ?? null,
          payload,
          signatureVerified,
        });
      } catch (error) {
        // Durable acceptance failed, so do not acknowledge. Square retries, and
        // a retry is safe because the event ID deduplicates.
        log.error({ event: 'webhook.not_recorded', reason: error.message });
        return respond(response, 503, { error: 'not recorded' });
      }

      if (!signatureVerified) {
        log.warn({ event: 'webhook.signature_rejected', type: payload.type ?? 'unknown' });
        return respond(response, 401, { error: 'signature rejected' });
      }
      // Acknowledged only after the event is durably ours. Processing happens in
      // the loop, not in the request.
      log.info({ event: 'webhook.accepted', type: payload.type ?? 'unknown' });
      return respond(response, 202, { status: 'accepted' });
    });
    request.on('error', () => { aborted = true; });
  });
}

function respond(response, status, body) {
  const encoded = JSON.stringify(body);
  response.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(encoded), 'cache-control': 'no-store' });
  response.end(encoded);
}

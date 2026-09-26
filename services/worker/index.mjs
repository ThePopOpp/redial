import { readWorkerConfig, workerSummary } from './config.mjs';
import { createStore } from './store.mjs';
import { createWebhookServer } from './server.mjs';
import { decideWebhookOutcome } from './schedule.mjs';

// Structured, value-free logging. This process holds the Square access token and
// the service-role key; nothing it prints may contain either, so entries are
// built from field names and counts rather than from objects in scope.
const log = {
  info: fields => process.stdout.write(`${JSON.stringify({ level: 'info', at: new Date().toISOString(), ...fields })}\n`),
  warn: fields => process.stdout.write(`${JSON.stringify({ level: 'warn', at: new Date().toISOString(), ...fields })}\n`),
  error: fields => process.stderr.write(`${JSON.stringify({ level: 'error', at: new Date().toISOString(), ...fields })}\n`),
};

// What this worker does today, stated plainly so nothing here reads as more
// finished than it is.
//
// It accepts and verifies Square notifications, records them durably, and
// deduplicates redeliveries. It expires usage reservations, stale checkout quotes
// and abandoned leases. It reads approved billing operations.
//
// It does not create subscriptions, send refunds to Square, or grant
// entitlements. Those need an approved catalog, a tested Square client and the
// owner's authorization for live commerce. Each is gated rather than stubbed, so
// a missing piece fails loudly instead of appearing to work.
// Reconciling invoices, payments and entitlement intervals is not implemented.
// The event is already recorded and signature-verified by the time this runs, so
// it is safe to fail: it retries, then dead-letters with a reason an operator can
// read. Returning normally would mark it processed as though it had an effect,
// which is the one outcome that would lose money quietly.
//
// `supersedesRecordedState` in schedule.mjs is the ordering guard this needs
// first, before any business effect, so an older unpaid notification can never
// revoke a period a newer one settled.
async function processWebhook(event) {
  throw new Error(`No handler for ${event.event_type}; recorded and awaiting the reconciliation increment`);
}

async function runMaintenance(store) {
  const now = new Date();
  const runKey = now.toISOString().slice(0, 16);
  await store.recordJobRun({ job: 'billing.maintenance', runKey, now, state: 'claimed' });
  try {
    const metrics = {
      reservations_expired: await store.expireUsageReservations(now),
      quotes_expired: await store.expireCheckoutQuotes(now),
      leases_released: await store.releaseExpiredWebhookLeases(now),
    };
    await store.recordJobRun({ job: 'billing.maintenance', runKey, now: new Date(), state: 'succeeded', metrics });
    return metrics;
  } catch (error) {
    await store.recordJobRun({ job: 'billing.maintenance', runKey, now: new Date(), state: 'failed', error: error.message.slice(0, 500) });
    throw error;
  }
}

async function tick(config, store) {
  const now = new Date();
  const claimed = await store.claimWebhooks({ now, limit: 20 });
  for (const event of claimed) {
    let failure = null;
    try { await processWebhook(event); } catch (error) { failure = error.message; }
    await store.settleWebhook(event.id, decideWebhookOutcome({
      attempts: event.attempts, signatureVerified: event.signature_verified, error: failure, now: new Date(),
    }));
  }
  if (config.providerCalls === 'enabled') {
    const pending = await store.pendingProviderOperations(10);
    if (pending.length) {
      // Refusing is the correct behaviour: silently leaving approved refunds
      // pending would look like a stuck queue, and inventing a provider call
      // would risk a real charge.
      log.error({ event: 'provider_calls.unimplemented', pending: pending.length,
        detail: 'REDIAL_WORKER_PROVIDER_CALLS=enabled but no Square client is implemented' });
    }
  }
  return claimed.length;
}

async function main() {
  const config = readWorkerConfig();
  const store = createStore(config);
  log.info({ event: 'worker.starting', ...workerSummary(config) });

  const server = createWebhookServer({ config, store, log });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, '0.0.0.0', resolve);
  });
  log.info({ event: 'worker.listening', port: config.port });

  let stopping = false;
  let timer = null;
  const stop = signal => {
    if (stopping) return;
    stopping = true;
    log.info({ event: 'worker.stopping', signal });
    if (timer) clearTimeout(timer);
    // Close the ingress first so Square retries the next delivery instead of
    // losing it, then let the in-flight tick finish on its own leases.
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));

  let sinceMaintenance = 0;
  const loop = async () => {
    if (stopping) return;
    try {
      const handled = await tick(config, store);
      sinceMaintenance += 1;
      if (sinceMaintenance * config.pollSeconds >= 60) {
        sinceMaintenance = 0;
        const metrics = await runMaintenance(store);
        log.info({ event: 'worker.maintenance', ...metrics });
      }
      if (handled) log.info({ event: 'worker.tick', handled });
    } catch (error) {
      log.error({ event: 'worker.tick_failed', reason: error.message });
    }
    if (!stopping) timer = setTimeout(loop, config.pollSeconds * 1000);
  };
  timer = setTimeout(loop, 0);
}

main().catch(error => {
  // The message names fields, never values: readWorkerConfig is written that way
  // on purpose so a startup failure is safe to print.
  log.error({ event: 'worker.failed_to_start', reason: error.message });
  process.exit(1);
});

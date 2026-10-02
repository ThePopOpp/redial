import { readWorkerConfig, workerSummary } from './config.mjs';
import { createStore } from './store.mjs';
import { createWebhookServer } from './server.mjs';
import { decideWebhookOutcome } from './schedule.mjs';
import { projectedCall, deletionPlan } from './calls.mjs';

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
// It projects finished screenings into the member-facing call log, deletes
// transcripts past their expiry, and marks recordings past their retention
// deadline. Reaching Twilio's copy of expired audio needs
// REDIAL_WORKER_MEDIA_DELETION=enabled; until then the database side still runs
// and the policies still refuse to serve it, so an expired recording is
// unreadable rather than quietly retained.
//
// It does not transcribe anything. Segments arrive from the gateway's
// transcription webhook; no speech-to-text runs in this process.
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

// The member-facing call log. The gateway writes `call_screenings` while a call
// is in flight, because it has to answer Twilio within the webhook; turning
// that into a call the member can read is deliberately not on that path. A
// projection failure must never be able to affect a live call.
async function projectFinishedCalls(store, limit = 25) {
  const screenings = await store.unprojectedScreenings(limit);
  let projected = 0;
  for (const screening of screenings) {
    const row = projectedCall(screening, {
      callerName: await store.contactNameFor({
        workspaceId: screening.workspace_id, lineId: screening.line_id, phone: screening.from_e164,
      }),
    });
    // isProjectable already filtered on ended_at, so a null here is an outcome
    // the mapping does not cover. Leaving the marker unset means a later
    // version picks it up rather than the call being lost.
    if (!row) continue;
    await store.projectCall(row);
    projected += 1;
  }
  return projected;
}

// Retention, in two halves that must not be confused. The database half always
// runs: expired transcripts are deleted and expired recordings are marked, and
// the policies refuse both regardless. The provider half reaches Twilio's copy
// and is a mutation, so it waits for REDIAL_WORKER_MEDIA_DELETION=enabled.
async function runRetention(config, store, now) {
  const mediaDeletionEnabled = config.mediaDeletion === 'enabled';
  const due = await store.recordingsDue(now, 50);
  let marked = 0, deleted = 0, failed = 0;
  for (const recording of due) {
    const plan = deletionPlan(recording, { now, mediaDeletionEnabled });
    if (plan === 'skip') continue;
    if (plan === 'mark_deleting') {
      if (recording.deletion_state !== 'deleting') { await store.markRecording(recording.id, { state: 'deleting' }); }
      marked += 1;
      continue;
    }
    try {
      await deleteProviderRecording(config, recording);
      await store.markRecording(recording.id, { state: 'deleted' });
      deleted += 1;
    } catch (error) {
      // Recorded as failed rather than retried silently. Audio we believe is
      // gone but is not is the one state nobody should be able to mistake for
      // success, so it stays visible until a run clears it.
      await store.markRecording(recording.id, { state: 'failed', failure: error.message });
      failed += 1;
    }
  }
  return {
    transcripts_purged: await store.purgeExpiredTranscripts(now),
    recordings_marked: marked, recordings_deleted: deleted, recordings_failed: failed,
  };
}

// Twilio's REST API, called directly. The worker needs exactly one verb against
// one resource, so a client library would be a dependency and an attack surface
// for no benefit.
async function deleteProviderRecording(config, recording) {
  if (recording.provider !== 'twilio') throw new Error(`No deletion path for provider ${recording.provider}`);
  const { accountSid, authToken } = config.twilio;
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recording.provider_recording_sid}.json`,
    {
      method: 'DELETE',
      headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  // 404 counts as done: the recording is not at the provider, which is the
  // state we were trying to reach. Anything else is unresolved.
  if (!response.ok && response.status !== 404) {
    throw new Error(`Twilio refused the deletion with status ${response.status}`);
  }
}

async function runMaintenance(config, store) {
  const now = new Date();
  const runKey = now.toISOString().slice(0, 16);
  await store.recordJobRun({ job: 'billing.maintenance', runKey, now, state: 'claimed' });
  try {
    const metrics = {
      reservations_expired: await store.expireUsageReservations(now),
      quotes_expired: await store.expireCheckoutQuotes(now),
      leases_released: await store.releaseExpiredWebhookLeases(now),
      calls_projected: await projectFinishedCalls(store),
      ...await runRetention(config, store, now),
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
        const metrics = await runMaintenance(config, store);
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

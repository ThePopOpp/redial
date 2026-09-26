import { createClient } from '@supabase/supabase-js';
import { leaseExpiry } from './schedule.mjs';

// Service-role data access. Every table touched here carries no policy and no
// grant to anon or authenticated on purpose: provider identity, risk cases,
// per-call meters and worker leases. See 202609260002_billing.sql.
export function createStore(config) {
  const client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    // Record the event before doing anything with it, so a crash between receipt
    // and processing loses nothing. The unique (provider, environment,
    // external_event_id) makes a redelivery a no-op rather than a duplicate.
    async recordWebhook({ provider, environment, externalEventId, eventType, payload, signatureVerified, providerCreatedAt, merchantReference }) {
      const { data, error } = await client.from('webhook_inbox').upsert({
        provider, environment,
        external_event_id: externalEventId,
        event_type: eventType,
        payload,
        signature_verified: signatureVerified,
        provider_created_at: providerCreatedAt ?? null,
        merchant_reference: merchantReference ?? null,
        state: signatureVerified ? 'received' : 'dead_letter',
        dead_letter_reason: signatureVerified ? null : 'Signature verification failed',
      }, { onConflict: 'provider,environment,external_event_id', ignoreDuplicates: true }).select('id').maybeSingle();
      if (error) throw new Error(`Could not record webhook: ${error.message}`);
      return data?.id ?? null;
    },

    // Claim by writing a lease we own. The filter is the concurrency control: two
    // replicas issuing this at once cannot both match the same row, because the
    // second sees a lease_owner already set and a future expiry.
    async claimWebhooks({ now, limit }) {
      const { data, error } = await client
        .from('webhook_inbox')
        .select('id, provider, environment, event_type, payload, attempts, provider_created_at, signature_verified')
        .eq('state', 'received')
        .eq('signature_verified', true)
        .or(`next_attempt_at.is.null,next_attempt_at.lte.${now.toISOString()}`)
        .or(`lease_expires_at.is.null,lease_expires_at.lte.${now.toISOString()}`)
        .order('received_at', { ascending: true })
        .limit(limit);
      if (error) throw new Error(`Could not read the webhook inbox: ${error.message}`);
      const claimed = [];
      for (const row of data ?? []) {
        const { data: updated, error: claimError } = await client
          .from('webhook_inbox')
          .update({ state: 'processing', lease_owner: config.workerId, lease_expires_at: leaseExpiry(now, config.leaseSeconds), attempts: row.attempts + 1 })
          .eq('id', row.id)
          .eq('state', 'received')
          .select('id')
          .maybeSingle();
        if (claimError) throw new Error(`Could not claim a webhook: ${claimError.message}`);
        if (updated) claimed.push(row);
      }
      return claimed;
    },

    async settleWebhook(id, outcome) {
      const { error } = await client.from('webhook_inbox')
        .update({ ...outcome, lease_owner: null, lease_expires_at: null })
        .eq('id', id);
      if (error) throw new Error(`Could not settle a webhook: ${error.message}`);
    },

    // Maintenance. Each of these is internal-only: nothing here contacts a
    // provider or changes what a customer is charged.
    async expireUsageReservations(now) {
      const { data, error } = await client.from('usage_reservations')
        .update({ state: 'expired' })
        .eq('state', 'held')
        .lte('expires_at', now.toISOString())
        .select('id');
      if (error) throw new Error(`Could not expire usage reservations: ${error.message}`);
      return data?.length ?? 0;
    },

    async expireCheckoutQuotes(now) {
      const { data, error } = await client.from('checkout_operations')
        .update({ status: 'expired', failure_reason: 'Quote expired before payment' })
        .in('status', ['created', 'awaiting_payment'])
        .lte('quote_expires_at', now.toISOString())
        .select('id');
      if (error) throw new Error(`Could not expire checkout quotes: ${error.message}`);
      return data?.length ?? 0;
    },

    // A worker that died mid-event leaves 'processing' behind. Returning the row
    // to 'received' lets another replica pick it up; attempts was already
    // incremented at claim time, so a crash loop still reaches the retry ceiling
    // instead of spinning forever.
    async releaseExpiredWebhookLeases(now) {
      const { data, error } = await client.from('webhook_inbox')
        .update({ state: 'received', lease_owner: null, lease_expires_at: null })
        .eq('state', 'processing')
        .lte('lease_expires_at', now.toISOString())
        .select('id');
      if (error) throw new Error(`Could not release expired webhook leases: ${error.message}`);
      return data?.length ?? 0;
    },

    async recordJobRun({ job, runKey, now, state, error: failure, metrics }) {
      const { error } = await client.from('job_runs').upsert({
        job, run_key: runKey, state,
        lease_owner: config.workerId,
        lease_expires_at: leaseExpiry(now, config.leaseSeconds),
        finished_at: state === 'claimed' ? null : now.toISOString(),
        error: failure ?? null,
        metrics: metrics ?? null,
      }, { onConflict: 'job,run_key' });
      if (error) throw new Error(`Could not record a job run: ${error.message}`);
    },

    // Approved refunds and plan changes wait here. The worker only reads them in
    // this increment; executing one needs REDIAL_WORKER_PROVIDER_CALLS=enabled
    // and a Square client that does not exist yet.
    async pendingProviderOperations(limit) {
      const { data, error } = await client.from('billing_operations')
        .select('id, kind, idempotency_key, request, attempts')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) throw new Error(`Could not read billing operations: ${error.message}`);
      return data ?? [];
    },
  };
}

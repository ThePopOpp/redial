// Retry and lease decisions, kept pure so they can be tested without a database
// or a provider. Every function here takes the current time explicitly rather
// than reading the clock, so a test can prove the boundaries instead of sleeping.

export const MAX_ATTEMPTS = 8;

// Exponential with a ceiling, then full jitter. Jitter matters because a
// provider outage makes every pending event fail at once; without it they all
// retry in the same instant and the recovery looks like a second outage.
export function nextAttemptDelaySeconds(attempts, random = Math.random) {
  const bounded = Math.max(1, Math.min(attempts, MAX_ATTEMPTS));
  const ceiling = Math.min(2 ** bounded, 3600);
  return Math.max(1, Math.round(ceiling * (0.5 + 0.5 * random())));
}

// A webhook is retried until MAX_ATTEMPTS, then dead-lettered with a reason so
// an operator sees it rather than it vanishing. A signature failure is never
// retried: the bytes will not become valid later, and retrying would turn a
// forged request into repeated work.
export function decideWebhookOutcome({ attempts, signatureVerified, error, now, random = Math.random }) {
  if (!signatureVerified) {
    return { state: 'dead_letter', dead_letter_reason: 'Signature verification failed', next_attempt_at: null };
  }
  if (!error) {
    return { state: 'processed', dead_letter_reason: null, next_attempt_at: null, processed_at: now.toISOString() };
  }
  const used = attempts + 1;
  if (used >= MAX_ATTEMPTS) {
    return { state: 'dead_letter', dead_letter_reason: truncate(`Failed after ${used} attempts: ${error}`, 500), next_attempt_at: null };
  }
  const delay = nextAttemptDelaySeconds(used, random);
  return { state: 'received', dead_letter_reason: null, next_attempt_at: new Date(now.getTime() + delay * 1000).toISOString() };
}

// A lease, not a lock. A worker that dies mid-event leaves its claim behind, and
// the claim has to expire or the event is stranded until someone notices.
export function leaseExpiry(now, leaseSeconds) {
  return new Date(now.getTime() + leaseSeconds * 1000).toISOString();
}

export function leaseIsExpired(lease, now) {
  if (!lease?.lease_expires_at) return true;
  return new Date(lease.lease_expires_at).getTime() <= now.getTime();
}

// An older provider notification must never undo a newer settled one. Square
// delivers out of order under retry, so the event's own provider timestamp
// decides, and a missing timestamp is treated as too old to trust rather than as
// newest.
export function supersedesRecordedState({ eventTime, recordedTime }) {
  if (!eventTime) return false;
  if (!recordedTime) return true;
  return new Date(eventTime).getTime() > new Date(recordedTime).getTime();
}

function truncate(text, limit) {
  const value = String(text);
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
}

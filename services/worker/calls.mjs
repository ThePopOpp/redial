// Projecting the gateway's record of a call into the member-facing call log,
// and deciding what has outlived its retention.
//
// Pure functions, with no client and no clock of their own, so the decisions
// here are testable without a database or a provider. The store applies them.
//
// The retention numbers themselves live in services/shared/retention.mjs,
// because the gateway sets a deadline that this worker later enforces and two
// copies of that policy would drift. Re-exported here so a reader of the worker
// sees the whole surface in one place.
export { recordingRetentionDeadline, transcriptExpiry, RECORDING_RETENTION_DAYS }
  from '../shared/retention.mjs';

// The gateway records the states it actually goes through; the member-facing
// log answers a narrower question — what happened to this call. Everything that
// ended without the member speaking to the caller reads as missed, because from
// the member's side that is what it was.
const OUTCOMES = {
  connected: 'connected',
  message: 'message',
  blocked: 'blocked',
  declined: 'missed',
  no_answer: 'missed',
  failed: 'missed',
  offered: 'missed',
};

// 'screening' is deliberately absent: it is not terminal. Projecting a call
// still in progress would publish a duration of zero and an outcome that is
// about to change.
export function callOutcomeFor(screeningOutcome) {
  return OUTCOMES[screeningOutcome] ?? null;
}

export function isProjectable(screening) {
  return Boolean(screening?.ended_at) && callOutcomeFor(screening.outcome) !== null;
}

export function callDurationSeconds(screening) {
  const started = Date.parse(screening?.started_at ?? '');
  const ended = Date.parse(screening?.ended_at ?? '');
  if (!Number.isFinite(started) || !Number.isFinite(ended)) return 0;
  // Clamped rather than trusted. Clock skew between the provider's timestamps
  // and ours should not produce a negative duration or an absurd one.
  return Math.min(86400, Math.max(0, Math.round((ended - started) / 1000)));
}

// What the caller said during screening is the only summary that exists at this
// point, and it is a speech-to-text result, not a verified statement. The
// confidence travels with it so the dashboard can say the line was heard poorly
// instead of presenting a bad transcription as fact.
export function projectedCall(screening, { callerName } = {}) {
  if (!isProjectable(screening)) return null;
  return {
    workspace_id: screening.workspace_id,
    line_id: screening.line_id,
    provider_call_sid: screening.provider_call_sid,
    // The number is kept in its own column; this is the display name. A contact
    // renamed later will not update rows already written, which matches how a
    // phone's own call log behaves.
    caller: callerName || 'Unknown caller',
    phone: screening.from_e164,
    outcome: callOutcomeFor(screening.outcome),
    summary: (screening.caller_said ?? '').trim().slice(0, 2000),
    summary_confidence: screening.speech_confidence ?? null,
    ingress: 'pstn',
    started_at: screening.started_at,
    ended_at: screening.ended_at,
    duration_seconds: callDurationSeconds(screening),
  };
}

// Two separate things, and conflating them is how audio outlives its promise.
// A row past its deadline is already invisible to every member, because the
// policy checks the deadline as well as the deletion state. Reaching the
// provider's copy is a provider mutation, so it is gated independently and may
// legitimately be unavailable while the database side still does its job.
export function deletionPlan(recording, { now, mediaDeletionEnabled }) {
  if (!recording?.retention_deadline) return 'skip';
  if (Date.parse(recording.retention_deadline) > now.getTime()) return 'skip';
  if (recording.deletion_state === 'deleted') return 'skip';
  return mediaDeletionEnabled ? 'delete_media' : 'mark_deleting';
}

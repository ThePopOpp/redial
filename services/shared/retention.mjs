// Retention policy, shared by the two units that act on it.
//
// The voice gateway sets a recording's deadline when the provider tells it the
// audio exists. The worker enforces that deadline later. If each unit carried
// its own copy of these numbers they would drift, and the one that drifts is
// the promise made to the member about when their audio disappears.
//
// Deliberately dependency-free and clock-free so it can be copied into both
// container images without pulling anything else along. Both
// Dockerfile.dockerignore files allow services/shared/** for this reason.

// The kit's proposed default: recordings off by default, and thirty days when
// enabled and lawful. See docs/09-data-and-access.md.
export const RECORDING_RETENTION_DAYS = 30;

// Free call history is seven days; paid transcripts and summaries ninety.
export const TRANSCRIPT_MIN_DAYS = 7;
export const TRANSCRIPT_MAX_DAYS = 90;

// A shorter preference is an instruction we honour. A longer one is not: it
// would override the default the member was told about, and quietly extending
// the life of a recording is the one direction that breaks the promise.
export function recordingRetentionDeadline(createdAt, preferredDays) {
  const days = Number.isFinite(preferredDays)
    ? Math.min(RECORDING_RETENTION_DAYS, Math.max(1, Math.trunc(preferredDays)))
    : RECORDING_RETENTION_DAYS;
  return new Date(createdAt.getTime() + days * 86400_000).toISOString();
}

// Transcripts follow the member's retention preference, which the dashboard
// already bounds to the same range. Absent means no preference was saved, not
// that the maximum was wanted, so it falls to the shortest.
export function transcriptExpiry(createdAt, preferredDays) {
  const days = Number.isFinite(preferredDays)
    ? Math.min(TRANSCRIPT_MAX_DAYS, Math.max(TRANSCRIPT_MIN_DAYS, Math.trunc(preferredDays)))
    : TRANSCRIPT_MIN_DAYS;
  return new Date(createdAt.getTime() + days * 86400_000).toISOString();
}

// Turning a provider status callback into something the member can read.
//
// Pure functions. The store applies what these decide, so the rules about what
// is acceptable to store are testable without a database or a provider.

const RECORDING_SID = /^RE[0-9a-fA-F]{32}$/;
const CALL_SID = /^CA[0-9a-fA-F]{32}$/;

export function isRecordingSid(value) {
  return RECORDING_SID.test(String(value ?? ''));
}

export function isCallSid(value) {
  return CALL_SID.test(String(value ?? ''));
}

// Twilio reports a recording's lifecycle. Only a completed one has final audio
// and a settled duration; acting on 'in-progress' would store a reference to
// something still being written.
export function recordingIsComplete(params) {
  return (params?.RecordingStatus ?? '') === 'completed';
}

export function recordingDuration(params) {
  const seconds = Number(params?.RecordingDuration);
  if (!Number.isFinite(seconds)) return 0;
  return Math.min(86400, Math.max(0, Math.trunc(seconds)));
}

export function recordingChannels(params) {
  // record-from-answer-dual produces two channels; anything else we treat as
  // one rather than guessing.
  return Number(params?.RecordingChannels) === 2 ? 2 : 1;
}

// Everything that has to be true before audio is referenced on this side.
// Returning a reason rather than a boolean so the refusal can be logged as a
// named condition instead of a generic failure.
export function recordingRefusal({ params, consentId, callId }) {
  if (!recordingIsComplete(params)) return 'not_completed';
  if (!isRecordingSid(params?.RecordingSid)) return 'bad_recording_sid';
  if (!isCallSid(params?.CallSid)) return 'bad_call_sid';
  // The capture happened, so refusing to store the reference would leave the
  // audio at the provider with nothing tracking it. The caller must treat this
  // as an incident, not as a quiet skip.
  if (!consentId) return 'no_consent';
  if (!callId) return 'call_not_logged';
  return null;
}

// Twilio posts a transcription as one body per recording, not as timed
// segments. Splitting on sentence boundaries gives the dashboard something
// readable while being honest that these are not speaker-separated turns: the
// speaker is recorded as the line, because dual-channel attribution is not
// something this payload supports.
export function transcriptSegmentsFrom({ text, maxSegments = 200, maxLength = 1000 }) {
  const body = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!body) return [];
  const sentences = body.match(/[^.!?]+[.!?]*\s*/g) ?? [body];
  const segments = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength && current) { segments.push(current.trim()); current = ''; }
    current += sentence;
    // A single sentence longer than the limit is cut rather than dropped.
    while (current.length > maxLength) { segments.push(current.slice(0, maxLength).trim()); current = current.slice(maxLength); }
    if (segments.length >= maxSegments) break;
  }
  if (current.trim() && segments.length < maxSegments) segments.push(current.trim());
  return segments.slice(0, maxSegments);
}

// A transcription is a record of what both parties said, so it is refused on
// the same terms as audio: without consent it is not stored at all.
export function transcriptionRefusal({ params, consentId, callId }) {
  if (!isCallSid(params?.CallSid)) return 'bad_call_sid';
  if ((params?.TranscriptionStatus ?? '') !== 'completed') return 'not_completed';
  if (!String(params?.TranscriptionText ?? '').trim()) return 'empty';
  if (!consentId) return 'no_consent';
  if (!callId) return 'call_not_logged';
  return null;
}

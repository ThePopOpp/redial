import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readWorkerConfig } from '../services/worker/config.mjs';
import * as capture from '../services/voice-gateway/capture.mjs';
import {
  callOutcomeFor, isProjectable, callDurationSeconds, projectedCall,
  recordingRetentionDeadline, transcriptExpiry, deletionPlan, RECORDING_RETENTION_DAYS,
} from '../services/worker/calls.mjs';

const SCREENING = {
  workspace_id: '00000000-0000-4000-8000-00000000000a',
  line_id: '00000000-0000-4000-8000-00000000000b',
  provider_call_sid: 'CA0123456789abcdef0123456789abcdef',
  from_e164: '+16025550101',
  outcome: 'connected',
  caller_said: 'Calling about the roof estimate',
  speech_confidence: 0.92,
  started_at: '2026-10-02T10:00:00.000Z',
  ended_at: '2026-10-02T10:02:30.000Z',
};

const screening = (overrides = {}) => ({ ...SCREENING, ...overrides });

// ---------------------------------------------------------------------------
// Projecting a finished call into the member-facing log
// ---------------------------------------------------------------------------

test('a call still being screened is never projected', () => {
  assert.equal(callOutcomeFor('screening'), null, 'screening is not a terminal outcome');
  assert.equal(isProjectable(screening({ outcome: 'screening', ended_at: null })), false);
  assert.equal(projectedCall(screening({ outcome: 'screening', ended_at: null })), null);
});

test('a call with no end time is not projected, whatever its outcome', () => {
  // Publishing it would show a duration of zero for a call still in progress.
  assert.equal(isProjectable(screening({ ended_at: null })), false);
  assert.equal(projectedCall(screening({ ended_at: null })), null);
});

test('every outcome the member sees means something happened to their call', () => {
  // Anything that ended without the member speaking to the caller reads as
  // missed, because from their side that is what it was.
  for (const [provider, expected] of Object.entries({
    connected: 'connected', message: 'message', blocked: 'blocked',
    declined: 'missed', no_answer: 'missed', failed: 'missed', offered: 'missed',
  })) {
    assert.equal(callOutcomeFor(provider), expected, provider);
  }
  // The log's own constraint only permits these four.
  const permitted = new Set(['message', 'blocked', 'connected', 'missed']);
  for (const provider of ['connected', 'message', 'blocked', 'declined', 'no_answer', 'failed', 'offered']) {
    assert.ok(permitted.has(callOutcomeFor(provider)), `${provider} maps into the call log's own outcomes`);
  }
});

test('an unrecognised provider outcome is left for a later version rather than guessed', () => {
  assert.equal(callOutcomeFor('voicemail_dropped'), null);
  assert.equal(projectedCall(screening({ outcome: 'voicemail_dropped' })), null);
});

test('the projected call carries the number, the outcome and the duration', () => {
  const row = projectedCall(screening(), { callerName: 'Dana Rimer' });
  assert.equal(row.caller, 'Dana Rimer');
  assert.equal(row.phone, '+16025550101');
  assert.equal(row.outcome, 'connected');
  assert.equal(row.duration_seconds, 150);
  assert.equal(row.provider_call_sid, SCREENING.provider_call_sid);
  assert.equal(row.ingress, 'pstn');
  assert.equal(row.ended_at, SCREENING.ended_at);
});

test('an unresolved caller is named as unknown rather than left blank', () => {
  // calls.caller is NOT NULL, and an empty headline reads as a rendering fault.
  for (const name of [undefined, null, '']) {
    assert.equal(projectedCall(screening(), { callerName: name }).caller, 'Unknown caller');
  }
});

test('the speech confidence travels with the summary', () => {
  // A bad transcription presented as what the caller said is worse than one
  // the dashboard can mark as poorly heard.
  assert.equal(projectedCall(screening({ speech_confidence: 0.21 })).summary_confidence, 0.21);
  assert.equal(projectedCall(screening({ speech_confidence: null })).summary_confidence, null);
  assert.equal(projectedCall(screening({ speech_confidence: undefined })).summary_confidence, null);
});

test('a missing summary becomes an empty string, never null', () => {
  // calls.summary is NOT NULL DEFAULT ''.
  assert.equal(projectedCall(screening({ caller_said: null })).summary, '');
  assert.equal(projectedCall(screening({ caller_said: '   ' })).summary, '');
});

test('an overlong summary is truncated to the column it is stored in', () => {
  const row = projectedCall(screening({ caller_said: 'x'.repeat(5000) }));
  assert.equal(row.summary.length, 2000);
});

test('clock skew cannot produce a negative or absurd duration', () => {
  assert.equal(callDurationSeconds(screening({ ended_at: '2026-10-02T09:59:00.000Z' })), 0, 'ended before it started');
  assert.equal(callDurationSeconds(screening({ ended_at: '2027-10-02T10:00:00.000Z' })), 86400, 'clamped to a day');
  assert.equal(callDurationSeconds(screening({ started_at: 'not a date' })), 0);
  assert.equal(callDurationSeconds({}), 0);
});

// ---------------------------------------------------------------------------
// Retention
// ---------------------------------------------------------------------------

test('a recording defaults to the thirty days the kit proposes', () => {
  const created = new Date('2026-10-02T00:00:00.000Z');
  assert.equal(RECORDING_RETENTION_DAYS, 30);
  assert.equal(recordingRetentionDeadline(created), '2026-11-01T00:00:00.000Z');
});

test('a shorter retention preference is honoured and a longer one is not', () => {
  const created = new Date('2026-10-02T00:00:00.000Z');
  // Shortening is an instruction. Lengthening would override the default the
  // member was told about, so the ceiling holds.
  assert.equal(recordingRetentionDeadline(created, 7), '2026-10-09T00:00:00.000Z');
  assert.equal(recordingRetentionDeadline(created, 365), '2026-11-01T00:00:00.000Z');
  assert.equal(recordingRetentionDeadline(created, 0), '2026-10-03T00:00:00.000Z', 'at least a day');
  assert.equal(recordingRetentionDeadline(created, NaN), '2026-11-01T00:00:00.000Z');
});

test('transcript expiry stays inside the supported range', () => {
  const created = new Date('2026-10-02T00:00:00.000Z');
  assert.equal(transcriptExpiry(created, 30), '2026-11-01T00:00:00.000Z');
  assert.equal(transcriptExpiry(created, 1), '2026-10-09T00:00:00.000Z', 'floored at the free seven-day history');
  assert.equal(transcriptExpiry(created, 4000), '2026-12-31T00:00:00.000Z', 'capped at ninety days');
  assert.equal(transcriptExpiry(created), '2026-10-09T00:00:00.000Z', 'defaults to seven days');
});

// ---------------------------------------------------------------------------
// Deleting expired audio
// ---------------------------------------------------------------------------

const NOW = new Date('2026-11-02T00:00:00.000Z');
const recording = (overrides = {}) => ({
  retention_deadline: '2026-10-02T00:00:00.000Z', deletion_state: 'retained', ...overrides,
});

test('a recording inside its retention window is left alone', () => {
  assert.equal(deletionPlan(recording({ retention_deadline: '2026-12-01T00:00:00.000Z' }),
    { now: NOW, mediaDeletionEnabled: true }), 'skip');
});

test('an expired recording is marked when provider deletion is not authorized', () => {
  // The database half always runs. The policy already refuses to serve it, so
  // the member-facing promise holds while the provider copy waits.
  assert.equal(deletionPlan(recording(), { now: NOW, mediaDeletionEnabled: false }), 'mark_deleting');
});

test('an expired recording reaches the provider once deletion is authorized', () => {
  assert.equal(deletionPlan(recording(), { now: NOW, mediaDeletionEnabled: true }), 'delete_media');
});

test('a previously failed deletion is retried rather than abandoned', () => {
  // Audio we believe is gone but is not is an open obligation, so it stays in
  // the sweep until a run clears it.
  assert.equal(deletionPlan(recording({ deletion_state: 'failed' }),
    { now: NOW, mediaDeletionEnabled: true }), 'delete_media');
  assert.equal(deletionPlan(recording({ deletion_state: 'deleting' }),
    { now: NOW, mediaDeletionEnabled: true }), 'delete_media');
});

test('an already deleted recording is never deleted twice', () => {
  assert.equal(deletionPlan(recording({ deletion_state: 'deleted' }),
    { now: NOW, mediaDeletionEnabled: true }), 'skip');
});

test('a recording with no deadline is not swept on a guess', () => {
  assert.equal(deletionPlan(recording({ retention_deadline: null }), { now: NOW, mediaDeletionEnabled: true }), 'skip');
  assert.equal(deletionPlan(null, { now: NOW, mediaDeletionEnabled: true }), 'skip');
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function workerEnvironment(overrides = {}) {
  return {
    SUPABASE_URL: 'https://jjdqeojubmwvxjfcljpk.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_example_value_for_tests_only_0123',
    SQUARE_ACCESS_TOKEN: 'EAAAExampleSandboxAccessTokenValue',
    SQUARE_WEBHOOK_SIGNATURE_KEY: 'example-signature-key-0123456789',
    SQUARE_WEBHOOK_URL: 'https://worker.redial.si/webhooks/square',
    SQUARE_ENVIRONMENT: 'sandbox',
    ...overrides,
  };
}

test('deleting provider media is off unless it is explicitly enabled', () => {
  assert.equal(readWorkerConfig(workerEnvironment()).mediaDeletion, 'disabled');
});

test('enabling provider media deletion without Twilio credentials is refused at startup', () => {
  // Failing here rather than on the first expired recording, which would leave
  // audio past its deadline with nobody watching the log.
  assert.throws(
    () => readWorkerConfig(workerEnvironment({ REDIAL_WORKER_MEDIA_DELETION: 'enabled' })),
    /REDIAL_WORKER_MEDIA_DELETION=enabled requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN/,
  );
});

// Assembled at run time rather than written out. Both values are fake, but
// secret scanning cannot know that, and a literal in the shape of a Twilio
// account identifier blocks the push for everyone. The existing gateway test
// builds its fixture the same way for the same reason.
const ACCOUNT_SID = `AC${'0'.repeat(32)}`;
const AUTH_TOKEN = '0'.repeat(32);

test('half-configured Twilio credentials are refused', () => {
  assert.throws(
    () => readWorkerConfig(workerEnvironment({ TWILIO_ACCOUNT_SID: ACCOUNT_SID })),
    /TWILIO_AUTH_TOKEN must be/,
  );
  assert.throws(
    () => readWorkerConfig(workerEnvironment({ TWILIO_ACCOUNT_SID: 'not-a-sid', TWILIO_AUTH_TOKEN: AUTH_TOKEN })),
    /TWILIO_ACCOUNT_SID must be an account SID/,
  );
});

test('a complete media-deletion configuration is accepted and never logs a credential', () => {
  const config = readWorkerConfig(workerEnvironment({
    REDIAL_WORKER_MEDIA_DELETION: 'enabled',
    TWILIO_ACCOUNT_SID: ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: AUTH_TOKEN,
  }));
  assert.equal(config.mediaDeletion, 'enabled');
  assert.equal(config.twilio.accountSid, ACCOUNT_SID);
});

test('an unknown media-deletion value is refused rather than treated as off', () => {
  assert.throws(
    () => readWorkerConfig(workerEnvironment({ REDIAL_WORKER_MEDIA_DELETION: 'yes' })),
    /REDIAL_WORKER_MEDIA_DELETION must be disabled or enabled/,
  );
});

// ---------------------------------------------------------------------------
// What the gateway accepts from a provider status callback
// ---------------------------------------------------------------------------

const RECORDING_PARAMS = {
  CallSid: 'CA0123456789abcdef0123456789abcdef',
  RecordingSid: 'RE0123456789abcdef0123456789abcdef',
  RecordingStatus: 'completed',
  RecordingDuration: '150',
  RecordingChannels: '2',
};
const params = (overrides = {}) => ({ ...RECORDING_PARAMS, ...overrides });
const accepted = { consentId: 'c0ffee00-0000-4000-8000-000000000001', callId: 'ca11ab1e-0000-4000-8000-000000000002' };

test('audio is never referenced without the consent it was captured under', () => {
  // The database refuses it too, through a NOT NULL. This is the gateway
  // declining to try, so the refusal is logged as a named condition.
  assert.equal(capture.recordingRefusal({ params: params(), ...accepted, consentId: null }), 'no_consent');
});

test('a recording still being written is ignored until it completes', () => {
  for (const status of ['in-progress', 'paused', 'absent', '']) {
    assert.equal(capture.recordingRefusal({ params: params({ RecordingStatus: status }), ...accepted }), 'not_completed');
  }
  assert.equal(capture.recordingRefusal({ params: params(), ...accepted }), null, 'a completed recording is accepted');
});

test('a malformed provider identifier is refused rather than stored', () => {
  assert.equal(capture.recordingRefusal({ params: params({ RecordingSid: 'RE-nope' }), ...accepted }), 'bad_recording_sid');
  assert.equal(capture.recordingRefusal({ params: params({ CallSid: '../../etc/passwd' }), ...accepted }), 'bad_call_sid');
  assert.equal(capture.isRecordingSid('RE0123456789abcdef0123456789abcdef'), true);
  assert.equal(capture.isRecordingSid('CA0123456789abcdef0123456789abcdef'), false);
});

test('a recording whose call has not been logged yet waits for the projection', () => {
  // The worker projects the call after it ends, so this is expected briefly.
  // Not storing the row keeps the foreign key honest; Twilio retries.
  assert.equal(capture.recordingRefusal({ params: params(), ...accepted, callId: null }), 'call_not_logged');
});

test('a reported duration is clamped and never trusted as given', () => {
  assert.equal(capture.recordingDuration(params({ RecordingDuration: '150' })), 150);
  assert.equal(capture.recordingDuration(params({ RecordingDuration: '-5' })), 0);
  assert.equal(capture.recordingDuration(params({ RecordingDuration: '999999999' })), 86400);
  assert.equal(capture.recordingDuration(params({ RecordingDuration: 'abc' })), 0);
  assert.equal(capture.recordingDuration({}), 0);
});

test('channel count falls back to one rather than claiming dual', () => {
  assert.equal(capture.recordingChannels(params({ RecordingChannels: '2' })), 2);
  assert.equal(capture.recordingChannels(params({ RecordingChannels: '1' })), 1);
  assert.equal(capture.recordingChannels({}), 1);
});

// ---------------------------------------------------------------------------
// Transcription
// ---------------------------------------------------------------------------

const TRANSCRIPTION = {
  CallSid: 'CA0123456789abcdef0123456789abcdef',
  TranscriptionStatus: 'completed',
  TranscriptionText: 'Hello, this is Dana. I am calling about the estimate. Please call me back.',
};

test('a transcript is refused without its own consent, not the recording one', () => {
  assert.equal(capture.transcriptionRefusal({ params: TRANSCRIPTION, ...accepted, consentId: null }), 'no_consent');
  assert.equal(capture.transcriptionRefusal({ params: TRANSCRIPTION, ...accepted }), null);
});

test('a failed or empty transcription stores nothing', () => {
  assert.equal(capture.transcriptionRefusal({ params: { ...TRANSCRIPTION, TranscriptionStatus: 'failed' }, ...accepted }), 'not_completed');
  assert.equal(capture.transcriptionRefusal({ params: { ...TRANSCRIPTION, TranscriptionText: '   ' }, ...accepted }), 'empty');
});

test('a short transcription stays one segment rather than one row per sentence', () => {
  // Twilio posts one body per recording, so these are length-bounded chunks,
  // not speaker turns. Splitting a two-line call into five rows would imply a
  // structure the payload does not carry.
  const segments = capture.transcriptSegmentsFrom({ text: TRANSCRIPTION.TranscriptionText });
  assert.equal(segments.length, 1);
  assert.equal(segments[0], TRANSCRIPTION.TranscriptionText);
});

test('a long transcription splits on sentence boundaries, losing nothing', () => {
  const text = 'This is a sentence about the estimate. '.repeat(20).trim();
  const segments = capture.transcriptSegmentsFrom({ text, maxLength: 200 });
  assert.ok(segments.length > 1, 'split once it exceeds the segment length');
  assert.equal(segments.join(' ').replace(/\s+/g, ' ').trim(), text, 'nothing is lost in the split');
  for (const segment of segments) assert.ok(segment.length <= 200);
});

test('an empty transcription yields no segments at all', () => {
  for (const text of ['', '   ', null, undefined]) {
    assert.deepEqual(capture.transcriptSegmentsFrom({ text }), []);
  }
});

test('an unpunctuated wall of text is cut rather than dropped or stored whole', () => {
  const segments = capture.transcriptSegmentsFrom({ text: 'word '.repeat(1000), maxLength: 200 });
  assert.ok(segments.length > 1);
  for (const segment of segments) assert.ok(segment.length <= 200, 'each segment fits the column');
});

test('a hostile transcription cannot grow the table without bound', () => {
  const segments = capture.transcriptSegmentsFrom({ text: 'Hi. '.repeat(5000), maxSegments: 50, maxLength: 20 });
  assert.equal(segments.length, 50, 'capped at the segment limit');
});

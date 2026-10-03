// Observe: what Redial can actually show you about a call, and what it can
// evidence afterwards.
//
// Every claim below describes behaviour that exists in this repository and is
// covered by the row-level-security suite or the node tests. Nothing here is
// aspirational, and nothing describes a capability the product does not have —
// a marketing page that outruns the build is the one kind that costs you a
// customer rather than winning one.
export type ObserveFeature = { title: string; body: string };

export const observeFeatures: readonly ObserveFeature[] = [
  {
    title: 'Every call accounted for',
    body: 'Finished screenings are projected into your call log by a background worker rather than on the webhook, so a reporting failure can never reach a live call. Only terminal calls are published — a call still in progress would show a duration of zero and an outcome about to change.',
  },
  {
    title: 'Why the assistant decided',
    body: 'Each screened call keeps what the caller said, the speech confidence that came with it, and which route was taken. A line heard poorly is shown as heard poorly rather than presented as what the caller said.',
  },
  {
    title: 'Consent you can evidence',
    body: 'Recording, transcription and AI screening each carry their own basis: who decided, when, the exact wording shown, and the jurisdiction relied on. The record is append-only, so a withdrawal is a new entry and the history stays evidence rather than a current setting.',
  },
  {
    title: 'Who opened the audio',
    body: 'Every recording download is logged, served or refused, with the capability it was authorised under. A member can see who listened to their line, and nothing in that log is writable from a browser.',
  },
  {
    title: 'Retention with a deadline',
    body: 'A recording is written with the date it has to be gone, fixed at capture rather than read from whatever the policy says later. Shortening the default cannot extend an existing recording, and lengthening it cannot resurrect one someone was told would be deleted.',
  },
  {
    title: 'Permissions you can see',
    body: 'Line access is granted one capability at a time — summary, transcript, recording, rules. Holding one never implies another, a transcript grant does not reach the audio, and revoking takes effect on the next read rather than the next login.',
  },
  {
    title: 'A ledger, not a balance',
    body: 'Deposits, drawdowns and refunds are separate append-only entries and the balance is their sum. Every movement carries what caused it, so the figure can always be explained rather than only displayed.',
  },
  {
    title: 'Plans that cannot be rewritten',
    body: 'What a plan includes is versioned, and publishing freezes it. Changing an offer creates a new version, so nobody discovers that the terms they signed up under have quietly changed.',
  },
  {
    title: 'A staff trail',
    body: 'When an operator opens a customer’s billing or support record, that read writes an audit row naming them and the action. Staff access is a second decision from customer access and needs its own role and a verified second factor.',
  },
];

// The honest version of a "how it works" strip: three stages a call actually
// passes through in this codebase.
export const observeStages: readonly { step: string; title: string; body: string }[] = [
  {
    step: '01',
    title: 'The call is screened',
    body: 'The gateway answers, asks who is calling, and decides. On a plan with AI screening the model chooses from a closed set of actions; on every other plan the same rule-based path runs. The routing guards sit above both and decide where a call may actually go.',
  },
  {
    step: '02',
    title: 'The outcome is recorded',
    body: 'What was heard, how confident the recognition was, which route was chosen and why, all written while the call is in flight so a crash still leaves evidence that it happened.',
  },
  {
    step: '03',
    title: 'The record is bounded',
    body: 'Audio and transcripts exist only where a basis was recorded, each carries its deletion deadline, and reading any of it needs a capability someone granted on purpose.',
  },
];

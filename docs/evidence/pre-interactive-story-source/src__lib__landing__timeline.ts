export const chapters = [
  { id: 'incoming', label: 'The call', kicker: 'A little more intention on the line', title: 'Your phone rings.\nYour day doesn’t have to stop.', emphasis: 'doesn’t have to stop.', body: 'Meet the assistant that gives every call a little context—and gives you a little more of your day.', note: 'Scroll to follow one illustrative call.', side: 'left' },
  { id: 'screening', label: 'Screen', kicker: '01 / A thoughtful first response', title: 'Let the conversation\nstart with Redial.', emphasis: 'start with Redial.', body: 'On a supported setup, your assistant answers, introduces itself, and asks who’s calling and why. You decide which calls it screens.', note: 'A dedicated number can screen first. Conditional forwarding may ring your phone first.', side: 'right' },
  { id: 'transcript', label: 'Understand', kicker: '02 / Context, as it happens', title: 'Read the room.\nWithout picking up.', emphasis: 'Without picking up.', body: 'Follow the conversation in a live transcript. A name, a reason, a little urgency—the details that help you decide what comes next.', note: 'Transcription follows the line’s processing notice, consent and access settings.', side: 'left' },
  { id: 'insider', label: 'Insider', kicker: '03 / Insider · Listen live', title: 'An ear on the call.\nA moment to decide.', emphasis: 'A moment to decide.', body: 'Listen to the caller and your assistant without adding your microphone to the conversation. Leave when you like; their conversation continues.', note: 'Available to authorized listeners on supported, consented calls.', side: 'left' },
  { id: 'audible', label: 'Audible', kicker: '04 / Audible · Guide the assistant', title: 'A private word.\nA better next question.', emphasis: 'A better next question.', body: '“Ask whether tomorrow morning works.” Send a short instruction to your assistant while the call continues, without joining the conversation yourself.', note: 'Private guidance stays separate from the caller transcript. Delivery does not guarantee obedience.', side: 'right' },
  { id: 'gavel', label: 'Gavel', kicker: '05 / Gavel · Take over', title: 'When it’s your call,\ntake the conversation.', emphasis: 'take the conversation.', body: 'Ready to speak? Gavel prepares your connection, then stops and removes the AI before you take over. One conversation. A clear handoff.', note: 'The assistant leaves before your microphone opens. No silent return to the call.', side: 'left' },
  { id: 'directory', label: 'Directory', kicker: '06 / Directory · Make a connection', title: 'The right conversation.\nThe right person.', emphasis: 'The right person.', body: 'Send the caller to an approved destination. Redial keeps the current handler until the next person accepts, so the caller isn’t left in between.', note: 'Saved phones first. Extensions and other routes require their own compatibility checks.', side: 'right' },
  { id: 'summary', label: 'Keep the context', kicker: '07 / A useful ending', title: 'The call moves on.\nThe context stays.', emphasis: 'The context stays.', body: 'Find a concise summary, the transcript when enabled, and a clear next step in your inbox. Follow up when you’re ready.', note: 'Your calls stay personal. Shared billing does not automatically share their content.', side: 'left' },
  { id: 'begin', label: 'Your turn', kicker: 'Your quieter day starts here', title: 'Same you.\nA little more quiet.', emphasis: 'A little more quiet.', body: 'Let’s make room for the calls that matter. Start with one line, your preferences, and an assistant that feels like you.', note: 'Keep scrolling to step inside your setup.', side: 'center' },
] as const;
export const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
export const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
// The scene is a pure function of scroll position. No time-based animation can
// leave the call story in a different state when the reader scrolls backward.
const poses = [
  [2.1, -.15, 0, .12, -.38, -.09, 1],
  [-2.2, -.05, -.3, .12, .40, .075, .96],
  [2.15, -.12, .1, -.04, -.14, -.035, 1.06],
  [2.05, -.06, 0, .07, -.25, .04, 1],
  [-2.25, -.12, .1, -.06, .28, -.04, 1.02],
  [2.1, -.10, .1, 0, -.08, .02, 1.06],
  [-2.2, -.12, -.2, .08, .30, .055, .98],
  [2.05, -.10, 0, -.04, -.17, -.045, 1],
  [0, -.70, -.4, 0, 0, 0, .85],
  [0, -1.55, 1, 0, 0, 0, 2.8],
];
const tones = [
  [171, 147, 255], [144, 167, 255], [128, 187, 240],
  [115, 209, 194], [181, 146, 255], [223, 185, 136],
  [133, 182, 251], [187, 159, 234], [171, 147, 255], [171, 147, 255],
];
// A complete material -> drawing -> material pass, driven only by the scroll.
function tracingPass(position: number, start: number, peak: number, end: number) {
  return smooth((position - start) / (peak - start)) * (1 - smooth((position - peak - .16) / (end - peak - .16)));
}
export function timeline(progress: number, mobile = false) {
  const position = clamp(progress) * 9;
  const index = Math.min(8, Math.floor(position));
  const local = position - index;
  // Hold each composition, then slide into the next one.
  const transition = smooth((local - .62) / .38);
  const pose = poses[index].map((value, axis) => mix(value, poses[index + 1][axis], transition));
  const travel = Math.sin(transition * Math.PI);
  // A shallow descending camera arc gives each slide real depth without
  // scroll hijacking or moving any of the interactive onboarding fields.
  pose[1] -= travel * .55;
  pose[2] -= travel * .65;
  pose[3] += travel * .11;
  pose[5] += travel * (index % 2 ? -.075 : .075);
  if (mobile) { pose[0] = 0; pose[1] = index >= 8 ? mix(-1.6, -2.1, transition) : -1.65; pose[6] *= .64; pose[4] *= .65; }
  const outline = Math.max(tracingPass(position, .20, .58, 1.16), tracingPass(position, 3.58, 3.88, 4.32), tracingPass(position, 7.60, 7.95, 8.36), smooth((position - 8.53) / .22));
  const traceDraw = Math.max(smooth((position - .20) / .42) * (1 - smooth((position - .94) / .22)), smooth((position - 3.58) / .34) * (1 - smooth((position - 4.14) / .18)), smooth((position - 7.60) / .37) * (1 - smooth((position - 8.18) / .18)), smooth((position - 8.48) / .32));
  const tone = tones[index].map((value, channel) => Math.round(mix(value, tones[index + 1][channel], transition)));
  return { position, chapter: Math.min(8, Math.floor(position + .13)), local, transition, travel, pose, outline, traceDraw, tone, cameraZ: 11.5 + travel * .3, formReveal: smooth((position - 8.80) / .20), sceneOpacity: 1 - smooth((position - 8.94) / .06), screenOpacity: 1 - smooth((position - 8.65) / .13) };
}

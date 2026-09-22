import sample from './sample-call.json';
import { clamp, smooth, stagedReveal } from './timeline';

export const sampleCall = sample;
export const guidanceChoices = [
  { id: 'timing', label: 'Suggest 10 AM', instruction: 'Ask whether 10 AM works.', agent: 'Would 10 AM tomorrow work for the delivery?', caller: 'Yes, 10 AM works. I’ll see you then.' },
  { id: 'signature', label: 'Check the signature', instruction: 'Ask if a signature is needed.', agent: 'Will someone need to sign for the delivery?', caller: 'Yes, a signature is needed. Reception can sign.' },
  { id: 'reference', label: 'Get a reference', instruction: 'Ask for the delivery reference.', agent: 'Could you share the delivery reference?', caller: 'The reference is RD-0142. I’ll leave it with reception.' },
] as const;
export type GuidanceId = typeof guidanceChoices[number]['id'];
export function sampleTimeFor(position: number) {
  const chapter = Math.floor(position), phase = position - chapter;
  // Keep the scrollable conversation available after its card has unfolded.
  const reading = chapter === 2 || chapter === 3 ? clamp((phase - .58) / .22) : clamp(phase / .64);
  return reading * (chapter === 1 ? sample.turns[0].end : sample.duration);
}
export function sampleTurnAt(time: number) {
  return Math.max(0, sample.turns.findLastIndex(turn => time >= turn.start));
}
export function overlayMotion(position: number, chapter: number) {
  const phase = position - chapter;
  const enter = chapter === 0 ? 1 : smooth((phase + .13) / .13);
  const { rise, details } = stagedReveal(position, chapter);
  return { rise, details, glow: rise, scale: .62 + rise * .54, opacity: enter * (1 - smooth((phase - .78) / .08)) };
}
export function screeningWordMotion(position: number) {
  const phase = clamp(position - 1);
  const bloom = smooth((phase - .18) / .22), soften = smooth((phase - .42) / .37);
  return { x: -soften * 12, y: -soften * 65, scale: 1 + soften * .60, glow: .5 + bloom * .5, blur: soften * 22, opacity: .88 * smooth((position - .90) / .15) * (1 - smooth((phase - .51) / .33)) };
}
export function formatSampleTime(time: number) { return `0:${String(Math.floor(time)).padStart(2, '0')}`; }

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
  const chapter = Math.floor(position), phase = clamp((position - chapter) / .64);
  return phase * (chapter === 1 ? sample.turns[0].end : sample.duration);
}
export function sampleTurnAt(time: number) {
  return Math.max(0, sample.turns.findLastIndex(turn => time >= turn.start));
}
export function overlayMotion(position: number, chapter: number) {
  const phase = position - chapter;
  const enter = chapter === 0 ? 1 : smooth((phase + .13) / .13);
  if (chapter < 2) {
    const { rise, details } = stagedReveal(position, chapter);
    return { rise, details, glow: rise, scale: .62 + rise * .54, opacity: enter * (1 - smooth((phase - .74) / .12)) };
  }
  const rise = smooth(phase / .62);
  return { rise, details: 1, glow: 0, scale: 1 + rise * .16, opacity: enter * (1 - smooth((phase - .66) / .20)) };
}
export function screeningWordMotion(position: number) {
  const phase = clamp(position - 1);
  const bloom = smooth((phase - .18) / .22), soften = smooth((phase - .36) / .43);
  return { x: 5 - soften * 22, y: 28 - soften * 95, scale: 1 + soften * .60, glow: .5 + bloom * .5, blur: soften * 22, opacity: .66 * smooth((position - .90) / .15) * (1 - smooth((phase - .45) / .39)) };
}
export function formatSampleTime(time: number) { return `0:${String(Math.floor(time)).padStart(2, '0')}`; }

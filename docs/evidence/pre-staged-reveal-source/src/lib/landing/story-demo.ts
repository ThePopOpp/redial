import sample from './sample-call.json';
import { clamp, smooth } from './timeline';

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
  const rise = smooth(phase / .62);
  const enter = chapter === 0 ? 1 : smooth((phase + .13) / .13);
  return { rise, scale: 1 + rise * .16, opacity: enter * (1 - smooth((phase - .66) / .20)) };
}
export function screeningWordMotion(position: number) {
  const phase = clamp(position - 1);
  return { x: 12 - phase * 42, y: 30 - phase * 90, blur: phase * 12, opacity: .16 * smooth((position - .86) / .16) * (1 - smooth(phase / .86)) };
}
export function formatSampleTime(time: number) { return `0:${String(Math.floor(time)).padStart(2, '0')}`; }

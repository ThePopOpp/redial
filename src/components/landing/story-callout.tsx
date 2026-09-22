'use client';
import { useId, type CSSProperties } from 'react';
import { AudioLines, Check, CheckCheck, Gavel, Headphones, LockKeyhole, MessageSquare, Network, Pause, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatSampleTime, guidanceChoices, overlayMotion, sampleCall, sampleTurnAt, type GuidanceId } from '@/lib/landing/story-demo';
import { clamp } from '@/lib/landing/timeline';
import type { SampleAudio } from './use-sample-audio';

const cards = [
  { title: 'A call, considered.', body: 'The rest of your day stays yours.', icon: Sparkles, label: 'Incoming call' },
  { title: 'Your assistant is answering.', body: 'A name. A reason. A next step.', icon: AudioLines, label: 'Screening' },
  { title: 'Context, captured.', body: 'Follow the conversation at your pace.', icon: MessageSquare, label: 'Live transcript' },
  { title: 'Your mic stays off.', body: 'Listen without interrupting.', icon: Headphones, label: 'Insider' },
  { title: 'A private word.', body: 'Choose the next question.', icon: LockKeyhole, label: 'Audible' },
  { title: 'The AI steps away.', body: 'Your voice takes the lead.', icon: Gavel, label: 'Gavel' },
  { title: 'A considered connection.', body: 'Acceptance before transfer.', icon: Network, label: 'Directory' },
  { title: 'Ready when you are.', body: 'The details are in your inbox.', icon: Check, label: 'Your summary' },
];

function SamplePlayer({ audio, insider = false }: { audio: SampleAudio; insider?: boolean }) {
  return <div className="story-sample-player">
    <Button variant="outline" onClick={() => audio.toggle(!insider)} aria-label={`${audio.playing ? 'Pause' : 'Play'} ${insider ? 'Insider' : 'screening'} audio sample`} className="sample-play-button">{audio.playing ? <Pause size={16} /> : <Play size={16} />}<span>{audio.playing ? 'Pause sample' : 'Hear the sample'}</span></Button>
    <span className="sample-playing-wave" aria-hidden="true" data-playing={audio.playing}>{Array.from({ length: 15 }, (_, index) => <i key={index} style={{ height: `${6 + Math.abs(Math.sin(index * .8 + audio.time * 2)) * 19}px` }} />)}</span>
    <small>{audio.playing ? 'Sample playing' : 'Sound is optional'}</small>
    {audio.error && <p role="status" className="sample-error">{audio.error}</p>}
  </div>;
}

function Transcript({ audio, compact = false }: { audio: SampleAudio; compact?: boolean }) {
  const id = useId(), active = sampleTurnAt(audio.time), turn = sampleCall.turns[active];
  const first = Math.max(0, active - 1), progress = clamp((audio.time - turn.start) / Math.max(.1, turn.end - turn.start));
  return <div className={`story-transcript-demo ${compact ? 'is-compact' : ''}`} data-turn={active}>
    <div className="sample-transcript-heading"><span>SIMULATED TRANSCRIPT</span><span>{formatSampleTime(audio.time)} / {formatSampleTime(sampleCall.duration)}</span></div>
    <div className="sample-transcript-window" aria-label="Sample call transcript">
      {sampleCall.turns.slice(first, active + 1).map((item, index) => <div key={item.start} className={`sample-turn turn-${item.speaker}`} data-current={first + index === active}>
        <span>{item.label}<small>{formatSampleTime(item.start)}</small></span>
        <p>{item.text.split(' ').map((word, wordIndex, words) => <span key={wordIndex} className={first + index < active || wordIndex / words.length <= progress ? 'word-read' : 'word-upcoming'}>{word} </span>)}</p>
      </div>)}
    </div>
    <label className="sample-scrub-label" htmlFor={id}>Scroll or drag to explore the call</label>
    <input id={id} className="sample-scrubber" type="range" min={0} max={sampleCall.duration} step={.1} value={Math.min(audio.time, sampleCall.duration)} onChange={event => audio.seek(Number(event.target.value))} aria-label="Sample transcript position" aria-valuetext={`${formatSampleTime(audio.time)} of ${formatSampleTime(sampleCall.duration)}`} style={{ '--sample-progress': `${audio.time / sampleCall.duration * 100}%` } as CSSProperties} />
  </div>;
}

function GuidanceDemo({ choice, onChoose }: { choice: GuidanceId | null; onChoose: (choice: GuidanceId) => void }) {
  const selected = guidanceChoices.find(option => option.id === choice) ?? guidanceChoices[0];
  return <div className="story-guidance-demo">
    <div className="guidance-options" role="group" aria-label="Try a private instruction">{guidanceChoices.map((option, index) => <Button key={option.id} variant="outline" aria-pressed={choice === option.id} onClick={() => onChoose(option.id)}><span>0{index + 1}</span>{option.label}</Button>)}</div>
    <div className="guidance-private"><span><LockKeyhole size={12} /> PRIVATE TO THE ASSISTANT</span><p>{selected.instruction}</p>{choice && <small><CheckCheck size={13} /> Sent in this simulation</small>}</div>
    <div className="guidance-response" key={selected.id} aria-live="polite" aria-atomic="true">
      {choice ? <><span>THE CONVERSATION CONTINUES</span><p><b>Redial</b>{selected.agent}</p><p><b>Jordan</b>{selected.caller}</p></> : <p className="guidance-prompt">Try one of the three options to see how a private instruction changes the next question.</p>}
    </div>
  </div>;
}

export function StoryCallout({ chapter, position, audio, choice, onChoose, stationary = false }: { chapter: number; position: number; audio: SampleAudio; choice: GuidanceId | null; onChoose: (choice: GuidanceId) => void; stationary?: boolean }) {
  const card = cards[chapter], id = useId();
  if (!card) return null;
  const motion = overlayMotion(position, chapter), rich = chapter >= 1 && chapter <= 4;
  const details = stationary ? 1 : motion.details;
  const style = { '--callout-rise': stationary ? 0 : motion.rise, '--callout-scale': stationary ? 1 : motion.scale, '--callout-glow': stationary ? 0 : motion.glow, opacity: stationary ? 1 : motion.opacity, visibility: !stationary && motion.opacity < .02 ? 'hidden' : 'visible' } as CSSProperties;
  return <aside className={`story-callout callout-${chapter} ${rich ? 'callout-rich' : ''} ${stationary ? 'callout-stationary' : 'callout-staged'}`} style={style} aria-labelledby={id} inert={!stationary && motion.opacity < .1} data-chapter={chapter} data-rise={motion.rise.toFixed(3)}>
    <div className="callout-header"><span className="callout-symbol"><card.icon size={23} strokeWidth={1.6} /></span><div><span className="callout-eyebrow">{card.label}</span><h3 id={id}>{card.title}</h3><p>{card.body}</p></div></div>
    {rich && <div className="callout-reveal-details" style={{ gridTemplateRows: `${details}fr`, opacity: details, visibility: details < .01 ? 'hidden' : 'visible' }} inert={details < .95}><div>
      {(chapter === 1 || chapter === 3) && <SamplePlayer audio={audio} insider={chapter === 3} />}
      {(chapter === 2 || chapter === 3) && <Transcript audio={audio} compact={chapter === 3} />}
      {chapter === 4 && <GuidanceDemo choice={choice} onChoose={onChoose} />}
      {chapter === 1 && <p className="sample-disclosure">Fictional voices. Enable sound, then scroll to revisit the greeting.</p>}
      {chapter === 3 && <p className="sample-disclosure"><Headphones size={12} /> Sample audio only · your microphone is never used.</p>}
    </div></div>}
  </aside>;
}

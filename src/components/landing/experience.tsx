'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { ArrowDown, ArrowRight, AudioLines, Check, Gavel, Headphones, LockKeyhole, MessageSquare, MoveDown, Network, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Brand } from '@/components/brand';
import { Navigation } from '@/components/navigation';
import { publicNavigation } from '@/lib/navigation';
import { chapters, clamp, formPreviewStart, formZoomEnd, smooth, timeline } from '@/lib/landing/timeline';
import { PhoneScene } from './scene';
import { PhoneScreen } from './phone-screen';
import { OnboardingForm } from './onboarding-form';
import { StoryCallout } from './story-callout';
import { useSampleAudio } from './use-sample-audio';
import { guidanceChoices, sampleCall, screeningWordMotion, type GuidanceId } from '@/lib/landing/story-demo';

function subscribeMotion(callback: () => void) { const media = matchMedia('(prefers-reduced-motion: reduce)'); media.addEventListener('change', callback); return () => media.removeEventListener('change', callback); }
const getMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const serverMotion = () => true;
const icons = [Sparkles, AudioLines, MessageSquare, Headphones, LockKeyhole, Gavel, Network, Check, Sparkles];

export function LandingExperience() {
  const story = useRef<HTMLElement>(null), progress = useRef(0), onboarding = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0), [motionOverride, setMotionOverride] = useState<boolean | null>(null), [unavailable, setUnavailable] = useState(false);
  const preferredReduced = useSyncExternalStore(subscribeMotion, getMotion, serverMotion);
  const reduced = unavailable || (motionOverride ?? preferredReduced);
  const handleUnavailable = useCallback(() => setUnavailable(true), []);
  const frame = timeline(position);
  const sampleElement = useRef<HTMLAudioElement>(null);
  const audio = useSampleAudio(sampleElement, frame.position, reduced);
  const [guidance, setGuidance] = useState<GuidanceId | null>(null);
  const selectedGuidance = guidanceChoices.find(choice => choice.id === guidance);
  const backgroundWord = screeningWordMotion(frame.position);
  useEffect(() => {
    let pending = 0;
    function measure() {
      pending = 0; if (!story.current) return;
      const element = story.current, rect = element.getBoundingClientRect();
      const offset = window.innerWidth < 768 ? 70 : 80;
      const viewport = window.innerHeight - offset;
      const next = reduced ? 0 : clamp((offset - rect.top) / Math.max(1, element.offsetHeight - viewport));
      progress.current = next; setPosition(next);
    }
    const schedule = () => { if (!pending) pending = requestAnimationFrame(measure); };
    window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule);
    // Initial hash navigation can happen before hydration switches the readable
    // server layout to the taller cinematic layout. Re-align after that change.
    pending = requestAnimationFrame(() => { if (location.hash === '#onboarding') document.getElementById('onboarding')?.scrollIntoView({ block: 'start', behavior: 'instant' }); measure(); });
    return () => { cancelAnimationFrame(pending); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [reduced]);
  function goToChapter(index: number) {
    if (!story.current) return;
    const rect = story.current.getBoundingClientRect();
    const offset = window.innerWidth < 768 ? 70 : 80;
    const top = rect.top + window.scrollY - offset + index / 9 * (story.current.offsetHeight - window.innerHeight + offset);
    window.scrollTo({ top, behavior: reduced ? 'instant' : 'smooth' });
  }
  return <div className={`landing-experience ${reduced ? 'is-static' : 'is-cinematic'}`} data-motion={reduced ? 'reduced' : 'full'}>
    <header className="landing-nav"><Brand /><ThemeToggle /><Navigation items={publicNavigation} label="Public navigation" /><a href="#onboarding" className="landing-get-started">Make it yours <ArrowRight size={15} /></a></header>
    <main id="main" tabIndex={-1}>
      <audio ref={sampleElement} src={sampleCall.src} preload="none" {...audio.events} data-testid="story-sample-audio" aria-hidden="true"><track kind="captions" src="/audio/redial-sample.vtt" srcLang="en" label="Sample call transcript" default /></audio>
      <section ref={story} className="call-story" aria-label="The Redial call journey" data-chapter={chapters[frame.chapter].id} style={{ '--scene-tint': frame.tone.join(' '), '--journey-progress': position, '--journey-offset': `${frame.position * -35}px`, '--trace-opacity': frame.outline, '--travel': frame.travel, '--setup-zoom': frame.zoom } as CSSProperties}>
        <div className="story-sticky">
          <div className="story-atmosphere" aria-hidden="true"><span /><span /><div className="story-grid" /><div className="story-light-column" /><div className="story-light-haze" /></div>
          {!reduced && <div className="story-feature-backdrop" aria-hidden="true"><div className="story-feature-word" data-feature="screening" data-word="SCREEN CALLS" style={{ '--word-glow': backgroundWord.glow, opacity: backgroundWord.opacity, transform: `translate3d(${backgroundWord.x}%,${backgroundWord.y}px,0) scale(${backgroundWord.scale})`, filter: `blur(${backgroundWord.blur}px)` } as CSSProperties}>SCREEN CALLS</div></div>}
          <PhoneScene progress={progress} position={frame.position} onboarding={onboarding} guidance={selectedGuidance?.instruction} sampleTime={audio.time} enabled={!reduced} onUnavailable={handleUnavailable} />
          {!reduced && <div className="story-depth-meter" aria-hidden="true"><span>THE CALL, UNFOLDED</span><div>{Array.from({ length: 25 }, (_, index) => <i key={index} />)}<b /></div><small>↓</small></div>}
          {reduced && <div className="static-phone" aria-hidden="true"><PhoneScreen chapter={0} position={0} /></div>}
          <div className="story-topline" inert={!reduced && frame.zoom > .98}><span><i /> THE REDIAL EXPERIENCE</span><div className="story-utilities">{audio.enabled && <button className="story-sound-control" onClick={audio.disable}><Volume2 size={13} />Mute sample</button>}<button className="story-motion-control" onClick={() => setMotionOverride(!reduced)} disabled={unavailable} aria-pressed={reduced}><VolumeX size={12} />{unavailable ? 'Static experience' : reduced ? 'Enable motion' : 'Reduce motion'}</button></div></div>
          <div className="story-chapters">{chapters.map((chapter, index) => {
            const active = frame.chapter === index; const distance = frame.position - index; const opacity = reduced ? 1 : (distance < 0 ? smooth((distance + .16) / .16) : 1 - smooth((distance - (index === 8 ? .08 : .57)) / .27)); const Icon = icons[index];
            return <article id={`story-${chapter.id}`} key={chapter.id} className={`story-chapter chapter-${index} copy-${chapter.side}`} aria-hidden={reduced ? undefined : !active} inert={!reduced && !active} style={reduced ? undefined : { opacity, transform: `translate3d(${distance * -24}px, ${distance < 0 ? -distance * 180 : -distance * 10 - smooth((distance - .50) / .35) * 60}px, 0)`, filter: `blur(${(1 - opacity) * 5}px)`, visibility: opacity < .01 ? 'hidden' : 'visible' }}>
              <p className="story-kicker">{chapter.kicker}</p>
              {index === 0 ? <h1>Your phone rings.<br />Your day <em>doesn’t<br className="desktop-break" /> have to stop.</em></h1> : <h2>{chapter.title.split(chapter.emphasis)[0].split('\n').map((line, lineIndex) => <span key={lineIndex}>{line}{line && <br />}</span>)}<em>{chapter.emphasis}</em></h2>}
              <p className="story-description">{chapter.body}</p>
              {index === 0 ? <><div className="story-hero-actions"><button onClick={() => reduced ? document.getElementById('story-screening')?.scrollIntoView() : goToChapter(1)} className="story-primary">Follow the call <ArrowDown size={16} /></button><Link href="/demo/calls" className="story-demo-link">Explore the demo <ArrowRight size={15} /></Link></div><div className="story-mini-controls"><span><Headphones size={15} />Listen</span><span><Gavel size={15} />Take over</span><span><MessageSquare size={15} />Guide</span><span><Network size={15} />Connect</span></div></> : <div className="story-feature-pill"><Icon size={16} /><span>{index === 8 ? 'A personal beginning' : chapter.label}</span></div>}
              <p className="story-fine-print">{chapter.note}</p>
              {reduced && index >= 1 && index <= 4 && <StoryCallout stationary chapter={index} position={index} audio={audio} choice={guidance} onChoose={setGuidance} />}
            </article>;
          })}</div>
          {!reduced && <><StoryCallout chapter={frame.chapter} position={frame.position} audio={audio} choice={guidance} onChoose={setGuidance} /><div className="story-bottom"><div className="story-scroll-cue"><MoveDown size={18} /><span>{frame.chapter === 8 ? 'STEP INTO YOUR SETUP' : 'SCROLL TO EXPLORE'}<small>Scroll back to rewind</small></span></div><span className="story-counter">0{frame.chapter + 1}<i />09</span></div><nav className="story-timeline" aria-label="Call story chapters" inert={frame.zoom > .98}>{chapters.map((chapter, index) => <button key={chapter.id} onClick={() => goToChapter(index)} aria-label={`Go to ${chapter.label}`} aria-current={frame.chapter === index ? 'step' : undefined}><span /><small>{chapter.label}</small></button>)}</nav></>}
        </div>
      </section>
      <section id="onboarding" className="landing-onboarding" aria-label="Start your Redial setup" data-stage={reduced || frame.position >= formZoomEnd ? 'ready' : frame.position >= formPreviewStart ? 'embedded' : 'hidden'} inert={!reduced && frame.position < formZoomEnd}>
        <div ref={onboarding} className="onboarding-viewport"><OnboardingForm /></div>
      </section>
      <div className="landing-availability"><span className="availability-dot" /><p>Illustrative experience. Redial’s live calling services are in development. Setup saves on the preview server; it does not activate a number.</p><button className="motion-toggle" onClick={() => setMotionOverride(!reduced)} disabled={unavailable} aria-pressed={reduced}><VolumeX size={14} />{unavailable ? 'Static experience' : reduced ? 'Enable motion' : 'Reduce motion'}</button></div>
    </main>
    <footer className="landing-footer"><Brand /><p>A little more intention on the line.</p><div><Link href="/compatibility">Connection options</Link><Link href="/demo/overview">The workspace</Link><a href="#main">Back to the beginning ↑</a></div></footer>
  </div>;
}

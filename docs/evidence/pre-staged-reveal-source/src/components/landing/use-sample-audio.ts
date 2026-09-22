'use client';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { sampleCall, sampleTimeFor } from '@/lib/landing/story-demo';
import { clamp } from '@/lib/landing/timeline';

/** One original local sample. No microphone, provider, speech API or call access. */
export function useSampleAudio(audioRef: RefObject<HTMLAudioElement | null>, position: number, reduced: boolean) {
  const enabledRef = useRef(false), request = useRef(0), pendingSeek = useRef(0), currentPosition = useRef(position);
  const [state, setState] = useState({ enabled: false, playing: false, error: '', time: 0, anchor: position });
  const time = Math.abs(state.anchor - position) > .001 ? sampleTimeFor(position) : state.time;
  const seekElement = useCallback((value: number) => {
    pendingSeek.current = clamp(value, 0, sampleCall.duration - .01);
    if (audioRef.current && audioRef.current.readyState > 0) audioRef.current.currentTime = pendingSeek.current;
  }, [audioRef]);
  const start = useCallback(() => {
    const audio = audioRef.current; if (!audio) return;
    const ticket = ++request.current;
    audio.play().then(() => { if (ticket !== request.current || !enabledRef.current || document.hidden) audio.pause(); }).catch(error => {
      if (ticket !== request.current || !enabledRef.current || error?.name === 'AbortError') return;
      enabledRef.current = false;
      setState(previous => ({ ...previous, enabled: false, playing: false, error: 'Audio could not play. Press play to try again.' }));
    });
  }, [audioRef]);
  const disable = useCallback(() => {
    enabledRef.current = false; request.current++; audioRef.current?.pause();
    setState(previous => ({ ...previous, enabled: false, playing: false }));
  }, [audioRef]);
  useEffect(() => {
    currentPosition.current = position;
    request.current++; audioRef.current?.pause();
    // Settling after a scroll gesture avoids chopping speech into tiny fragments.
    // The transcript cursor itself follows scroll immediately, even while muted.
    const timer = setTimeout(() => {
      const target = sampleTimeFor(position); seekElement(target);
      setState(previous => ({ ...previous, time: target, anchor: position, playing: false }));
      const chapter = Math.floor(position);
      if (enabledRef.current && !reduced && !document.hidden && (chapter === 1 || chapter === 3) && position - chapter < .85) start();
    }, 140);
    return () => clearTimeout(timer);
  }, [audioRef, position, reduced, seekElement, start]);
  useEffect(() => {
    const audio = audioRef.current;
    const hidden = () => { if (document.hidden) disable(); };
    window.addEventListener('pagehide', disable); document.addEventListener('visibilitychange', hidden);
    return () => { enabledRef.current = false; audio?.pause(); window.removeEventListener('pagehide', disable); document.removeEventListener('visibilitychange', hidden); };
  }, [disable, audioRef]);
  function toggle() {
    if (state.playing) { disable(); return; }
    enabledRef.current = true;
    const target = time >= sampleCall.duration - .2 ? 0 : time;
    seekElement(target);
    setState(previous => ({ ...previous, error: '', enabled: true, time: target, anchor: position }));
    start();
  }
  function seek(value: number) {
    seekElement(value); setState(previous => ({ ...previous, time: value, anchor: position }));
  }
  return {
    ...state, time, toggle, disable, seek,
    events: {
      onLoadedMetadata: () => seekElement(pendingSeek.current),
      onTimeUpdate: () => { if (audioRef.current && !audioRef.current.paused) setState(previous => ({ ...previous, time: audioRef.current!.currentTime, anchor: currentPosition.current })); },
      onPlay: () => setState(previous => ({ ...previous, playing: true })),
      onPause: () => setState(previous => ({ ...previous, playing: false })),
      onEnded: () => setState(previous => ({ ...previous, playing: false })),
      onError: () => { enabledRef.current = false; setState(previous => ({ ...previous, enabled: false, playing: false, error: 'The sample could not load. You can still read the transcript.' })); },
    },
  };
}
export type SampleAudio = ReturnType<typeof useSampleAudio>;


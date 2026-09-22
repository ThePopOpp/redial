'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { PhoneDisplay } from './phone-screen';

export function PhoneScene({ progress, position, onboarding, guidance, sampleTime, enabled, onUnavailable }: { progress: RefObject<number>; position: number; onboarding: RefObject<HTMLDivElement | null>; guidance?: string; sampleTime?: number; enabled: boolean; onUnavailable: () => void }) {
  const mount = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!enabled || !mount.current) return;
    let canceled = false; let dispose: (() => void) | undefined;
    import('./three-scene').then(({ createPhoneScene }) => {
      if (canceled || !mount.current) return;
      try { const scene = createPhoneScene(mount.current, () => progress.current, onUnavailable, onboarding.current); dispose = scene.dispose; setScreen(scene.screenElement); }
      catch { onUnavailable(); }
    }).catch(() => { if (!canceled) onUnavailable(); });
    return () => { canceled = true; dispose?.(); };
  }, [enabled, progress, onboarding, onUnavailable]);
  return <div className="story-scene" ref={mount} aria-hidden="true" data-testid="three-scene">{screen && enabled && createPortal(<PhoneDisplay position={position} guidance={guidance} sampleTime={sampleTime} />, screen)}</div>;
}

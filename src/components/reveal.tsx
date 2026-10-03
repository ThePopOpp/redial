'use client';
import { useEffect, useRef } from 'react';

// A scroll-triggered entrance, written so the content is never hidden by it.
//
// The markup carries no state attribute, so without JavaScript — or before
// hydration — the element is simply visible. Hiding is something this component
// opts into on the client, and only for things currently below the fold: an
// element already on screen at mount is left alone rather than flashing out and
// back in.
//
// It writes the attribute directly rather than holding React state. The value
// is pure presentation, nothing renders from it, and a state update here would
// re-render a tree on every scroll trigger for no reason.
//
// `prefers-reduced-motion` is honoured twice: here, by never adding the hidden
// state at all, and in CSS, so a preference set after load still wins.
type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'article' | 'li';
};

export function Reveal({ children, className, delay = 0, as: Tag = 'div' }: Props) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (element.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    element.dataset.reveal = 'pending';
    if (delay) element.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        element.dataset.reveal = 'shown';
        observer.disconnect();
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [delay]);

  return <Tag ref={ref as React.Ref<never>} className={className}>{children}</Tag>;
}

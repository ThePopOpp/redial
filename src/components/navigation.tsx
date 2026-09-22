'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import type { NavigationItem } from '@/lib/navigation';

export function Navigation({ items, label }: { items: readonly NavigationItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const pathname = usePathname();

  return <div className="navigation" onKeyDown={event => {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      trigger.current?.focus();
    }
  }}>
    <button ref={trigger} className="menu-trigger" type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>Menu <span aria-hidden="true">{open ? '−' : '+'}</span></button>
    <nav id={id} aria-label={label} className={open ? 'nav-links is-open' : 'nav-links'}>
      {items.map(item => <Link key={item.href} href={item.href} aria-current={!item.href.includes('?') && pathname === item.href ? 'page' : undefined} onClick={() => setOpen(false)}>{item.label}</Link>)}
    </nav>
  </div>;
}

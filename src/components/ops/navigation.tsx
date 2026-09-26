'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { sectionHref, type OpsSection } from '@/lib/ops/sections';

export function OpsNavigation({ sections }: { sections: readonly OpsSection[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = (slug: string) => (sectionHref(slug) === pathname ? 'page' : undefined);
  return <nav className="ops-nav" aria-label="Operations sections" onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
    <button type="button" className="ops-nav-toggle" aria-expanded={open} aria-controls="ops-nav-list" onClick={() => setOpen(!open)}>
      {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      {open ? 'Close' : 'Sections'}
    </button>
    <ul id="ops-nav-list" data-open={open}>
      {sections.map(section => <li key={section.slug}>
        <Link href={sectionHref(section.slug)} aria-current={current(section.slug)} onClick={() => setOpen(false)}>{section.label}</Link>
      </li>)}
    </ul>
  </nav>;
}

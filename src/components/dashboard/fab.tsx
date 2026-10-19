'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AudioLines, FileText, Inbox, Maximize2, MessageSquare, Mic, Minimize2, Phone, Plus, Sparkles, X } from 'lucide-react';

// Quick access to the tools a workspace reaches for most.
//
// Four of these are real destinations. Three are not connected: outbound
// calling, SMS and recording from the browser are all provider actions this
// deployment is not authorised to perform, and the gateway ships with bridging
// disabled. They are shown rather than hidden, with the reason on the panel,
// because a tool that silently does nothing is worse than one that says why —
// and a dialpad that looks like it can dial is the single most misleading
// control this product could offer.
type Tool = {
  id: string; label: string; icon: typeof Phone;
  href?: string;
  blocked?: string;
  body: string;
};

export function DashboardFab({ workspace, line }: { workspace: string; line: string }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState('agents');
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);

  const scope = `workspace=${workspace}&line=${line}`;
  const tools: Tool[] = [
    { id: 'agents', label: 'AI Agents', icon: Sparkles, href: `/app/agent?${scope}`,
      body: 'Your assistant’s voice, greeting and screening rules. Which screening a line uses depends on its plan and the basis recorded for it.' },
    { id: 'calls', label: 'Call logs', icon: Inbox, href: `/app/calls?${scope}`,
      body: 'Every screened call with its outcome, duration and what the caller said, newest first.' },
    { id: 'live', label: 'Voice calls', icon: Phone, blocked: 'Outbound calling is not built, and this deployment is not authorised to place a call.',
      body: 'Live call controls show a call that is already in progress. Dialling out from the browser would be a provider action, and nothing here can perform one.' },
    { id: 'messages', label: 'Messages', icon: MessageSquare, href: `/app/help?${scope}`,
      body: 'Support requests between you and the Redial team. Member-to-member messaging is not part of this release.' },
    { id: 'sms', label: 'SMS', icon: AudioLines, blocked: 'No messaging service is configured and SMS is excluded from every current plan.',
      body: 'Sending a text would need a provider messaging service and separate consent from the recipient. Neither exists yet.' },
    { id: 'notes', label: 'Notes', icon: FileText, href: `/app/contacts?${scope}`,
      body: 'Notes live on the contact they belong to rather than in a drawer of their own, so they stay attached to the person a call was about.' },
    { id: 'recorder', label: 'Voice recorder', icon: Mic, blocked: 'Recording from the browser is not built. Call recording is per line, needs a recorded basis, and happens at the provider.',
      body: 'A recording made here would carry no consent record and no deletion deadline, which is the one state the database refuses to represent.' },
  ];
  const current = tools.find(tool => tool.id === active) ?? tools[0];

  return <div className="app-fab" ref={holder} data-expanded={expanded}>
    {open && <div className="app-fab-panel" role="dialog" aria-label="Quick tools">
      <div className="app-fab-strip">
        <div className="app-fab-tabs" role="tablist" aria-label="Tools">
          {tools.map(tool => <button key={tool.id} type="button" role="tab"
            aria-selected={tool.id === active} title={tool.label}
            data-blocked={tool.blocked ? 'true' : undefined}
            onClick={() => setActive(tool.id)}>
            <tool.icon size={17} aria-hidden="true" />
            <span className="sr-only">{tool.label}</span>
          </button>)}
        </div>
        <div className="app-fab-chrome">
          <button type="button" className="app-icon-button" onClick={() => setExpanded(!expanded)}>
            {expanded ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
            <span className="sr-only">{expanded ? 'Shrink panel' : 'Expand panel'}</span>
          </button>
          <button type="button" className="app-icon-button" onClick={() => setOpen(false)}>
            <X size={16} aria-hidden="true" /><span className="sr-only">Close quick tools</span>
          </button>
        </div>
      </div>

      <div className="app-fab-body">
        <h2>{current.label}</h2>
        <p>{current.body}</p>
        {current.blocked
          ? <p className="app-fab-blocked">{current.blocked}</p>
          : <Link className="app-fab-go" href={current.href!} onClick={() => setOpen(false)}>Open {current.label}</Link>}
      </div>
    </div>}

    <button type="button" className="app-fab-button" aria-expanded={open}
      onClick={() => setOpen(!open)}>
      {open ? <X size={22} aria-hidden="true" /> : <Plus size={22} aria-hidden="true" />}
      <span className="sr-only">{open ? 'Close quick tools' : 'Open quick tools'}</span>
    </button>
  </div>;
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { LiveControls } from '@/components/live-controls';
export const metadata: Metadata = { title: 'How it works' };

export default function HowItWorks() {
  return <><header className="page-heading"><p className="eyebrow">The planned experience</p><h1>Connect. Set your rules.<br /><em>Get the context.</em></h1><p>Redial can only screen calls delivered through an active, supported connection. This preview does not connect a phone number.</p></header>
    <ol className="steps"><li><span className="eyebrow">01 / Connect</span><h2>Start with the right line.</h2><p>A dedicated number is the first planned connection. Conditional mobile forwarding is separate: your phone may ring before the carrier forwards a call.</p><Link className="text-link" href="/compatibility">Explore connection options →</Link></li><li><span className="eyebrow">02 / Set boundaries</span><h2>Choose who is screened.</h2><p>Unknown callers, every received call, or suspected spam when a supported signal exists. Every call includes saved contacts unless you add an explicit VIP exception.</p></li><li><span className="eyebrow">03 / Follow up</span><h2>Read the reason they called.</h2><p>Review a message and choose a next step. A claimed urgent need will never authorize disclosure of access codes or private information.</p><Link className="text-link" href="/demo/calls">Open the illustrative inbox →</Link></li></ol><LiveControls /></>;
}

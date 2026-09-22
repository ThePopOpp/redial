import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LiveControls } from '@/components/live-controls';

export default function Home() {
  return <>
    <section className="hero">
      <p className="eyebrow">Your calls. Your boundaries.</p>
      <h1>A calmer phone.<br />A <em>clearer day.</em></h1>
      <p className="hero-description">A helpful first response. The context you need. Redial is being built to follow your rules for messages and connections, on a supported phone setup.</p>
      <div className="actions"><Button asChild><Link href="/compatibility">Explore connection options <span aria-hidden="true">↗</span></Link></Button><Button asChild variant="outline"><Link href="/demo/calls">Explore the demo</Link></Button></div>
      <p className="hero-note">In development. No live screening or purchases are available yet.</p>
    </section>
    <section className="conversation-feature" aria-labelledby="conversation-heading">
      <div className="conversation-intro"><p className="eyebrow">An example conversation</p><h2 id="conversation-heading">A little context.<br /><em>A better next step.</em></h2><p>Know why they called before deciding what comes next.</p><div className="sound-bars" aria-hidden="true">{Array.from({ length: 27 }, (_, i) => <span key={i} style={{ height: `${12 + ((i * 17) % 51)}px` }} />)}</div><span className="small-label">Illustration · No audio playing</span></div>
      <div className="conversation-body"><span className="status-label">Simulated conversation</span><p className="speaker">Redial agent</p><p>“Hi, you&apos;ve reached Alex&apos;s AI assistant. May I ask who&apos;s calling and what this is about?”</p><p className="speaker">Caller</p><p>“This is Jordan from the delivery company. I&apos;d like to confirm a delivery window.”</p><div className="message-outcome"><span aria-hidden="true">↳</span> Example outcome: a delivery message</div><p className="small-label">Not a live customer call. This abbreviated example does not replace a call&apos;s processing notice and consent flow.</p></div>
    </section>
    <LiveControls />
    <section className="privacy-note"><p className="eyebrow">Privacy by design</p><h2>Your calls are not<br /><em>a marketing list.</em></h2><p>Shared billing will not automatically grant access to another adult&apos;s conversations. Listening, transcripts and recordings each need their own permissions.</p><Link className="text-link" href="/how-it-works">See how Redial is being built <span aria-hidden="true">→</span></Link></section>
  </>;
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import { Reveal } from '@/components/reveal';
import { observeFeatures, observeStages } from '@/lib/observe';

export const metadata: Metadata = {
  title: 'Observe',
  description: 'See what happened on every call, and what you can still prove about it afterwards.',
};

export default function Observe() {
  return <div className="observe">
    <header className="observe-hero">
      <p className="eyebrow"><Activity size={13} aria-hidden="true" />Observe</p>
      <h1>See every call.<br /><em>Prove what happened.</em></h1>
      <p className="observe-lede">
        End-to-end visibility into the calls your assistant handles. What was said, how
        confidently it was heard, which route was taken and why — and, afterwards, a record
        bounded by consent, capability and a deletion deadline.
      </p>
      <div className="observe-hero-actions">
        <Link className="observe-primary" href="/demo/calls">See it on synthetic calls</Link>
        <Link className="observe-secondary" href="/pricing">Which plans include it</Link>
      </div>
      <p className="small-label">Included on Agent Platform &middot; no account needed to look</p>
    </header>

    <section className="observe-stages" aria-labelledby="stages-heading">
      <h2 id="stages-heading" className="sr-only">How a call is observed</h2>
      {observeStages.map((stage, index) => <Reveal as="article" key={stage.step} delay={index * 90}>
        <p className="observe-step">{stage.step}</p>
        <h3>{stage.title}</h3>
        <p>{stage.body}</p>
      </Reveal>)}
    </section>

    <section className="observe-features" aria-labelledby="features-heading">
      <Reveal>
        <h2 id="features-heading">What you can actually see</h2>
        <p className="observe-lede">Each of these describes behaviour that exists today and is
          covered by the test suite. Where something is not built, this page says so rather than
          describing it as though it were.</p>
      </Reveal>
      <div className="observe-grid">
        {observeFeatures.map((feature, index) => <Reveal as="article" key={feature.title} delay={(index % 3) * 80}>
          <h3>{feature.title}</h3>
          <p>{feature.body}</p>
        </Reveal>)}
      </div>
    </section>

    <Reveal as="section" className="observe-honest">
      <h2>What Observe is not, yet</h2>
      <p>Redial does not stream live metrics to an external service, export recordings to your
        own storage, or offer client SDKs. Recordings stay with the telephony provider and Redial
        holds the reference, the basis and the deadline — deliberately, because every extra copy
        is one more place a deletion has to reach.</p>
      <p>Live call handling is not switched on. No call has been bridged to a real handset from
        this deployment, and the gateway ships with that disabled.</p>
    </Reveal>

    <Reveal as="section" className="observe-end">
      <h2>Look at a real record.</h2>
      <p>The demo workspace runs on synthetic calls with the same permissions, retention and
        audit behaviour as a live one. Nothing is connected and nothing is charged.</p>
      <div className="observe-hero-actions">
        <Link className="observe-primary" href="/demo/calls">Open the demo workspace</Link>
        <Link className="observe-secondary" href="/how-it-works">How screening works</Link>
      </div>
    </Reveal>
  </div>;
}

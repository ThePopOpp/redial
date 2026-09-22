import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Compatibility' };

export default function Compatibility() {
  return <><header className="page-heading"><p className="eyebrow">Connection options · Not yet tested</p><h1>The right setup<br /><em>makes the difference.</em></h1><p>No carrier, device or provider combination has been verified for this application. No paid screening capability is being promised.</p></header>
    <div className="info-grid"><article className="info-card"><span className="status-label">Planned first</span><h2>A dedicated number</h2><p>A Redial-front-door number would receive calls before ringing your configured destination. Number ownership, a test call and a safe fallback must be verified before activation.</p></article><article className="info-card"><span className="status-label">Separate testing required</span><h2>Your existing mobile</h2><p>Supported conditional forwarding sends unanswered, busy or unavailable calls onward. It does not mean unknown-only interception, and your phone may ring first.</p></article></div>
    <section className="notice"><h2>Nothing changes on your phone.</h2><p>This preview does not provision numbers, modify forwarding or request provider credentials. A compatibility questionnaire and tested setup guides will follow. Accepted calls must never ring back into the same forwarding path.</p></section></>;
}

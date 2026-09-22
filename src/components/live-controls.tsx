import { liveControls } from '@/lib/live-controls';
import Link from 'next/link';

export function LiveControls() {
  return <section className="section" aria-labelledby="live-controls-heading">
    <div className="section-heading"><div><p className="eyebrow">Live Call Controls · In development</p><h2 id="live-controls-heading">Your agent answers.<br /><em>You stay in control.</em></h2></div><p>Four ways to shape a supported call. Explore the local simulator; real calling remains unavailable.</p></div>
    <div className="control-grid">
      {liveControls.map((control, index) => <article className="control-card" key={control.name}>
        <p className="eyebrow">0{index + 1} / {control.subtitle}</p>
        <h3>{control.name}</h3><p>{control.description}</p>
        <p className="control-requirement">Planned · {control.requirement}</p>
        <Link className="text-link" href={`/features/${control.name.toLowerCase()}`}>Explore {control.name} →</Link>
      </article>)}
    </div>
  </section>;
}

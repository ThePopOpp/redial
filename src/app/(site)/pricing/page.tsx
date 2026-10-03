import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import { planCards, planComparison, pricingQuestions, type ComparisonValue } from '@/lib/plans';

export const metadata: Metadata = { title: 'Proposed pricing' };

const planNames = planCards.map(plan => plan.name);

// A table cell. `null` is "this meter does not apply to this plan", which is a
// different statement from "you do not get this" and is marked differently.
function Cell({ value }: { value: ComparisonValue }) {
  if (value === true) return <span className="pricing-yes"><Check size={16} aria-hidden="true" /><span className="sr-only">Included</span></span>;
  if (value === false) return <span className="pricing-no"><Minus size={16} aria-hidden="true" /><span className="sr-only">Not included</span></span>;
  if (value === null) return <span className="pricing-na" title="Not applicable to this plan's meters">Not metered</span>;
  return <span>{value}</span>;
}

export default function Pricing() {
  return <div className="pricing">
    <header className="pricing-hero">
      <p className="eyebrow">Clear plans. Clear limits.</p>
      <h1>Pay for the setup<br /><em>that works for you.</em></h1>
      <p className="pricing-lede">
        Start on a line you already own, or let us supply the number and the minutes.
        Every plan screens calls, keeps the records, and charges you nothing automatically.
      </p>
      <p className="pricing-banner" role="note">
        <strong>Proposed pricing, published for review.</strong> Prices, limits and availability
        await approval, and nothing here can be purchased yet.
      </p>
    </header>

    <section className="pricing-tiers" aria-label="Proposed plans">
      {planCards.map(plan => <article key={plan.id} className={`pricing-card${plan.featured ? ' is-featured' : ''}`}>
        {plan.featured && <span className="pricing-flag">Most complete</span>}
        <header>
          <p className="pricing-mode">{plan.mode === 'byo' ? 'Bring your own number' : 'Number included'}</p>
          <h2>{plan.name}</h2>
          <p className="pricing-amount">
            {plan.monthly === 0 ? <strong>Free</strong> : <><strong>${plan.monthly}</strong><span>/month</span></>}
          </p>
          <p className="pricing-annual">{plan.annual === null ? 'No annual charge' : `or $${plan.annual} a year`}</p>
        </header>
        <p className="pricing-summary">{plan.summary}</p>
        <ul className="pricing-highlights">
          {plan.highlights.map(item => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}
        </ul>
        <span className="pricing-cta" aria-disabled="true">Not available to purchase</span>
      </article>)}
    </section>

    <section className="pricing-compare" aria-labelledby="compare-heading">
      <h2 id="compare-heading">Compare every plan</h2>
      <p className="pricing-lede">A dash means the plan does not include it. &ldquo;Not metered&rdquo; means
        Redial does not count that allowance on the plan, because you are paying that provider
        directly &mdash; it is not a promise of unlimited use.</p>
      {/* Two presentations of the same figures. A table this wide cannot be made
          to fit a phone, and a horizontally scrolling one leaks its width into
          documentElement.scrollWidth in Chromium however well the container is
          contained. Only one is ever rendered, so nothing is announced twice. */}
      <div className="pricing-table-wide">
        <table className="pricing-table">
          <caption className="sr-only">Proposed plan comparison</caption>
          <thead>
            <tr>
              <th scope="col">Feature</th>
              {planNames.map(name => <th scope="col" key={name}>{name}</th>)}
            </tr>
          </thead>
          {planComparison.map(group => <tbody key={group.title}>
            <tr className="pricing-group">
              <th scope="colgroup" colSpan={planNames.length + 1}>
                {group.title}
                {group.note && <span>{group.note}</span>}
              </th>
            </tr>
            {group.rows.map(row => <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {row.values.map((value, index) => <td key={planNames[index]}><Cell value={value} /></td>)}
            </tr>)}
          </tbody>)}
        </table>
      </div>

      <div className="pricing-stack">
        {planCards.map((plan, planIndex) => <article key={plan.id}>
          <h3>{plan.name}</h3>
          {planComparison.map(group => <section key={group.title}>
            <h4>{group.title}</h4>
            <dl>
              {group.rows.map(row => <div key={row.label}>
                <dt>{row.label}</dt>
                <dd><Cell value={row.values[planIndex]} /></dd>
              </div>)}
            </dl>
          </section>)}
        </article>)}
      </div>
    </section>

    <section className="pricing-faq" aria-labelledby="faq-heading">
      <h2 id="faq-heading">Questions this page raises</h2>
      <div className="pricing-faq-list">
        {pricingQuestions.map(item => <article key={item.question}>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </article>)}
      </div>
    </section>

    <section className="pricing-end">
      <h2>Nothing to buy yet. Plenty to look at.</h2>
      <p>The workspace runs on synthetic data, so you can see exactly how screening,
        call records and permissions behave before any of this is for sale.</p>
      <div className="pricing-end-actions">
        <Link className="pricing-primary" href="/demo/calls">Open the demo workspace</Link>
        <Link className="pricing-secondary" href="/how-it-works">How it works</Link>
      </div>
      <p className="small-label">No account needed &middot; no card collected &middot; no calls connected</p>
    </section>
  </div>;
}

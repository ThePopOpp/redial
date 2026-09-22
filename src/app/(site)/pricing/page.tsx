import type { Metadata } from 'next';
import { proposedPlans } from '@/lib/plans';
export const metadata: Metadata = { title: 'Proposed pricing' };

export default function Pricing() {
  return <><header className="page-heading"><p className="eyebrow">Clear plans. Clear limits.</p><h1>Pay for the setup<br /><em>that works for you.</em></h1><p>Proposed pricing for review. Prices, limits and availability await approval. Purchases are unavailable.</p></header>
    <div className="plan-list">{proposedPlans.map(plan => <article className="plan-row" key={plan.name}><div><span className="small-label">Proposed · USD before tax</span><h2>{plan.name}</h2><p>{plan.allowance}</p></div><div className="plan-price"><strong>${plan.monthly}<span> / month</span></strong><p>{plan.annual === null ? 'No annual charge' : `$${plan.annual} billed once per year ($${(plan.annual / 12).toFixed(2)}/month equivalent)`}</p></div></article>)}</div>
    <section className="notice"><h2>Know what is included.</h2><p>BYO members pay telephony and AI providers separately. Managed allowances are bounded; they do not include unlimited AI use. Annual plans receive monthly usage windows with no rollover in this proposal.</p><p>Taxes, premium or international calls, SMS, PSTN forwarding, outbound calling, and conference or recording add-ons are excluded unless separately included in approved terms. No automatic overage charges. Live Call Controls eligibility and their additional costs require separate approval; these prices and quotas have not been changed.</p></section></>;
}

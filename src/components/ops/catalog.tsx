import { createPlanVersion, createProduct, publishPlanVersion, publishPrice, retirePlanVersion, retirePrice, setPlanPrice, updatePlanDraft } from '@/lib/ops/actions';
import { Card, Badge, Empty } from '@/components/review/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export type CatalogPrice = { id: string; cadence: string; currency: string; amount_minor: number; availability: string; square_plan_variation_id: string | null };
export type CatalogVersion = { id: string; version: number; availability: string; features: Record<string, unknown>; limits: Record<string, unknown>; published_at: string | null; prices: CatalogPrice[] };
export type CatalogProduct = { id: string; code: string; name: string; kind: string; versions: CatalogVersion[] };

const cadences = [{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }, { value: 'free', label: 'Free' }];
const kinds = [{ value: 'membership', label: 'Membership' }, { value: 'add_on', label: 'Add-on' }];

// Stored in minor units, shown in major. A free cadence is genuinely zero
// rather than an unpriced row, which is why it reads as "Included".
function money(amount: number, currency: string) {
  return amount === 0 ? 'Included'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
}

const tone = (availability: string) => availability === 'available' ? 'ok' : availability === 'retired' ? 'muted' : '';

function Price({ price, canWrite }: { price: CatalogPrice; canWrite: boolean }) {
  return <div className="record-row">
    <div className="grow">
      <strong>{money(price.amount_minor, price.currency)}</strong>
      <p>{price.cadence} · {price.currency}{price.square_plan_variation_id ? ' · mapped to Square' : ' · no provider mapping'}</p>
    </div>
    <Badge tone={tone(price.availability)}>{price.availability}</Badge>
    {canWrite && price.availability === 'draft' && <form action={publishPrice} className="ops-inline-form">
      <input type="hidden" name="price" value={price.id} />
      <Button variant="outline">Publish</Button>
    </form>}
    {canWrite && price.availability !== 'retired' && <form action={retirePrice} className="ops-inline-form">
      <input type="hidden" name="price" value={price.id} />
      <Button variant="outline">Retire</Button>
    </form>}
  </div>;
}

function Version({ version, canWrite }: { version: CatalogVersion; canWrite: boolean }) {
  const draft = version.availability === 'draft';
  return <Card title={`Version ${version.version}`} subtitle={version.published_at ? `Published ${new Date(version.published_at).toISOString().slice(0, 10)}` : 'Not published'}>
    <p><Badge tone={tone(version.availability)}>{version.availability}</Badge></p>
    <dl className="carrier-summary">
      <dt>Includes</dt><dd>{Object.keys(version.features).length ? Object.entries(version.features).map(([key, value]) => `${key}: ${String(value)}`).join(' · ') : 'Nothing recorded'}</dd>
      <dt>Limits</dt><dd>{Object.keys(version.limits).length ? Object.entries(version.limits).map(([key, value]) => `${key}: ${String(value)}`).join(' · ') : 'None recorded'}</dd>
    </dl>

    <h4>Prices</h4>
    {version.prices.length ? version.prices.map(price => <Price key={price.id} price={price} canWrite={canWrite} />)
      : <p>No price yet. A plan with no published price cannot be chosen at signup.</p>}

    {canWrite && version.availability !== 'retired' && <form action={setPlanPrice} className="review-form">
      <input type="hidden" name="plan_version" value={version.id} />
      <label htmlFor={`cadence-${version.id}`}>Cadence</label>
      <Select id={`cadence-${version.id}`} name="cadence" defaultValue="monthly" options={cadences} />
      <label htmlFor={`currency-${version.id}`}>Currency</label>
      <Input id={`currency-${version.id}`} name="currency" defaultValue="USD" maxLength={3} required />
      <label htmlFor={`amount-${version.id}`}>Amount</label>
      <Input id={`amount-${version.id}`} name="amount" type="number" min="0" step="0.01" defaultValue="0" required />
      <label htmlFor={`square-${version.id}`}>Square plan variation ID</label>
      <Input id={`square-${version.id}`} name="square_variation" maxLength={64} placeholder="Leave empty until the plan exists in Square" />
      <Button variant="outline">Add price</Button>
    </form>}

    {canWrite && draft && <form action={updatePlanDraft} className="review-form">
      <input type="hidden" name="plan_version" value={version.id} />
      <label htmlFor={`features-${version.id}`}>Includes (JSON)</label>
      <Textarea id={`features-${version.id}`} name="features" rows={3} defaultValue={JSON.stringify(version.features)} required />
      <label htmlFor={`limits-${version.id}`}>Limits (JSON)</label>
      <Textarea id={`limits-${version.id}`} name="limits" rows={3} defaultValue={JSON.stringify(version.limits)} required />
      <Button variant="outline">Save draft</Button>
    </form>}

    {canWrite && <div className="ops-inline-form">
      {draft && <form action={publishPlanVersion}>
        <input type="hidden" name="plan_version" value={version.id} />
        <Button>Publish version</Button>
      </form>}
      {version.availability !== 'retired' && <form action={retirePlanVersion}>
        <input type="hidden" name="plan_version" value={version.id} />
        <Button variant="outline">Retire version</Button>
      </form>}
    </div>}
  </Card>;
}

export function Catalog({ products, canWrite }: { products: CatalogProduct[]; canWrite: boolean }) {
  return <>
    {!canWrite && <Card title="Read only">
      <p>You can see every account type and price. Changing them needs the catalog permission, which only an owner or admin holds.</p>
    </Card>}

    {products.length ? products.map(product => <Card key={product.id} title={product.name} subtitle={`${product.code} · ${product.kind === 'add_on' ? 'Add-on' : 'Membership'}`}>
      {product.versions.length
        ? product.versions.map(version => <Version key={version.id} version={version} canWrite={canWrite} />)
        : <p>No versions yet. A product with no published version cannot be chosen at signup.</p>}

      {canWrite && <form action={createPlanVersion} className="review-form">
        <input type="hidden" name="product" value={product.id} />
        <label htmlFor={`new-features-${product.id}`}>Includes (JSON)</label>
        <Textarea id={`new-features-${product.id}`} name="features" rows={3} defaultValue='{"screening":true}' required />
        <label htmlFor={`new-limits-${product.id}`}>Limits (JSON)</label>
        <Textarea id={`new-limits-${product.id}`} name="limits" rows={3} defaultValue='{"lines":1}' required />
        <Button variant="outline">New draft version</Button>
      </form>}
    </Card>) : <Empty title="No account types yet">Create a product, give it a version describing what it includes, then add and publish a price. Nothing can be chosen at signup until a price is published.</Empty>}

    {canWrite && <Card title="New account type">
      <p>The code is permanent and used by the application; the name is what a member sees.</p>
      <form action={createProduct} className="review-form">
        <label htmlFor="product-code">Code</label>
        <Input id="product-code" name="code" placeholder="concierge" maxLength={41} required />
        <label htmlFor="product-name">Name</label>
        <Input id="product-name" name="name" placeholder="Concierge" maxLength={80} required />
        <label htmlFor="product-kind">Kind</label>
        <Select id="product-kind" name="kind" defaultValue="membership" options={kinds} />
        <Button>Create</Button>
      </form>
    </Card>}

    <Card title="How a change reaches a member">
      <ul className="plain-list">
        <li>A <strong>draft</strong> version is editable and invisible to members.</li>
        <li><strong>Publishing</strong> freezes what it includes. Changing a published plan means a new version, so nobody&rsquo;s existing terms are rewritten.</li>
        <li>A price cannot be published before its plan, and a published price cannot change amount — retire it and publish another.</li>
        <li><strong>Retiring</strong> withdraws the offer and retires its prices. Existing subscriptions keep the version they were sold.</li>
        <li>A price only reaches Square once it carries a plan variation ID and the worker has provider calls enabled.</li>
      </ul>
    </Card>
  </>;
}

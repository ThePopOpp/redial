import { requireStaff } from '@/lib/supabase/staff';
import { Catalog, type CatalogProduct } from '@/components/ops/catalog';

export const metadata = { title: 'Plans & pricing' };

// Reading the catalog follows billing_read, so finance and analyst can see what
// is offered. Changing it needs catalog_write, which only owner and admin hold;
// the component hides the forms and every action re-checks.
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const account = await requireStaff('billing_read');
  const notice = (await searchParams).notice;
  const { data, error } = await account.db.rpc('staff_catalog');
  return <>
    <header className="workspace-heading"><div><p className="eyebrow">Operations</p><h1>Plans &amp; pricing</h1></div></header>
    {notice && <p role={notice === 'saved' ? 'status' : 'alert'}>{notice === 'saved'
      ? 'Catalog updated.'
      : 'That change was refused. A published plan or price cannot be edited, a price cannot be published before its plan, and a product code must be unique.'}</p>}
    {error ? <p role="alert">The catalog is unavailable. Check the database connection.</p>
      : <Catalog products={(data ?? []) as CatalogProduct[]} canWrite={account.can('catalog_write')} />}
  </>;
}

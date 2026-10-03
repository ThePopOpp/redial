import { Card, Badge } from '@/components/review/ui';

// What the deployment is actually holding, read from the runtime rather than
// from a table.
//
// The previous version of this card read `provider_connections`, which nothing
// in the repository has ever written, so every provider but Supabase reported
// "Not configured" however the environment was set — and Supabase reported
// "Account and database connected" from a hardcoded string, whether or not the
// project was reachable. Both halves were untrue in opposite directions.
//
// Provider credentials live in the worker and the voice gateway, which are
// separate deployment units with their own environments. The web application
// cannot see them and must not: `config/runtime.mjs` refuses to start if a
// worker secret is set here. So this reports what the web tier knows and names
// the unit that owns the rest, instead of implying a health check it cannot do.
export type ConnectionRow = { provider: string; status: string; detail: string; owner: string };

export function ConnectionStatus({ rows }: { rows: ConnectionRow[] }) {
  return <Card title="Connection status" subtitle="Configuration, not a provider health check">
    {rows.map(row => <article className="record-row" key={row.provider}>
      <div className="grow">
        <strong>{row.provider}</strong>
        <p>{row.detail}</p>
      </div>
      <Badge tone={row.status === 'Configured' ? '' : 'muted'}>{row.status}</Badge>
      <Badge tone="muted">{row.owner}</Badge>
    </article>)}
    <p>A credential being present does not establish call routing, checkout or delivery. Each integration needs its own verification, and the worker and voice gateway hold their own credentials in their own Coolify applications.</p>
  </Card>;
}

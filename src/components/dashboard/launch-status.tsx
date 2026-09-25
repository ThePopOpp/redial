import { Badge, Card } from '@/components/review/ui';

const gates = [
  ['Account and workspace access', 'Implemented locally', 'Apply migrations to staging, verify email delivery and test personal and business workspaces against your Supabase project.'],
  ['Carrier setup', 'Draft workflow available', 'Choose the provider in Numbers & setup. Each line still needs an assigned destination, carrier confirmation and inbound/reversal tests.'],
  ['Incoming calls and assistant', 'Implementation required', 'The persistent Twilio → xAI voice gateway, signed events, call coordination, consent and enforced usage limits are not connected.'],
  ['Messages and email', 'Implementation required', 'Durable call completion, inbox delivery, retention and Resend notification workers need implementation and failure tests.'],
  ['Insider, Gavel, Audible, Directory', 'Provider proof required', 'Independent AI participant, silent listening, AI detachment, private guidance and accepted transfers each need their own provider tests.'],
  ['Paid memberships', 'Implementation required', 'Square sandbox lifecycle and verified entitlements must pass before accepting paid signups.'],
  ['Deployment and recovery', 'Staging verification required', 'Verify domain/TLS, WSS proxying, independent fallback, monitoring, backup restoration and rollback before a pilot.'],
] as const;

export function LaunchStatus() {
  return <Card title="Live-call preparation" subtitle="Implementation status · not a live provider health check">
    <p>Saving a setup plan or adding credentials does not enable calls. These gates track what remains before a live pilot.</p>
    {gates.map(([name,status,detail]) => <article className="record-row" key={name}><div className="grow"><strong>{name}</strong><p>{detail}</p></div><Badge>{status}</Badge></article>)}
  </Card>;
}

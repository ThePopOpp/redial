import Link from 'next/link';
import { Brand } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';

const notices: Record<string, string> = {
  invalid: 'Check the details you entered and try again.',
  failed: 'That request could not be completed. Check your details and try again.',
  email: 'If your address is eligible, check your inbox for the next step.',
  origin: 'Open this form from the configured Redial domain.',
  expired: 'This link has expired or is invalid. Request a new one.',
  used: 'That reset link has already been used, or it has expired. Each link works once — request a new one below.',
  slow: 'You asked for this very recently. Wait a minute, then try again.',
  terms: 'Accept the Terms of Service and Privacy Policy to create an account.',
  password: 'Your password has been updated.',
};

// The panel carries the product promise rather than testimonials or a customer
// count. Redial has no customers yet, and docs/14 forbids inventing either.
const controls = [
  ['Insider', 'Listen to a call live without joining it.'],
  ['Gavel', 'Take over, with the assistant removed first.'],
  ['Audible', 'Send your assistant a private instruction mid-call.'],
  ['Directory', 'Hand the call to someone who accepts it.'],
];

export function AuthShell({ title, description, notice, children, alternate }: {
  title: string;
  description: string;
  notice?: string;
  children: React.ReactNode;
  alternate?: React.ReactNode;
}) {
  return <div className="auth-shell">
    <div className="auth-theme-toggle"><ThemeToggle /></div>
    <div className="auth-panel">
      <div className="auth-inner">
        <Brand />
        <h1>{title}</h1>
        <p className="auth-description">{description}</p>
        {notice && notices[notice] && <p role="status" className="auth-notice">{notices[notice]}</p>}
        {children}
        {alternate && <p className="auth-alternate">{alternate}</p>}
        <p className="auth-legal">By continuing you agree to our <Link href="/legal/terms">Terms of Service</Link> and <Link href="/legal/privacy">Privacy Policy</Link>.</p>
      </div>
    </div>
    <aside className="auth-aside">
      <div className="auth-aside-inner">
        <p className="eyebrow">Your calls. Your rules.</p>
        <p className="auth-promise">Your phone rings.<br />Your day doesn’t<br /><em>have to stop.</em></p>
        <ul className="auth-controls">
          {controls.map(([name, detail]) => <li key={name}><strong>{name}</strong><span>{detail}</span></li>)}
        </ul>
        <p className="auth-aside-note">Calling features are released as they are tested. Redial is not a telephone service and cannot reach emergency numbers.</p>
      </div>
    </aside>
  </div>;
}

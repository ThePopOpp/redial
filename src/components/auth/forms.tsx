import Link from 'next/link';
import { authAction } from '@/lib/supabase/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// The OAuth slot is deliberately empty. The layout reserves room for provider
// buttons above the divider so adding Google or a magic link later is a change
// of content, not a redesign. Nothing here claims a provider that is not wired.

export function SignInForm({ next = '/app', staff = false }: { next?: string; staff?: boolean }) {
  return <>
    <form action={authAction} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="staff" value={staff ? '1' : '0'} />
      <div className="auth-field">
        <label htmlFor="auth-email">Email</label>
        <Input id="auth-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
      </div>
      <div className="auth-field">
        <div className="auth-field-row">
          <label htmlFor="auth-password">Password</label>
          <Link href="/forgot-password" className="auth-inline-link">Forgot password?</Link>
        </div>
        <Input id="auth-password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" minLength={12} maxLength={128} required />
      </div>
      <Button name="action" value="signin" className="auth-submit">Sign in</Button>
    </form>
  </>;
}

export function RegisterForm() {
  return <form action={authAction} className="auth-form">
    <div className="auth-field">
      <label htmlFor="register-name">Your name</label>
      <Input id="register-name" name="name" type="text" autoComplete="name" placeholder="Alex Morgan" required maxLength={100} />
    </div>
    <div className="auth-field">
      <label htmlFor="register-email">Email</label>
      <Input id="register-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
    </div>
    <div className="auth-field">
      <label htmlFor="register-password">Password</label>
      <Input id="register-password" name="password" type="password" autoComplete="new-password" placeholder="At least 12 characters" minLength={12} maxLength={128} required />
      <p className="auth-hint">Use at least 12 characters. A longer passphrase is stronger than a short, complicated one.</p>
    </div>
    <label className="auth-check">
      <input type="checkbox" name="terms" value="accepted" required />
      <span>I agree to the <Link href="/legal/terms">Terms of Service</Link> and the <Link href="/legal/privacy">Privacy Policy</Link>, and I understand Redial is not an emergency service.</span>
    </label>
    <Button name="action" value="signup" className="auth-submit">Create account</Button>
    <p className="auth-hint">We will email you a link to confirm your address before you can sign in.</p>
  </form>;
}

export function ForgotPasswordForm() {
  return <form action={authAction} className="auth-form">
    <div className="auth-field">
      <label htmlFor="reset-email">Account email</label>
      <Input id="reset-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
    </div>
    <Button name="action" value="reset" className="auth-submit">Send reset link</Button>
    <p className="auth-hint">Open the emailed link in this same browser. The link expires, and requesting a new one invalidates the last.</p>
  </form>;
}

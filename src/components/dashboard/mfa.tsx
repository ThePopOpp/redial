'use client';
import { useActionState } from 'react';
import { mfaAction } from '@/lib/dashboard/staff-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Two states. With no verified factor the operator enrolls one; with a verified
// factor and an aal1 session they are stepping up, and no secret is shown again.
export function StaffMfa({factor}:{factor?:string}) {
  const [state,action,pending]=useActionState(mfaAction,{message:'',factor});
  return <form action={action} className="review-form">
    <h1>Verify your authenticator</h1>
    {state.message && <p role="status">{state.message}</p>}
    {/* Supabase returns the QR as an SVG data URI, so nothing is fetched and the
        secret never leaves the response. The setup key stays visible beneath it:
        a desktop authenticator cannot scan a screen it is displayed on. */}
    {/* eslint-disable-next-line @next/next/no-img-element -- an inline SVG data URI. next/image cannot optimize one, and routing it through a loader would put the enrollment secret in a request URL. */}
    {state.qr && <img src={state.qr} alt="Enrollment QR code for your authenticator app" width={200} height={200} className="mfa-qr"/>}
    {state.secret && <p>Setup key: <code>{state.secret}</code></p>}
    {state.secret && <p className="field-hint">Keep this key until a second factor exists. Losing the authenticator without it means an administrator must clear the factor before you can sign in again.</p>}
    {state.factor
      ? <>
          <input type="hidden" name="factor" value={state.factor}/>
          <label htmlFor="mfa-code">Six-digit code</label>
          <Input id="mfa-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required/>
          <Button disabled={pending} name="action" value="verify">Verify</Button>
        </>
      : <Button disabled={pending} name="action" value="enroll">Set up an authenticator</Button>}
  </form>;
}

'use client';
import { useActionState } from 'react';
import { mfaAction } from '@/lib/dashboard/staff-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export function StaffMfa({factor}:{factor?:string}) {
  const [state,action,pending]=useActionState(mfaAction,{message:'',factor});
  return <form action={action} className="review-form"><h1>Verify your authenticator</h1>{state.message && <p role="status">{state.message}</p>}{state.secret && <p>Setup key: <code>{state.secret}</code></p>}{state.factor ? <><input type="hidden" name="factor" value={state.factor}/><label htmlFor="mfa-code">Six-digit code</label><Input id="mfa-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required/><Button disabled={pending} name="action" value="verify">Verify</Button></> : <Button disabled={pending} name="action" value="enroll">Set up an authenticator</Button>}</form>;
}

'use client';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

// A password box you can read back.
//
// Hiding what someone types is a guess about their surroundings that is wrong
// most of the time: the common failure is not a shoulder looking over, it is a
// typo in a twelve-character passphrase discovered only after the form refuses
// it. Showing it is opt-in and starts hidden, so the guess still holds for
// anyone who wants it.
//
// The toggle never submits — a button inside a form defaults to submitting, and
// here that would post the form with the password half typed.
export function PasswordField({ id, name = 'password', autoComplete, placeholder, minLength, maxLength = 128, required }: {
  id: string;
  name?: string;
  autoComplete: 'current-password' | 'new-password';
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
}) {
  const [shown, setShown] = useState(false);
  return <div className="auth-password">
    <Input
      id={id} name={name} type={shown ? 'text' : 'password'}
      autoComplete={autoComplete} placeholder={placeholder}
      minLength={minLength} maxLength={maxLength} required={required}
      // A manager that has filled this in should not have its suggestion
      // reshuffled when the type changes.
      spellCheck={false} autoCapitalize="off"
    />
    <button
      type="button" className="auth-password-toggle"
      onClick={() => setShown(current => !current)}
      aria-pressed={shown}
      aria-controls={id}
      title={shown ? 'Hide password' : 'Show password'}
    >
      {shown ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      <span className="sr-only">{shown ? 'Hide password' : 'Show password'}</span>
    </button>
  </div>;
}

'use client';
import { useId, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { useReview } from './provider';

export function Heading({ eyebrow = 'Personal workspace', title, description, children }: { eyebrow?: string; title: string; description: string; children?: React.ReactNode }) {
  return <header className="workspace-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{children && <div className="actions">{children}</div>}</header>;
}
export function Card({ title, subtitle, children, className = '' }: { title?: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return <section className={`workspace-card ${className}`}>{title && <header className="card-heading"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</header>}{children}</section>;
}
export function Badge({ children, tone = '' }: { children: React.ReactNode; tone?: string }) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Empty({ title, children }: { title: string; children: React.ReactNode }) { return <div className="empty-state"><h2>{title}</h2><p>{children}</p></div>; }
export function ActionLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link className="action-link" href={href}>{children}<ArrowUpRight size={16} aria-hidden="true" /></Link>; }
export function Stat({ label, value, detail }: { label: string; value: string | number; detail: string }) { return <div className="stat"><span>{label}</span><strong>{value}</strong><p>{detail}</p></div>; }
export function date(value: string, timezone = 'America/Phoenix') { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(new Date(value)); }
export function human(value: string) { return value.replaceAll('_', ' '); }
export type Field = { name: string; label: string; type?: 'text' | 'email' | 'tel' | 'number' | 'datetime-local' | 'textarea' | 'select' | 'checkbox'; value?: string | number | boolean; options?: readonly (string | { value: string; label: string })[]; required?: boolean; maxLength?: number; hint?: string; min?: number; max?: number };
export function Fields({ fields, errors = {}, onFieldChange }: { fields: Field[]; errors?: Record<string, string>; onFieldChange?: (name: string) => void }) {
  const prefix = useId();
  return <>{fields.map(field => {
    const id = `${prefix}-${field.name}`;
    const common = { id, name: field.name, required: field.required ?? !['checkbox'].includes(field.type || ''), 'aria-describedby': field.hint ? `${id}-hint` : undefined };
    return <div className={`field ${field.type === 'checkbox' ? 'check-field' : ''}`} key={field.name}>
      {field.type === 'checkbox' ? <><Checkbox {...common} defaultChecked={Boolean(field.value)} /><label htmlFor={id}>{field.label}</label></> : <><label htmlFor={id}>{field.label}</label>{field.type === 'textarea' ? <Textarea {...common} rows={4} maxLength={field.maxLength} defaultValue={String(field.value ?? '')} /> : field.type === 'select' ? <Select {...common} defaultValue={String(field.value ?? (typeof field.options?.[0] === 'string' ? field.options[0] : field.options?.[0]?.value) ?? '')} options={field.options ?? []} /> : field.type === 'datetime-local' ? <DateTimePicker {...common} defaultValue={String(field.value ?? '')} error={errors[field.name]} onChange={() => onFieldChange?.(field.name)} /> : <Input {...common} type={field.type || 'text'} min={field.min} max={field.max} maxLength={field.maxLength} defaultValue={String(field.value ?? '')} />}</>}
      {field.hint && <p className="field-hint" id={`${id}-hint`}>{field.hint}</p>}
    </div>;
  })}</>;
}
export function formValues(form: HTMLFormElement, fields: Field[]) {
  const data = new FormData(form);
  return Object.fromEntries(fields.map(field => [field.name, field.type === 'checkbox' ? data.has(field.name) : field.type === 'number' ? Number(data.get(field.name)) : String(data.get(field.name) ?? '')]));
}
export function Editor({ title, description, label = 'Add', fields, command, initial, transform, submit = 'Save locally', outline = true }: { title: string; description?: string; label?: string; fields: Field[]; command: string; initial?: Record<string, unknown>; transform?: (data: Record<string, unknown>) => Record<string, unknown>; submit?: string; outline?: boolean }) {
  const { run, busy, error } = useReview();
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  return <Dialog open={open} onOpenChange={value => { setOpen(value); setFieldErrors({}); }}>
    <DialogTrigger asChild><Button variant={outline ? 'outline' : 'default'}>{label === 'Add' && <Plus size={16} aria-hidden="true" />}{label}</Button></DialogTrigger>
    <DialogContent className="review-dialog">
      <header><DialogTitle>{title}</DialogTitle><DialogClose asChild><button type="button" className="icon-button" aria-label="Close dialog"><X size={20} /></button></DialogClose></header>
      <DialogDescription className={description ? undefined : 'sr-only'}>{description || 'Edit the example data in this local workspace.'}</DialogDescription>
      <form onSubmit={async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = formValues(form, fields);
        const errors = validateDates(data, fields); setFieldErrors(errors);
        if (Object.keys(errors).length) { form.querySelector<HTMLElement>(`[data-field="${Object.keys(errors)[0]}"]`)?.focus(); return; }
        if (await run({ type: command, ...initial, ...(transform ? transform(data) : data) })) setOpen(false);
      }}><Fields fields={fields} errors={fieldErrors} onFieldChange={name => setFieldErrors(current => ({ ...current, [name]: "" }))} /><p className="small-label">This changes synthetic data on this computer only.</p>{error && <p className="error-message" role="alert">{error}</p>}<div className="actions"><Button disabled={busy} type="submit">{busy ? 'Saving…' : submit}</Button><DialogClose asChild><Button variant="outline" type="button">Cancel</Button></DialogClose></div></form>
    </DialogContent>
  </Dialog>;
}
function validateDates(data: Record<string, unknown>, fields: Field[]) {
  const errors: Record<string, string> = {};
  for (const field of fields.filter(field => field.type === 'datetime-local')) {
    const value = String(data[field.name] ?? '');
    if (!value && field.required === false) continue;
    const date = new Date(value);
    const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!parts || !Number.isFinite(date.getTime())) errors[field.name] = 'Choose a date and time for your reminder.';
    else if (date.getHours() !== Number(parts[4]) || date.getMinutes() !== Number(parts[5])) errors[field.name] = 'This time is skipped by a daylight saving change. Choose another time.';
    else if (date.getTime() <= Date.now()) errors[field.name] = 'Choose a date and time in the future.';
  }
  return errors;
}
export function EditForm({ fields, command, initial, transform, submit = 'Save changes' }: { fields: Field[]; command: string; initial?: Record<string, unknown>; transform?: (data: Record<string, unknown>) => Record<string, unknown>; submit?: string }) {
  const { run, busy, error } = useReview();
  return <form className="review-form" onSubmit={async event => { event.preventDefault(); const data = formValues(event.currentTarget, fields); await run({ type: command, ...initial, ...(transform ? transform(data) : data) }); }}><Fields fields={fields} />{error && <p className="error-message" role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy ? 'Saving…' : submit}</Button></form>;
}
export function Confirm({ label, title, description, command }: { label: string; title: string; description: string; command: Record<string, unknown> }) {
  return <Editor label={label} title={title} description={description} fields={[]} command={String(command.type)} initial={command} submit="Confirm locally" />;
}
export const phoneHint = 'Fictional numbers only: +16025550149. No dialing occurs.';



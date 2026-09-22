'use client';

import { useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Select } from './select';

const pad = (value: number) => String(value).padStart(2, '0');

export function DateTimePicker({ id, name, defaultValue = '', required, 'aria-describedby': describedBy, error, onChange }: { id: string; name: string; defaultValue?: string; required?: boolean; 'aria-describedby'?: string; error?: string; onChange?: () => void }) {
  const initial = defaultValue ? new Date(defaultValue) : undefined;
  const validInitial = initial && Number.isFinite(initial.getTime()) ? initial : undefined;
  const [date, setDate] = useState<Date | undefined>(validInitial);
  const [hour, setHour] = useState(String(validInitial ? validInitial.getHours() % 12 || 12 : 9));
  const [minute, setMinute] = useState(pad(validInitial?.getMinutes() ?? 0));
  const [period, setPeriod] = useState(validInitial && validInitial.getHours() >= 12 ? 'PM' : 'AM');
  const [open, setOpen] = useState(false);
  const localHour = Number(hour) % 12 + (period === 'PM' ? 12 : 0);
  const value = date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(localHour)}:${minute}` : '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  function chooseDate(day: Date) { setDate(day); setOpen(false); onChange?.(); }
  return <div className="ui-date-time">
    <input type="hidden" name={name} value={value} />
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><button type="button" role="combobox" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${id}-calendar` : undefined} id={id} data-field={name} data-slot="date-picker-trigger" className="ui-date-trigger" data-empty={!date} aria-required={required || undefined} aria-invalid={Boolean(error)} aria-describedby={[describedBy, error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}>
        <CalendarDays size={18} aria-hidden="true" /><span>{date ? new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }).format(date) : 'Choose a date'}</span>
      </button></PopoverTrigger>
      <PopoverContent id={`${id}-calendar`} className="ui-calendar-popover" aria-label="Choose callback date">
        <Calendar mode="single" selected={date} defaultMonth={date ?? today} onSelect={day => { if (day) chooseDate(day); }} disabled={{ before: today }} autoFocus />
        <div className="ui-calendar-shortcuts"><button type="button" onClick={() => chooseDate(today)}>Today</button><button type="button" onClick={() => { const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1); chooseDate(tomorrow); }}>Tomorrow</button></div>
      </PopoverContent>
    </Popover>
    <div className="ui-time-row"><Clock3 size={17} aria-hidden="true" /><Select aria-label="Hour" value={hour} onValueChange={value => { setHour(value); onChange?.(); }} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: pad(i + 1) }))} /><span aria-hidden="true">:</span><Select aria-label="Minute" value={minute} onValueChange={value => { setMinute(value); onChange?.(); }} options={Array.from({ length: 60 }, (_, i) => pad(i))} /><Select aria-label="AM or PM" value={period} onValueChange={value => { setPeriod(value); onChange?.(); }} options={['AM', 'PM']} /></div>
    {error && <p id={`${id}-error`} className="ui-field-error" role="alert">{error}</p>}
  </div>;
}

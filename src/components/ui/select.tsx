'use client';

import type { ComponentProps } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = string | { value: string; label: string };
type Props = Omit<ComponentProps<typeof SelectPrimitive.Root>, 'children'> & Pick<ComponentProps<typeof SelectPrimitive.Trigger>, 'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'aria-invalid' | 'className'> & { options: readonly Option[]; placeholder?: string };

/** Shadcn Select composition, shared by fields, filters, and time controls. */
export function Select({ options, placeholder = 'Select an option', id, className, 'aria-label': label, 'aria-labelledby': labelledBy, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...props }: Props) {
  return <SelectPrimitive.Root {...props}>
    <SelectPrimitive.Trigger data-slot="select-trigger" className={cn('ui-select-trigger', className)} id={id} aria-label={label} aria-labelledby={labelledBy} aria-describedby={describedBy} aria-invalid={invalid}>
      <SelectPrimitive.Value placeholder={placeholder} /><SelectPrimitive.Icon asChild><ChevronDown size={16} aria-hidden="true" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal><SelectPrimitive.Content data-slot="select-content" className="ui-select-content" position="popper" sideOffset={6} collisionPadding={12}>
      <SelectPrimitive.ScrollUpButton className="ui-select-scroll"><ChevronUp size={16} /></SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport className="ui-select-viewport">{options.map(option => {
        const value = typeof option === 'string' ? option : option.value;
        const text = typeof option === 'string' ? option.replaceAll('_', ' ') : option.label;
        return <SelectPrimitive.Item className="ui-select-item" key={value} value={value}><SelectPrimitive.ItemText>{text}</SelectPrimitive.ItemText><SelectPrimitive.ItemIndicator className="ui-select-indicator"><Check size={15} aria-hidden="true" /></SelectPrimitive.ItemIndicator></SelectPrimitive.Item>;
      })}</SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="ui-select-scroll"><ChevronDown size={16} /></SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content></SelectPrimitive.Portal>
  </SelectPrimitive.Root>;
}

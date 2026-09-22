'use client';
import type { ComponentProps } from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return <CheckboxPrimitive.Root data-slot="checkbox" className={cn('ui-checkbox', className)} {...props}><CheckboxPrimitive.Indicator className="ui-check-indicator"><Check size={13} strokeWidth={2.5} /></CheckboxPrimitive.Indicator></CheckboxPrimitive.Root>;
}

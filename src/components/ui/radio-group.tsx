'use client';
import type { ComponentProps } from 'react';
import * as RadioPrimitive from '@radix-ui/react-radio-group';
import { cn } from '@/lib/utils';

export function RadioGroup({ className, ...props }: ComponentProps<typeof RadioPrimitive.Root>) {
  return <RadioPrimitive.Root data-slot="radio-group" className={cn('ui-radio-group', className)} {...props} />;
}
export function RadioGroupItem({ className, ...props }: ComponentProps<typeof RadioPrimitive.Item>) {
  return <RadioPrimitive.Item data-slot="radio-group-item" className={cn('ui-radio-item', className)} {...props}><RadioPrimitive.Indicator className="ui-radio-dot" /></RadioPrimitive.Item>;
}

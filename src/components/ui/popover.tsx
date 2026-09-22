'use client';
import type { ComponentProps } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export function PopoverContent({ className, align = 'start', sideOffset = 8, ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return <PopoverPrimitive.Portal><PopoverPrimitive.Content data-slot="popover-content" className={cn('ui-popover', className)} align={align} sideOffset={sideOffset} collisionPadding={12} {...props} /></PopoverPrimitive.Portal>;
}

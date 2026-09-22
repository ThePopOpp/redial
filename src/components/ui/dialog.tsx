'use client';
import type { ComponentProps } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export function DialogContent({ className, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="ui-dialog-overlay" /><DialogPrimitive.Content data-slot="dialog-content" className={cn('ui-dialog-content', className)} {...props} /></DialogPrimitive.Portal>;
}

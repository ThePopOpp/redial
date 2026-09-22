'use client';
import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Calendar({ className, ...props }: React.ComponentProps<typeof DayPicker>) {
  return <DayPicker showOutsideDays className={cn('ui-calendar', className)} components={{ Chevron: ({ orientation }) => orientation === 'left' ? <ChevronLeft size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" /> }} {...props} />;
}

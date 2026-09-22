import type { Metadata } from 'next';
import { ReviewShell } from '@/components/review/shell';
export const metadata: Metadata = { title: 'Redial workspace · Local review', robots: { index: false, follow: false } };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <ReviewShell>{children}</ReviewShell>;
}

import type { Metadata } from 'next';
import { ReviewShell } from '@/components/review/shell';
import { runtime } from '@/lib/runtime';
export const metadata: Metadata = { title: 'Redial workspace · Local review', robots: { index: false, follow: false } };

// Read per request, not at build time: one image serves every deployment.
export const dynamic = 'force-dynamic';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  // The proxy 404s /local on a hosted deployment, so those entries would be
  // dead links there.
  return <ReviewShell localPreview={runtime().deployment === 'local'}>{children}</ReviewShell>;
}

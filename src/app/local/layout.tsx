import type { Metadata } from 'next';
import '../setup-workspace.css';
export const metadata: Metadata = { title: 'Setup management', robots: { index: false, follow: false } };
export default function LocalLayout({ children }: { children: React.ReactNode }) { return children; }

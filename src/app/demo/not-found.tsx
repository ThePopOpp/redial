import Link from 'next/link';
export default function NotFound() {
  return <section className="state-page"><p className="eyebrow">Example not found</p><h1>Nothing on this line.</h1><p>This illustrative call does not exist.</p><Link href="/demo/calls" className="text-link">Return to example messages →</Link></section>;
}

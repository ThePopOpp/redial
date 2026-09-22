import Link from 'next/link';
export default function NotFound() { return <main id="main" className="state-page" tabIndex={-1}><p className="eyebrow">Page not found</p><h1>Nothing on this line.</h1><p>This page or illustrative call does not exist.</p><Link href="/" className="text-link">Return to Redial →</Link></main>; }

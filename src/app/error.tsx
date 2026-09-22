'use client';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main" className="state-page" tabIndex={-1}><p className="eyebrow">Preview unavailable</p><h1>Something went wrong.</h1><p>Your call settings have not changed. Try loading this preview again.</p><Button onClick={reset}>Try again</Button></main>;
}

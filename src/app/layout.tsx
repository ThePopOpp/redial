import type { Metadata } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/900.css';
import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource/roboto-mono/400.css';
import './globals.css';
import './review.css';
import './forms.css';
import './contact-import.css';
import './phone-wizard.css';
import './carrier-setup.css';
import './auth.css';
import './ops.css';
import './legal.css';
import { ThemeProvider } from '@/components/theme-provider';

// Indexable by default so the public pages can be found. Every private area
// sets its own noindex, and next.config.ts adds the header as a second guard.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.REDIAL_SITE_URL || 'https://redial.si'),
  title: { default: 'Redial — decide which calls deserve your attention', template: '%s · Redial' },
  description: 'Redial answers unknown callers, asks who is calling and why, takes a message, and shows you a summary. You decide what reaches you.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><ThemeProvider><a className="skip-link" href="#main">Skip to content</a><div className="preview-banner">Early access <span aria-hidden="true">·</span> Call screening and billing are not active yet</div>{children}</ThemeProvider></body></html>;
}

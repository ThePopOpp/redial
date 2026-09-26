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

export const metadata: Metadata = {
  title: { default: 'Redial · Development preview', template: '%s · Redial preview' },
  description: 'A development preview of Redial: call screening, useful messages and clear boundaries.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><ThemeProvider><a className="skip-link" href="#main">Skip to content</a><div className="preview-banner">Development preview <span aria-hidden="true">·</span> Services are not connected</div>{children}</ThemeProvider></body></html>;
}

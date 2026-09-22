'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return <button type="button" className="theme-toggle" aria-label="Toggle light and dark mode" title="Toggle light and dark mode" onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}>
    <Sun className="theme-sun" size={18} aria-hidden="true" /><Moon className="theme-moon" size={18} aria-hidden="true" />
    <span className="sr-only theme-sun">Switch to light mode</span><span className="sr-only theme-moon">Switch to dark mode</span>
  </button>;
}

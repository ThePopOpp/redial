export type NavigationItem = Readonly<{ href: string; label: string }>;

export const publicNavigation: readonly NavigationItem[] = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/compatibility', label: 'Compatibility' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/sign-in', label: 'Sign in' },
];

export const demoNavigation: readonly NavigationItem[] = [
  { href: '/demo/calls', label: 'Calls' },
  { href: '/demo/calls?view=live', label: 'Live calls' },
  { href: '/how-it-works', label: 'Screening guide' },
  { href: '/compatibility', label: 'Connection options' },
];

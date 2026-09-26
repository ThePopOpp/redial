import type { NextConfig } from 'next';

const config: NextConfig = {
  // Docker uses standalone output; local review keeps the normal `next start`
  // layout so existing scripts and fixture paths remain unchanged.
  output: process.env.REDIAL_BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  outputFileTracingExcludes: { '*': ['.redial/**', '.env*', '.codex/**', '.vscode/**', 'docs/**', 'redial-build-kit/**', 'tests/**'] },
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  // Common aliases people type or paste into provider consoles.
  async redirects() {
    return [
      { source: '/login', destination: '/sign-in', permanent: false },
      { source: '/signup', destination: '/register', permanent: false },
      { source: '/reset-password', destination: '/forgot-password', permanent: false },
      { source: '/privacy', destination: '/legal/privacy', permanent: false },
      { source: '/terms', destination: '/legal/terms', permanent: false },
    ];
  },
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'microphone=(), camera=(), geolocation=()' },
    ];
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];
    // Security headers everywhere; noindex only on the private areas. The
    // marketing pages and the legal documents are meant to be found.
    const private_ = ['/app', '/ops', '/demo', '/local', '/account', '/auth', '/api', '/sign-in', '/staff-sign-in', '/register', '/forgot-password'];
    return [
      { source: '/:path*', headers: security },
      ...private_.flatMap(prefix => [
        { source: prefix, headers: noindex },
        { source: `${prefix}/:path*`, headers: noindex },
      ]),
    ];
  },
};

export default config;

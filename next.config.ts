import type { NextConfig } from 'next';

const config: NextConfig = {
  // Docker uses standalone output; local review keeps the normal `next start`
  // layout so existing scripts and fixture paths remain unchanged.
  output: process.env.REDIAL_BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  outputFileTracingExcludes: { '*': ['.redial/**', '.env*', '.codex/**', '.vscode/**', 'docs/**', 'redial-build-kit/**', 'tests/**'] },
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'microphone=(), camera=(), geolocation=()' },
    ];
    return [{
      // Legal documents must be indexable so A2P 10DLC vetting and search can
      // reach them. Everything else stays hidden until public launch.
      source: '/legal/:path*',
      headers: security,
    }, {
      source: '/:path((?!legal).*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        { key: 'Permissions-Policy', value: 'microphone=(), camera=(), geolocation=()' },
      ],
    }];
  },
};

export default config;

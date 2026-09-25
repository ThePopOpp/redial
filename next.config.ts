import type { NextConfig } from 'next';

const config: NextConfig = {
  output: process.env.REDIAL_STANDALONE === '1' ? 'standalone' : undefined,
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  async headers() {
    return [{
      source: '/:path*',
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

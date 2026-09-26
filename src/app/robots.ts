import type { MetadataRoute } from 'next';

// The marketing pages and the legal documents are public. Everything that
// holds an account, a synthetic fixture or an API surface stays out of search.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app', '/ops', '/demo', '/local', '/account', '/auth', '/api', '/sign-in', '/staff-sign-in', '/register', '/forgot-password'],
    },
    sitemap: `${process.env.REDIAL_SITE_URL || 'https://redial.si'}/sitemap.xml`,
  };
}

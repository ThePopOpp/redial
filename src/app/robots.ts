import type { MetadataRoute } from 'next';

// The product stays unindexed until public launch. The legal documents are the
// exception: A2P 10DLC vetting and ordinary review both expect to reach them.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/legal/', disallow: '/' } };
}

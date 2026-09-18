import type { MetadataRoute } from 'next';

/**
 * CodeShelf indexes one person's machine. If an instance is ever reachable
 * from the internet, a crawler should still take nothing from it.
 *
 * Deliberately no sitemap.xml: there are no public URLs to list. Every route
 * is behind the session check in src/proxy.ts.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  };
}

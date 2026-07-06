import { fetchTrestleOData } from '../../lib/trestleServer';
import { SITE_URL } from '../../config/agent';

// Served as /sitemap.xml via the rewrite in next.config.js

const STATIC_ROUTES = [
  '',
  '/agents/john-easter',
  '/lakefront',
  '/swipe',
  '/blog',
  '/faq',
  '/pricing',
  '/privacy',
  '/terms',
];

function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler() {
  const urls = STATIC_ROUTES.map((r) => ({ loc: `${SITE_URL}${r}` }));

  // Add active listings; the sitemap still works if the MLS call fails.
  try {
    const { json } = await fetchTrestleOData('odata/Property', {
      $filter: "StandardStatus eq 'Active'",
      $select: 'ListingKey,ModificationTimestamp',
      $top: 500,
    });
    for (const p of json?.value || []) {
      if (!p.ListingKey) continue;
      urls.push({
        loc: `${SITE_URL}/property/${p.ListingKey}`,
        lastmod: p.ModificationTimestamp ? String(p.ModificationTimestamp).slice(0, 10) : undefined,
      });
    }
  } catch (e) {
    console.error('sitemap: listing fetch failed', e?.message || e);
  }

  const items = urls
    .map(({ loc, lastmod }) =>
      `<url><loc>${xmlEscape(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
    )
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      // Cache at the edge for 6h; crawlers don't need fresher than that.
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
    },
  });
}

export const runtime = 'edge';

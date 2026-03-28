/**
 * Image proxy for MLS / Facebook profile pictures.
 *
 * Security: only domains in ALLOWED_DOMAINS are proxied (SSRF prevention).
 * Performance: images are returned with long-lived cache headers so the browser
 * and Cloudflare CDN can serve them without re-fetching from the origin.
 * If Cloudflare Image Resizing is enabled (Pro+), the fetch will automatically
 * downscale and convert to WebP for thumbnail-sized requests.
 */

const ALLOWED_DOMAINS = [
  'api-trestle.corelogic.com',
  'mlsimages.corelogic.com',
  'cdn.corelogic.com',
  'photos.corelogic.com',
  'graph.facebook.com',
  'platform-lookaside.fbsbx.com',
  'lookaside.fbsbx.com',
  'scontent.fbos1-1.fna.fbcdn.net',
];

export default async function handler(request) {
  const url = new URL(request.url, 'http://localhost');
  const imageUrl = url.searchParams.get('url');
  const width = parseInt(url.searchParams.get('w') || '0', 10) || null;

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate URL and enforce domain allowlist (prevents SSRF)
  let parsed;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (parsed.protocol !== 'https:' || !ALLOWED_DOMAINS.includes(parsed.hostname)) {
    return new Response(JSON.stringify({ error: 'Forbidden domain' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const fetchOptions = {
      headers: { Accept: 'image/webp,image/avif,image/jpeg,image/*' },
    };

    // Use Cloudflare Image Resizing when a width is requested (Pro+ plans).
    // This converts to WebP and resizes server-side — falls back silently on
    // plans that don't have the feature enabled.
    if (width) {
      fetchOptions.cf = {
        image: { width, quality: 78, format: 'webp' },
      };
    }

    const upstream = await fetch(imageUrl, fetchOptions);

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'Image not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache at browser for 24 h; at Cloudflare CDN for 24 h;
        // serve stale for up to 1 h while revalidating.
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
        'Vary': 'Accept',
      },
    });
  } catch (err) {
    console.error('proxy-image error:', err);
    return new Response(JSON.stringify({ error: 'Proxy error' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const runtime = 'edge';

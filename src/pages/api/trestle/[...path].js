import { buildTrestleODataUrl, getTrestleToken } from '../../../lib/trestleServer';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function buildUpstreamUrl(pathParts, searchParams) {
  const joined = pathParts.join('/');

  if (!joined.startsWith('odata/')) {
    return null;
  }

  const params = {};
  for (const [k, v] of searchParams.entries()) {
    if (k === 'path') continue;
    params[k] = v;
  }

  try {
    return buildTrestleODataUrl(joined, params);
  } catch {
    return null;
  }
}

export default async function handler(req) {
  const url = new URL(req.url, 'http://localhost');
  // Extract path segments after /api/trestle/
  const fullPath = url.pathname.replace(/^\/api\/trestle\/?/, '');
  const pathParts = fullPath.split('/').filter(Boolean);
  const upstreamUrl = buildUpstreamUrl(pathParts, url.searchParams);

  if (!upstreamUrl) {
    return json({ error: 'Invalid Trestle proxy path' }, 400);
  }

  if ((req.method || 'GET').toUpperCase() !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { Allow: 'GET', 'Content-Type': 'application/json' },
    });
  }

  try {
    const token = await getTrestleToken();

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 15000);

    let upstream;
    try {
      upstream = await fetch(upstreamUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: req.headers.get('accept') || 'application/json',
        },
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const buf = await upstream.arrayBuffer();

    return new Response(buf, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        // Allow short-term edge/browser caching for successful reads (5 min).
        // This lets Cloudflare serve repeated identical searches from cache
        // without hitting the Trestle origin every time.
        'Cache-Control': upstream.status === 200 ? 'public, max-age=300, s-maxage=300, stale-while-revalidate=60' : 'no-store',
      },
    });
  } catch (e) {
    return json({ error: 'Trestle proxy failed' }, 500);
  }
}

export const runtime = 'edge';

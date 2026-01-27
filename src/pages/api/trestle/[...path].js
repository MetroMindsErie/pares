import { buildTrestleODataUrl, getTrestleToken } from '../../../lib/trestleServer';

function redact(value) {
  if (!value) return value;
  const str = String(value);
  if (str.length <= 8) return '***';
  return `${str.slice(0, 3)}***${str.slice(-3)}`;
}

function buildUpstreamUrl(pathParts, query) {
  const joined = Array.isArray(pathParts) ? pathParts.join('/') : String(pathParts || '');

  // Allowlist only the trestle endpoints we actually use
  // Examples: /api/trestle/odata/Property, /api/trestle/odata/Media, /api/trestle/odata/Lookup
  if (!joined.startsWith('odata/')) {
    return null;
  }

  // Reapply querystring as-is (excluding the Next.js catch-all param)
  const params = {};
  Object.entries(query || {}).forEach(([k, v]) => {
    if (k === 'path') return;
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) params[k] = v[v.length - 1];
    else params[k] = v;
  });

  try {
    return buildTrestleODataUrl(joined, params);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const pathParts = req.query.path;
  const upstreamUrl = buildUpstreamUrl(pathParts, req.query);

  if (!upstreamUrl) {
    return res.status(400).json({ error: 'Invalid Trestle proxy path' });
  }

  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Only log when explicitly enabled. Requests can contain addresses/PII.
  const shouldLog = process.env.TRESTLE_LOG_REQUESTS === 'true';
  if (shouldLog) {
    const safe = new URL(upstreamUrl.toString());
    // Just in case anything sensitive slips into query (shouldn't), redact obvious keys
    ['client_secret', 'clientSecret', 'access_token', 'token'].forEach((k) => {
      if (safe.searchParams.has(k)) safe.searchParams.set(k, redact(safe.searchParams.get(k)));
    });

    // eslint-disable-next-line no-console
  }

  try {
    const token = await getTrestleToken();

    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: req.headers.accept || 'application/json'
      }
    });

    const buf = await upstream.arrayBuffer();

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(Buffer.from(buf));
  } catch (e) {
    // Avoid leaking URLs/headers/tokens in logs. Bubble up a generic error.
    return res.status(500).json({ error: 'Trestle proxy failed' });
  }
}

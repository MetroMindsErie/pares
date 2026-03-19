function getTrestleBaseUrl() {
  // Prefer server-only vars; fall back to existing NEXT_PUBLIC_* for backward compatibility.
  // Expected forms:
  // - https://api.cotality.com/trestle
  // - https://api-trestle.corelogic.com/trestle
  const raw =
    process.env.TRESTLE_BASE_URL ||
    process.env.NEXT_PUBLIC_TRESTLE_BASE_URL ||
    'https://api-trestle.corelogic.com/trestle';

  return String(raw).replace(/\/+$/, '');
}

function getTrestleTokenUrl() {
  const raw =
    process.env.TRESTLE_TOKEN_URL ||
    process.env.NEXT_PUBLIC_TRESTLE_TOKEN_URL ||
    `${getTrestleBaseUrl()}/oidc/connect/token`;
  return String(raw);
}

function getTrestleCredentials() {
  const clientId = process.env.TRESTLE_CLIENT_ID || process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID;
  const clientSecret = process.env.TRESTLE_CLIENT_SECRET || process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Trestle API credentials not configured (set TRESTLE_CLIENT_ID/TRESTLE_CLIENT_SECRET)');
  }
  return { clientId, clientSecret };
}

export function buildTrestleODataUrl(odataPath, params = {}) {
  const cleaned = String(odataPath || '').replace(/^\/+/, '');
  if (!cleaned.startsWith('odata/')) {
    throw new Error('Invalid odataPath (must start with odata/)');
  }

  const baseUrl = getTrestleBaseUrl();
  const url = new URL(`${baseUrl}/${cleaned}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    url.searchParams.set(k, String(v));
  });
  return url;
}

/* ------------------------------------------------------------------ */
/*  Token cache — avoids re-fetching on every OData call              */
/* ------------------------------------------------------------------ */

let _cachedToken = null;
let _tokenExpiresAt = 0;   // epoch ms
let _tokenPromise = null;   // coalesce concurrent requests

async function _fetchTokenFresh() {
  const tokenUrl = getTrestleTokenUrl();
  const { clientId, clientSecret } = getTrestleCredentials();

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'api'
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Trestle token request failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    if (!json?.access_token) {
      throw new Error('Trestle token response missing access_token');
    }

    const expiresIn = Number(json.expires_in) || 3600;
    // Expire 60 s early to avoid using a stale token on the wire.
    _cachedToken = json.access_token;
    _tokenExpiresAt = Date.now() + (expiresIn - 60) * 1000;

    return _cachedToken;
  } finally {
    clearTimeout(timer);
  }
}

export async function getTrestleToken() {
  if (_cachedToken && Date.now() < _tokenExpiresAt) {
    return _cachedToken;
  }

  // Coalesce: if a fetch is already in-flight, piggy-back on it.
  if (!_tokenPromise) {
    _tokenPromise = _fetchTokenFresh().finally(() => { _tokenPromise = null; });
  }
  return _tokenPromise;
}

/* ------------------------------------------------------------------ */
/*  OData fetch with timeout + single retry on transient errors       */
/* ------------------------------------------------------------------ */

const ODATA_TIMEOUT_MS = 15_000;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

async function _fetchODataOnce(url, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ODATA_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      },
      signal: controller.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      const err = new Error(`Trestle OData failed (${res.status}): ${text.slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }

    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    return { url: url.toString(), json, rawText: text };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchTrestleOData(odataPath, params = {}) {
  const token = await getTrestleToken();
  const url = buildTrestleODataUrl(odataPath, params);

  try {
    return await _fetchODataOnce(url, token);
  } catch (err) {
    // Retry once on transient errors or timeout
    const isTransient = RETRYABLE_STATUSES.has(err.status) || err.name === 'AbortError';
    if (!isTransient) throw err;

    // Brief backoff then retry with a fresh token (the old one may have expired mid-flight)
    await new Promise((r) => setTimeout(r, 800));
    const freshToken = await _fetchTokenFresh();
    return _fetchODataOnce(url, freshToken);
  }
}

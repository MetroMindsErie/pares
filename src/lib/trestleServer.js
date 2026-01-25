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

export async function getTrestleToken() {
  const tokenUrl = getTrestleTokenUrl();
  const { clientId, clientSecret } = getTrestleCredentials();

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'api'
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Trestle token request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  if (!json?.access_token) {
    throw new Error('Trestle token response missing access_token');
  }

  return json.access_token;
}

export async function fetchTrestleOData(odataPath, params = {}) {
  const token = await getTrestleToken();
  const url = buildTrestleODataUrl(odataPath, params);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Trestle OData failed (${res.status}): ${text.slice(0, 200)}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { url: url.toString(), json, rawText: text };
}

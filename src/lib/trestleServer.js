const TRESTLE_ORIGIN = 'https://api-trestle.corelogic.com';

export function buildTrestleODataUrl(odataPath, params = {}) {
  const cleaned = String(odataPath || '').replace(/^\/+/, '');
  if (!cleaned.startsWith('odata/')) {
    throw new Error('Invalid odataPath (must start with odata/)');
  }

  const url = new URL(`${TRESTLE_ORIGIN}/trestle/${cleaned}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    url.searchParams.set(k, String(v));
  });
  return url;
}

export async function getTrestleToken() {
  const tokenUrl =
    process.env.NEXT_PUBLIC_TRESTLE_TOKEN_URL ||
    'https://api-trestle.corelogic.com/trestle/oidc/connect/token';

  const clientId = process.env.NEXT_PUBLIC_TRESTLE_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_TRESTLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Trestle API credentials not configured');
  }

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

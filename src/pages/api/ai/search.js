import { createClient } from '@supabase/supabase-js';
import { fetchTrestleOData } from '../../../lib/trestleServer';

const ALLOWED_COUNTIES = ['Erie', 'Warren', 'Crawford'];

function odataEscape(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/'/g, "''");
}

function parseBasicSearch(query) {
  const q = String(query || '').toLowerCase();

  const out = {
    price_min: null,
    price_max: null,
    beds_min: null,
    zip: null,
    location: null,
    status: 'Active',
    want_lease: false,
  };

  out.want_lease = /\b(rent|rental|lease)\b/.test(q);

  // status heuristics
  if (/\b(sold|closed)\b/.test(q)) out.status = 'Closed';
  else if (/\b(pending|under contract)\b/.test(q)) out.status = 'Pending';
  else if (/\b(expired)\b/.test(q)) out.status = 'Expired';

  const normalizeAmount = (raw, suffix) => {
    if (!raw) return null;
    const cleaned = String(raw).replace(/,/g, '');
    let num = Number(cleaned);
    if (Number.isNaN(num)) return null;
    if (suffix === 'k') num *= 1000;
    if (suffix === 'm') num *= 1_000_000;
    return Math.round(num);
  };

  // Zip code (5-digit)
  const zipMatch = q.match(/\b(\d{5})\b/);
  if (zipMatch) out.zip = zipMatch[1];

  // price range: "between 200k and 300k"
  const betweenMatch = q.match(
    /\bbetween\s*\$?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(k|m)?\s+and\s+\$?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(k|m)?\b/
  );
  if (betweenMatch) {
    const min = normalizeAmount(betweenMatch[1], betweenMatch[2]);
    const max = normalizeAmount(betweenMatch[3], betweenMatch[4]);
    if (min !== null) out.price_min = min;
    if (max !== null) out.price_max = max;
  } else {
    // price max: "under 250k", "below 300000", "<= 400k", "under 250,000"
    const maxMatch = q.match(
      /\b(under|below|less than|<=)\s*\$?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(k|m)?\b/
    );
    if (maxMatch) {
      const max = normalizeAmount(maxMatch[2], maxMatch[3]);
      if (max !== null) out.price_max = max;
    }

    // price min: "over 300k", "above 200000", ">= 150k"
    const minMatch = q.match(
      /\b(over|above|more than|greater than|>=|at least)\s*\$?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(k|m)?\b/
    );
    if (minMatch) {
      const min = normalizeAmount(minMatch[2], minMatch[3]);
      if (min !== null) out.price_min = min;
    }
  }

  // beds: "3 beds", "3 bed", "3br", "3+ beds"
  const bedsMatch = q.match(/\b(\d+)\s*\+?\s*(beds?|br)\b/);
  if (bedsMatch) {
    const num = Number(bedsMatch[1]);
    if (!Number.isNaN(num)) out.beds_min = num;
  }

  // location: "in erie" or "in 16505" or fallback county
  const inMatch = q.match(/\bin\s+([a-z0-9\s]+?)(?:\bwith\b|\bunder\b|\bbelow\b|\bover\b|\babove\b|\bbetween\b|\bfor\b|\b$)/);
  if (inMatch) {
    const term = inMatch[1].trim();
    if (/^\d{5}$/.test(term)) out.zip = term;
    else out.location = term;
  } else {
    // fallback: if query contains one of the target counties
    const county = ALLOWED_COUNTIES.find((c) => q.includes(c.toLowerCase()));
    if (county) out.location = county.toLowerCase();
  }

  return out;
}

function mapTrestleStatusToEasters(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('active')) return 'active';
  if (s.includes('pending')) return 'pending';
  if (s.includes('closed') || s.includes('sold')) return 'sold';
  if (s.includes('expired')) return 'expired';
  return 'active';
}

function mapTrestlePropertyToListing(p) {
  const unparsed = p?.UnparsedAddress ? String(p.UnparsedAddress) : '';
  const fallbackAddress = `${p?.StreetNumber || ''} ${p?.StreetName || ''}`.trim();

  return {
    id: String(p?.ListingKey || p?.ListingId || p?.ListingKeyNumeric || ''),
    address: unparsed || fallbackAddress,
    city: String(p?.City || p?.PostalCity || ''),
    county: String(p?.CountyOrParish || ''),
    state: String(p?.StateOrProvince || p?.State || ''),
    zip: String(p?.PostalCode || ''),
    price: Number(p?.ListPrice ?? p?.ClosePrice ?? 0),
    beds: Number(p?.BedroomsTotal ?? 0),
    baths: Number(p?.BathroomsTotalInteger ?? 0),
    property_type: String(p?.PropertyType || ''),
    status: mapTrestleStatusToEasters(p?.StandardStatus || p?.MlsStatus || p?.Status),
    sqft: Number(p?.LivingArea ?? p?.LivingAreaSquareFeet ?? 0),
  };
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Default to IPv4 loopback to avoid occasional localhost/IPv6 resolution issues.
    const ragBase = process.env.RAG_API_URL || 'http://127.0.0.1:3001';

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const query = body?.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Invalid request: query must be a string' });
    }

    // Optional: identify user from Bearer token (for logging)
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    let userId = null;
    const supabase = token ? getSupabaseAdmin() : null;
    if (supabase && token) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user?.id) userId = data.user.id;
    }

    // Phase A: retrieve real listings from Trestle (authoritative datasource)
    const parsed = parseBasicSearch(query);
    console.log('[AI_PROXY] query', query);
    console.log('[AI_PROXY] parsed', parsed);
    const filters = [];

    // County restriction (MLS coverage)
    filters.push(`(${ALLOWED_COUNTIES.map((c) => `CountyOrParish eq '${odataEscape(c)}'`).join(' or ')})`);

    // Default status
    if (parsed.status) {
      filters.push(`StandardStatus eq '${odataEscape(parsed.status)}'`);
    }

    if (parsed.zip) {
      filters.push(`PostalCode eq '${odataEscape(parsed.zip)}'`);
    }

    if (parsed.price_min) {
      filters.push(`ListPrice ge ${Math.floor(parsed.price_min)}`);
    }

    if (parsed.price_max) {
      filters.push(`ListPrice le ${Math.floor(parsed.price_max)}`);
    }

    if (parsed.beds_min) {
      filters.push(`BedroomsTotal ge ${Math.floor(parsed.beds_min)}`);
    }

    if (parsed.location) {
      const loc = odataEscape(parsed.location);
      filters.push(`(contains(tolower(City), '${loc.toLowerCase()}') or contains(tolower(CountyOrParish), '${loc.toLowerCase()}') or contains(tolower(UnparsedAddress), '${loc.toLowerCase()}'))`);
    }

    // Default to sale listings unless user explicitly asks to rent/lease.
    // This MLS feed exposes PropertyType as an enum, so string comparisons/functions are unreliable.
    // Heuristic: rental ListPrice is typically a monthly amount (< 10k).
    if (!parsed.want_lease) {
      filters.push('ListPrice ge 10000');
    }

    const trestleParams = {
      $filter: filters.join(' and '),
      $top: '25',
      $skip: '0',
      $expand: 'Media',
      $orderby: 'ListPrice asc'
    };

    console.log('[AI_PROXY] trestle retrieve params', trestleParams);

    const trestle = await fetchTrestleOData('odata/Property', trestleParams);
    const trestleValues = Array.isArray(trestle?.json?.value) ? trestle.json.value : [];
    const mappedListings = trestleValues.map(mapTrestlePropertyToListing).filter((l) => l.id);

    // Phase B: call Easters AI explanation endpoint using provided listings
    console.log('[AI_PROXY] ->', `${ragBase}/ai/explain`, `(listings=${mappedListings.length})`);
    const upstream = await fetch(`${ragBase}/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, listings: mappedListings })
    });

    const text = await upstream.text();

    // Log search (best-effort; never block response)
    if (supabase && userId) {
      try {
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }

        const resultsCount = Array.isArray(parsed?.listings)
          ? parsed.listings.length
          : (typeof parsed?.results_count === 'number' ? parsed.results_count : null);

        await supabase.from('user_search_queries').insert({
          user_id: userId,
          query_params: { query },
          results_count: resultsCount
        });
      } catch {
        // ignore logging errors
      }
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(500).json({
      error: 'AI search proxy failed',
      details: e?.message || String(e)
    });
  }
}

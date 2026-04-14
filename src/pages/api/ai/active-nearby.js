import { fetchTrestleOData } from '../../../lib/trestleServer.js';
import { edgeHandler } from '../../../lib/edgeHandler';
import { getMediaUrls, getPrimaryPhotoUrl } from '../../../utils/mediaHelpers.js';


function odataEscape(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/'/g, "''");
}

function normalizeLoose(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAddressParts(input) {
  const raw = String(input || '').trim();
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  const restRaw = parts.slice(1).join(' ');
  const rest = normalizeLoose(restRaw);
  const zipMatch = raw.match(/\b\d{5}\b/);
  const zip = zipMatch ? zipMatch[0] : null;
  const cityToken = rest.split(' ').find((t) => t.length >= 3) || null;
  return { raw, cityToken, zip };
}

function mapTrestlePropertyToListing(p) {
  const mediaItems = Array.isArray(p?.Media) ? p.Media.slice() : [];
  const mediaUrls = getMediaUrls(mediaItems);
  const imageUrl = getPrimaryPhotoUrl(mediaItems);
  const unparsed = p?.UnparsedAddress ? String(p.UnparsedAddress) : '';
  const fallbackAddress = `${p?.StreetNumber || ''} ${p?.StreetName || ''}`.trim();

  return {
    id: String(p?.ListingKey || p?.ListingId || p?.ListingKeyNumeric || ''),
    address: unparsed || fallbackAddress,
    city: String(p?.City || p?.PostalCity || ''),
    county: String(p?.CountyOrParish || ''),
    state: String(p?.StateOrProvince || p?.State || ''),
    zip: String(p?.PostalCode || ''),
    price: Number(p?.ListPrice ?? 0),
    beds: Number(p?.BedroomsTotal ?? 0),
    baths: Number(p?.BathroomsTotalInteger ?? 0),
    property_type: String(p?.PropertyType || ''),
    status: String(p?.StandardStatus || ''),
    sqft: Number(p?.LivingArea ?? 0),
    image_url: imageUrl,
    media_urls: mediaUrls,
  };
}

function computePriceBand(subjectPrice) {
  const price = Number(subjectPrice);
  if (!Number.isFinite(price) || price <= 0) return null;
  const min = Math.max(10000, Math.round(price * 0.75));
  const max = Math.round(price * 1.25);
  if (min >= max) return null;
  return { min, max };
}

/* ── Geo-radius helpers ─────────────────────────────────────── */

function isValidCoord(v) {
  const n = Number(v);
  return Number.isFinite(n) && !(Math.abs(n) < 0.000001);
}

function haversineDistanceMiles(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function determineSearchRadius(subjectRaw) {
  const lot = Number(subjectRaw?.LotSizeAcres ?? 0);
  if (lot > 0 && lot <= 0.15) return { radiusMiles: 0.5, density: 'urban' };
  if (lot > 0.15 && lot <= 0.5) return { radiusMiles: 1.5, density: 'suburban' };
  if (lot > 0.5 && lot <= 2)   return { radiusMiles: 3, density: 'exurban' };
  if (lot > 2)                 return { radiusMiles: 7, density: 'rural' };
  return { radiusMiles: 2, density: 'unknown' };
}

function filterCompsByRadius(comps, subjectLat, subjectLng, initialRadius, density, minComps = 3) {
  if (!isValidCoord(subjectLat) || !isValidCoord(subjectLng)) {
    return { filtered: comps, radiusUsed: null, expandedRadius: false, density };
  }
  const withDist = comps.map((c) => {
    if (!isValidCoord(c.lat) || !isValidCoord(c.lng)) return { ...c, distance_miles: null };
    return { ...c, distance_miles: Math.round(haversineDistanceMiles(subjectLat, subjectLng, c.lat, c.lng) * 100) / 100 };
  });
  withDist.sort((a, b) => {
    if (a.distance_miles == null && b.distance_miles == null) return 0;
    if (a.distance_miles == null) return 1;
    if (b.distance_miles == null) return -1;
    return a.distance_miles - b.distance_miles;
  });
  const multipliers = [1, 1.5, 2, 3, 5];
  for (const m of multipliers) {
    const r = initialRadius * m;
    const inRadius = withDist.filter((c) => c.distance_miles != null && c.distance_miles <= r);
    if (inRadius.length >= minComps) {
      return { filtered: inRadius, radiusUsed: r, expandedRadius: m > 1, density };
    }
  }
  return { filtered: withDist, radiusUsed: initialRadius * 5, expandedRadius: true, density };
}

/* ── End geo-radius helpers ─────────────────────────────────── */

export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const address = body?.address;
    const subjectId = body?.subject_id;
    const county = body?.county;
    const zip = body?.zip;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Invalid request: address must be a string' });
    }

    let subjectRaw = null;
    if (subjectId && typeof subjectId === 'string' && subjectId.trim()) {
      const byIdFilter = `ListingKey eq '${odataEscape(subjectId.trim())}'`;
      const subjectRes = await fetchTrestleOData('odata/Property', {
        $top: '1',
        $select:
          'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,MLSAreaMajor,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,LotSizeAcres,Latitude,Longitude,StandardStatus,ClosePrice,ListPrice',
        $expand: 'Media',
        $filter: byIdFilter,
      });
      const subjectRows = Array.isArray(subjectRes?.json?.value) ? subjectRes.json.value : [];
      subjectRaw = subjectRows[0] || null;
    }

    const parsed = parseAddressParts(address);
    const subjectCity = String(subjectRaw?.City || parsed.cityToken || '');
    const subjectCounty = String(subjectRaw?.CountyOrParish || county || '');
    const subjectZip = String(subjectRaw?.PostalCode || zip || parsed.zip || '');
    const subjectMlsArea = String(subjectRaw?.MLSAreaMajor || '').trim();
    const subjectBeds = Number(subjectRaw?.BedroomsTotal ?? 0);
    const subjectBaths = Number(subjectRaw?.BathroomsTotalInteger ?? 0);
    const subjectType = String(subjectRaw?.PropertyType || '').trim();
    const priceBand = computePriceBand(subjectRaw?.ListPrice ?? body?.price);
    const subjectKey = subjectId && String(subjectId).trim() ? String(subjectId).trim() : '';

    const baseFilters = [];
    baseFilters.push(`(StandardStatus eq 'Active' or StandardStatus eq 'ActiveUnderContract')`);
    if (subjectMlsArea) {
      baseFilters.push(`MLSAreaMajor eq '${odataEscape(subjectMlsArea)}'`);
    } else {
      if (subjectCounty) baseFilters.push(`contains(tolower(CountyOrParish), '${odataEscape(normalizeLoose(subjectCounty))}')`);
      if (subjectCity) baseFilters.push(`contains(tolower(City), '${odataEscape(normalizeLoose(subjectCity))}')`);
    }
    if (subjectKey) baseFilters.push(`ListingKey ne '${odataEscape(subjectKey)}'`);

    const attempts = [
      { includeZip: true, includeType: true, includeBand: true, includeBedsBaths: true },
      { includeZip: false, includeType: true, includeBand: true, includeBedsBaths: true },
      { includeZip: false, includeType: false, includeBand: true, includeBedsBaths: true },
      { includeZip: false, includeType: false, includeBand: false, includeBedsBaths: true },
      { includeZip: false, includeType: false, includeBand: false, includeBedsBaths: false },
    ];

    let listings = [];
    for (const attempt of attempts) {
      const compFilters = baseFilters.slice();
      if (attempt.includeZip && subjectZip) compFilters.push(`PostalCode eq '${odataEscape(subjectZip)}'`);
      if (attempt.includeType && subjectType) compFilters.push(`PropertyType eq '${odataEscape(subjectType)}'`);
      if (attempt.includeBand && priceBand?.min) compFilters.push(`ListPrice ge ${priceBand.min}`);
      if (attempt.includeBand && priceBand?.max) compFilters.push(`ListPrice le ${priceBand.max}`);
      if (attempt.includeBedsBaths && subjectBeds) compFilters.push(`BedroomsTotal ge ${Math.max(0, subjectBeds - 1)}`);
      if (attempt.includeBedsBaths && subjectBeds) compFilters.push(`BedroomsTotal le ${subjectBeds + 1}`);
      if (attempt.includeBedsBaths && subjectBaths) compFilters.push(`BathroomsTotalInteger ge ${Math.max(0, subjectBaths - 1)}`);
      if (attempt.includeBedsBaths && subjectBaths) compFilters.push(`BathroomsTotalInteger le ${subjectBaths + 1}`);

      const compsRes = await fetchTrestleOData('odata/Property', {
        $top: '40',
        $select:
          'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,MLSAreaMajor,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,Latitude,Longitude,StandardStatus,ListPrice,ModificationTimestamp',
        $expand: 'Media',
        $filter: compFilters.join(' and '),
        $orderby: 'ListPrice asc',
      });

      const rows = Array.isArray(compsRes?.json?.value) ? compsRes.json.value : [];
      listings = rows.map(mapTrestlePropertyToListing).filter((l) => l.id);
      if (listings.length > 0) break;
    }

    // ── Radius filtering ───────────────────────────────────────
    const subjectLat = Number(subjectRaw?.Latitude);
    const subjectLng = Number(subjectRaw?.Longitude);
    const { radiusMiles, density } = determineSearchRadius(subjectRaw);
    const radiusResult = filterCompsByRadius(listings, subjectLat, subjectLng, radiusMiles, density);
    listings = radiusResult.filtered;
    // ── End radius filtering ───────────────────────────────────

    return res.json({ listings, radius: { miles: radiusResult.radiusUsed, density, expanded: radiusResult.expandedRadius } });
  } catch (e) {
    return res.status(500).json({ error: 'Active nearby lookup failed', details: e?.message || String(e) });
  }
}

);

export const runtime = 'edge';

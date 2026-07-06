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

  const streetRaw = parts[0] || raw;
  const restRaw = parts.slice(1).join(' ');

  const street = normalizeLoose(streetRaw);
  const rest = normalizeLoose(restRaw);

  const streetNumberMatch = street.match(/^\d{1,6}/);
  const streetNumber = streetNumberMatch ? streetNumberMatch[0] : null;
  const streetWithoutNumber = streetNumber ? street.slice(streetNumber.length).trim() : street;

  const streetTokens = streetWithoutNumber
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);

  const zipMatch = raw.match(/\b\d{5}\b/);
  const zip = zipMatch ? zipMatch[0] : null;

  const cityToken = rest.split(' ').find((t) => t.length >= 3) || null;
  const mentionsCounty = /\bcounty\b/i.test(restRaw);

  // Use a compact street query for UnparsedAddress contains().
  const streetQuery = normalizeLoose(`${streetNumber || ''} ${streetTokens.slice(0, 3).join(' ')}`);

  return {
    raw,
    streetRaw,
    streetQuery,
    streetNumber,
    streetNameToken: streetTokens[0] || null,
    cityToken,
    zip,
    mentionsCounty,
  };
}

function toPositiveNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseSubjectDetails(input) {
  if (!input || typeof input !== 'object') return null;
  const details = {
    beds: toPositiveNumberOrNull(input?.beds),
    baths: toPositiveNumberOrNull(input?.baths),
    sqft: toPositiveNumberOrNull(input?.sqft),
    garage: toPositiveNumberOrNull(input?.garage),
    rooms: toPositiveNumberOrNull(input?.rooms),
  };
  const hasAny = Object.values(details).some((v) => v != null);
  return hasAny ? details : null;
}

function applySubjectDetails(base, details) {
  if (!base) return base;
  if (!details) return base;
  return {
    ...base,
    beds: details.beds ?? base.beds,
    baths: details.baths ?? base.baths,
    sqft: details.sqft ?? base.sqft,
    parking_total: details.garage ?? base.parking_total,
  };
}

function formatSubjectDetailsLine(details) {
  if (!details) return '';
  const parts = [];
  if (details.beds) parts.push(`${details.beds} bd`);
  if (details.baths) parts.push(`${details.baths} ba`);
  if (details.sqft) parts.push(`${Math.round(details.sqft).toLocaleString()} sf`);
  if (details.garage) parts.push(`${details.garage} garage`);
  if (!parts.length) return '';
  return `User-provided subject details applied: ${parts.join(' • ')}`;
}

function shouldLogPricing() {
  // Pricing requests often include street addresses; only log when explicitly enabled.
  return process.env.DEBUG_PRICING === '1';
}

function logPricing(...args) {
  if (!shouldLogPricing()) return;
}

function wantsDebug(req) {
  const v = req?.query?.debug;
  return v === '1' || v === 'true';
}

function mapTrestlePropertyToListing(p) {
  const mediaItems = Array.isArray(p?.Media) ? p.Media.slice() : [];
  const mediaUrls = getMediaUrls(mediaItems);
  const imageUrl = getPrimaryPhotoUrl(mediaItems);
  const unparsed = p?.UnparsedAddress ? String(p.UnparsedAddress) : '';
  const fallbackAddress = `${p?.StreetNumber || ''} ${p?.StreetName || ''}`.trim();

  const lat = Number(p?.Latitude);
  const lng = Number(p?.Longitude);
  const hasValidCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001);

  return {
    id: String(p?.ListingKey || p?.ListingId || p?.ListingKeyNumeric || ''),
    address: unparsed || fallbackAddress,
    city: String(p?.City || p?.PostalCity || ''),
    county: String(p?.CountyOrParish || ''),
    state: String(p?.StateOrProvince || p?.State || ''),
    zip: String(p?.PostalCode || ''),
    price: Number(p?.ClosePrice ?? p?.ListPrice ?? 0),
    beds: Number(p?.BedroomsTotal ?? 0),
    baths: Number(p?.BathroomsTotalInteger ?? 0),
    parking_total: Number(p?.ParkingTotal ?? 0),
    property_type: String(p?.PropertyType || ''),
    status: String(p?.StandardStatus || ''),
    sqft: Number(p?.LivingArea ?? 0),
    close_date: p?.CloseDate ? String(p.CloseDate).slice(0, 10) : null,
    lat: hasValidCoords ? lat : null,
    lng: hasValidCoords ? lng : null,
    image_url: imageUrl,
    media_urls: mediaUrls,
  };
}

function inferCityFromComps(comps) {
  if (!Array.isArray(comps) || comps.length === 0) return '';
  const counts = new Map();
  const exemplar = new Map();
  for (const c of comps) {
    const raw = String(c?.city || '').trim();
    if (!raw) continue;
    const key = normalizeLoose(raw);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!exemplar.has(key)) exemplar.set(key, raw);
  }
  let bestKey = '';
  let bestCount = 0;
  for (const [k, n] of counts.entries()) {
    if (n > bestCount) {
      bestCount = n;
      bestKey = k;
    }
  }
  return bestKey ? (exemplar.get(bestKey) || '') : '';
}

async function lookupSubjectAnyStatusByAddress(addr, { countyHint } = {}) {
  const parsed = parseAddressParts(addr);
  const clauses = [];

  const normalizedCountyHint = normalizeLoose(countyHint || '').replace(/\bcounty\b/g, '').trim();
  const parsedCity = normalizeLoose(parsed.cityToken || '').trim();
  const shouldUseCityToken =
    Boolean(parsed.cityToken) &&
    !parsed.zip &&
    !parsed.mentionsCounty &&
    !(normalizedCountyHint && parsedCity && parsedCity === normalizedCountyHint);

  if (parsed.streetNumber && parsed.streetNameToken) {
    const c = [
      `StreetNumber eq '${odataEscape(parsed.streetNumber)}'`,
      `contains(tolower(UnparsedAddress), '${odataEscape(`${parsed.streetNumber} ${parsed.streetNameToken}`)}')`,
    ];
    if (shouldUseCityToken) c.push(`contains(tolower(City), '${odataEscape(parsed.cityToken)}')`);
    if (parsed.zip) c.push(`PostalCode eq '${odataEscape(parsed.zip)}'`);
    clauses.push(`(${c.join(' and ')})`);
  }

  if (parsed.streetQuery) {
    clauses.push(`contains(tolower(UnparsedAddress), '${odataEscape(parsed.streetQuery)}')`);
  }

  if (!clauses.length) {
    clauses.push(`contains(tolower(UnparsedAddress), '${odataEscape(normalizeLoose(addr))}')`);
  }

  const subjectFilter = clauses.join(' or ');

  const subjectSelect =
    'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,ParkingTotal,Latitude,Longitude,StandardStatus,ClosePrice,ListPrice,CloseDate,YearBuilt,LotSizeAcres,MLSAreaMajor,ModificationTimestamp';

  const subjectRes = await fetchTrestleOData('odata/Property', {
    $top: '5',
    $select: subjectSelect,
    $filter: subjectFilter,
    $orderby: 'ModificationTimestamp desc',
  });

  const subjectRows = Array.isArray(subjectRes?.json?.value) ? subjectRes.json.value : [];
  return { subjectRaw: subjectRows[0] || null, parsed };
}

function computeAdjustedRangeFromComps({ comps, subjectSqft }) {
  const subjectArea = Number(subjectSqft);
  if (!Number.isFinite(subjectArea) || subjectArea <= 0) return null;

  const ppsfItems = comps
    .map((c) => {
      const price = Number(c?.price);
      const sqft = Number(c?.sqft);
      if (!Number.isFinite(price) || price <= 0) return null;
      if (!Number.isFinite(sqft) || sqft <= 0) return null;
      return { value: price / sqft, weight: recencyWeight(c?.close_date) };
    })
    .filter(Boolean)
    .sort((a, b) => a.value - b.value);

  if (ppsfItems.length < 3) return null;

  const p25 = weightedPercentile(ppsfItems, 0.25);
  const p50 = weightedPercentile(ppsfItems, 0.5);
  const p75 = weightedPercentile(ppsfItems, 0.75);

  const low = Number.isFinite(p25) ? Math.round(p25 * subjectArea) : null;
  const mid = Number.isFinite(p50) ? Math.round(p50 * subjectArea) : null;
  const high = Number.isFinite(p75) ? Math.round(p75 * subjectArea) : null;

  if (!low || !mid || !high) return null;

  return {
    low,
    mid,
    high,
    ppsf_stats: { p25, p50, p75, n: ppsfItems.length },
  };
}

function percentile(sorted, p) {
  if (!Array.isArray(sorted) || sorted.length === 0) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

/* ── Recency weighting helpers ──────────────────────────────────── */

/**
 * Compute a recency weight for a comp based on how recently it closed.
 * Recent comps are weighted more heavily; older comps gradually decay.
 *
 *  0–6 months   → weight 1.0  (full weight – best comps)
 *  6–12 months  → weight 0.85
 *  12–24 months → weight 0.65
 *  24–36 months → weight 0.45
 *  36–60 months → weight 0.25
 *  >60 months   → weight 0.10
 */
function recencyWeight(closeDateStr) {
  if (!closeDateStr) return 0.5; // Unknown date gets a moderate weight
  const closeDate = new Date(closeDateStr);
  if (isNaN(closeDate.getTime())) return 0.5;
  const now = new Date();
  const monthsAgo = (now - closeDate) / (1000 * 60 * 60 * 24 * 30.44);
  if (monthsAgo <= 6) return 1.0;
  if (monthsAgo <= 12) return 0.85;
  if (monthsAgo <= 24) return 0.65;
  if (monthsAgo <= 36) return 0.45;
  if (monthsAgo <= 60) return 0.25;
  return 0.10;
}

/**
 * Weighted percentile: like percentile() but each value carries a weight.
 * Uses linear interpolation of the weighted empirical CDF.
 *
 * @param {{ value: number, weight: number }[]} items – must be sorted by value ascending.
 * @param {number} p – target percentile (0–1).
 */
function weightedPercentile(items, p) {
  if (!Array.isArray(items) || items.length === 0) return null;
  if (items.length === 1) return items[0].value;

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight <= 0) return null;

  // Build cumulative weight fractions (midpoint of each item's weight band).
  let cumWeight = 0;
  const points = items.map((item) => {
    cumWeight += item.weight;
    return { value: item.value, cdf: (cumWeight - item.weight / 2) / totalWeight };
  });

  // Clamp to endpoints.
  if (p <= points[0].cdf) return points[0].value;
  if (p >= points[points.length - 1].cdf) return points[points.length - 1].value;

  // Interpolate between bracketing points.
  for (let i = 1; i < points.length; i++) {
    if (p <= points[i].cdf) {
      const lo = points[i - 1];
      const hi = points[i];
      const t = (p - lo.cdf) / (hi.cdf - lo.cdf);
      return lo.value + t * (hi.value - lo.value);
    }
  }
  return points[points.length - 1].value;
}

/**
 * Compute weighted p25/p50/p75 from an array of comps.
 * Each comp's weight is determined by how recently it closed.
 */
function weightedPriceStats(comps) {
  const items = comps
    .map((c) => {
      const price = Number(c?.price);
      if (!Number.isFinite(price) || price <= 0) return null;
      return { value: price, weight: recencyWeight(c?.close_date) };
    })
    .filter(Boolean)
    .sort((a, b) => a.value - b.value);

  if (items.length === 0) return { p25: null, p50: null, p75: null, count: 0 };
  return {
    p25: weightedPercentile(items, 0.25),
    p50: weightedPercentile(items, 0.5),
    p75: weightedPercentile(items, 0.75),
    count: items.length,
  };
}

/* ── End recency weighting helpers ──────────────────────────────── */

function rankAndLimitCmaComps(comps, { subjectPrice, fallbackPrice, radiusMiles, subjectDetails }) {
  if (!Array.isArray(comps) || comps.length === 0) return [];

  const refPrice = Number.isFinite(Number(subjectPrice)) && Number(subjectPrice) > 0
    ? Number(subjectPrice)
    : (Number.isFinite(Number(fallbackPrice)) && Number(fallbackPrice) > 0 ? Number(fallbackPrice) : null);

  const refRadius = Number.isFinite(Number(radiusMiles)) && Number(radiusMiles) > 0
    ? Number(radiusMiles)
    : 10;

  const ranked = comps
    .map((c) => {
      const compPrice = Number(c?.price);
      const compDistance = Number(c?.distance_miles);

      const priceScore = (refPrice && Number.isFinite(compPrice) && compPrice > 0)
        ? Math.max(0, 1 - (Math.abs(compPrice - refPrice) / refPrice))
        : 0.5;

      const distanceScore = Number.isFinite(compDistance)
        ? Math.max(0, 1 - (compDistance / refRadius))
        : 0.35;

      const recencyScore = recencyWeight(c?.close_date);

      const bedsScore = subjectDetails?.beds && c?.beds
        ? Math.max(0, 1 - (Math.abs(Number(c.beds) - Number(subjectDetails.beds)) / Math.max(1, Number(subjectDetails.beds))))
        : 0.5;

      const bathsScore = subjectDetails?.baths && c?.baths
        ? Math.max(0, 1 - (Math.abs(Number(c.baths) - Number(subjectDetails.baths)) / Math.max(1, Number(subjectDetails.baths))))
        : 0.5;

      const sqftScore = subjectDetails?.sqft && c?.sqft
        ? Math.max(0, 1 - (Math.abs(Number(c.sqft) - Number(subjectDetails.sqft)) / Math.max(1, Number(subjectDetails.sqft))))
        : 0.5;

      const garageScore = subjectDetails?.garage && c?.parking_total
        ? Math.max(0, 1 - (Math.abs(Number(c.parking_total) - Number(subjectDetails.garage)) / Math.max(1, Number(subjectDetails.garage))))
        : 0.5;

      const detailScore = (bedsScore * 0.35) + (bathsScore * 0.3) + (sqftScore * 0.25) + (garageScore * 0.1);

      // Realtor-style ranking: most similar price + closest proximity, then recency.
      const totalScore = (priceScore * 0.45) + (distanceScore * 0.25) + (detailScore * 0.2) + (recencyScore * 0.1);

      return {
        ...c,
        _cma_score: totalScore,
      };
    })
    .sort((a, b) => {
      if (b._cma_score !== a._cma_score) return b._cma_score - a._cma_score;

      const ad = Number(a?.distance_miles);
      const bd = Number(b?.distance_miles);
      const aDistValid = Number.isFinite(ad);
      const bDistValid = Number.isFinite(bd);
      if (aDistValid && bDistValid && ad !== bd) return ad - bd;
      if (aDistValid && !bDistValid) return -1;
      if (!aDistValid && bDistValid) return 1;

      const aTs = a?.close_date ? Date.parse(a.close_date) : NaN;
      const bTs = b?.close_date ? Date.parse(b.close_date) : NaN;
      const aValid = Number.isFinite(aTs);
      const bValid = Number.isFinite(bTs);
      if (aValid && bValid) return bTs - aTs;
      if (aValid) return -1;
      if (bValid) return 1;
      return 0;
    });

  const maxToShow = ranked.length >= 5 ? 10 : ranked.length;
  return ranked.slice(0, Math.min(maxToShow, ranked.length)).map((c) => {
    const { _cma_score, ...rest } = c;
    return rest;
  });
}

function classifyPrice(listPrice, low, high, mid) {
  if (!Number.isFinite(listPrice) || !Number.isFinite(low) || !Number.isFinite(high) || !Number.isFinite(mid)) return null;
  if (listPrice < low) return 'Undervalued / Strong Deal';
  if (listPrice > high) return 'Overpriced / Risky';
  // Within the band: classify around midpoint.
  const band = high - low;
  if (band <= 0) return 'Fair Deal';
  const dist = Math.abs(listPrice - mid) / band;
  return dist <= 0.2 ? 'Fair Deal' : 'Fair Deal';
}

function computePriceBand(subjectPrice) {
  const price = Number(subjectPrice);
  if (!Number.isFinite(price) || price <= 0) return null;
  // Keep comps reasonably close to subject price; widen later if needed.
  const min = Math.max(10000, Math.round(price * 0.6));
  const max = Math.round(price * 1.4);
  if (min >= max) return null;
  return { min, max };
}

function normalizeMarketType(value) {
  const v = normalizeLoose(value || '');
  if (!v) return null;
  if (v === 'residential' || v === 'resi' || v === 'home') return 'residential';
  if (v === 'commercial' || v === 'commercial property') return 'commercial';
  if (v === 'retail') return 'retail';
  if (v === 'land' || v === 'lot') return 'land';
  if (v === 'industrial') return 'industrial';
  if (v === 'multifamily' || v === 'multi family' || v === 'multi-family') return 'multifamily';
  return null;
}

function buildPropertyTypeClause({ marketType, subjectType } = {}) {
  const normalized = normalizeMarketType(marketType);
  const clauses = [];

  if (normalized === 'residential') {
    clauses.push(`PropertyType eq 'Residential'`);
    clauses.push(`PropertyType eq 'ResidentialIncome'`);
  } else if (normalized === 'commercial') {
    clauses.push(`PropertyType eq 'CommercialSale'`);
    clauses.push(`PropertyType eq 'CommercialLease'`);
    clauses.push(`PropertyType eq 'BusinessOpportunity'`);
    clauses.push(`PropertyType eq 'Commercial'`);
  } else if (normalized === 'retail') {
    clauses.push(`PropertyType eq 'CommercialSale'`);
    clauses.push(`PropertyType eq 'CommercialLease'`);
    clauses.push(`contains(tolower(PropertySubType), 'retail')`);
  } else if (normalized === 'land') {
    clauses.push(`PropertyType eq 'Land'`);
  } else if (normalized === 'industrial') {
    clauses.push(`PropertyType eq 'CommercialSale'`);
    clauses.push(`PropertyType eq 'CommercialLease'`);
    clauses.push(`contains(tolower(PropertySubType), 'industrial')`);
  } else if (normalized === 'multifamily') {
    clauses.push(`PropertyType eq 'ResidentialIncome'`);
    clauses.push(`contains(tolower(PropertySubType), 'multi')`);
  }

  if (clauses.length > 0) return `(${clauses.join(' or ')})`;

  const pt = String(subjectType || '').trim();
  if (!pt) return null;
  return `PropertyType eq '${odataEscape(pt)}'`;
}

/* ── Geo-radius helpers ─────────────────────────────────────────── */

function isValidCoord(v) {
  const n = Number(v);
  return Number.isFinite(n) && !(Math.abs(n) < 0.000001);
}

/** Haversine distance in miles between two lat/lng pairs. */
function haversineDistanceMiles(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Classify area density and return an initial search radius in miles.
 * Uses lot size as the primary signal; falls back to a moderate default.
 *
 *   Urban / inner-city  (lot ≤ 0.15 ac)  → 0.5 mi
 *   Suburban             (lot ≤ 0.5 ac)   → 1.5 mi
 *   Exurban              (lot ≤ 2 ac)     → 3 mi
 *   Rural                (lot > 2 ac)     → 7 mi
 *   Unknown lot size                      → 2 mi  (moderate default)
 */
function determineSearchRadius(subjectRaw) {
  const lot = Number(subjectRaw?.LotSizeAcres ?? 0);

  if (lot > 0 && lot <= 0.15) return { radiusMiles: 0.5, density: 'urban' };
  if (lot > 0.15 && lot <= 0.5) return { radiusMiles: 1.5, density: 'suburban' };
  if (lot > 0.5 && lot <= 2)   return { radiusMiles: 3, density: 'exurban' };
  if (lot > 2)                 return { radiusMiles: 7, density: 'rural' };

  // No lot-size data – use a moderate suburban-ish default.
  return { radiusMiles: 2, density: 'unknown' };
}

/**
 * Attach distance_miles to each comp and keep only those within an adaptive
 * radius of the subject. The radius starts at `initialRadius` and expands
 * through multipliers (1×, 1.5×, 2×, 3×, 5×) until we have at least
 * `minComps` results or exhaust all candidates.
 *
 * Returns { filtered, radiusUsed, expandedRadius, density }.
 * If the subject has no valid coordinates the comps pass through unchanged.
 */
function filterCompsByRadius(comps, subjectLat, subjectLng, initialRadius, density, minComps = 3) {
  if (!isValidCoord(subjectLat) || !isValidCoord(subjectLng)) {
    return { filtered: comps, radiusUsed: null, expandedRadius: false, density };
  }

  // Annotate every comp with its distance from the subject.
  const withDist = comps.map((c) => {
    if (!isValidCoord(c.lat) || !isValidCoord(c.lng)) return { ...c, distance_miles: null };
    return { ...c, distance_miles: Math.round(haversineDistanceMiles(subjectLat, subjectLng, c.lat, c.lng) * 100) / 100 };
  });

  // Sort closest first; comps without coords go to the end.
  withDist.sort((a, b) => {
    if (a.distance_miles == null && b.distance_miles == null) return 0;
    if (a.distance_miles == null) return 1;
    if (b.distance_miles == null) return -1;
    return a.distance_miles - b.distance_miles;
  });

  // Progressively widen the radius until we have enough comps.
  const multipliers = [1, 1.5, 2, 3, 5];
  for (const m of multipliers) {
    const r = initialRadius * m;
    const inRadius = withDist.filter((c) => c.distance_miles != null && c.distance_miles <= r);
    if (inRadius.length >= minComps) {
      return { filtered: inRadius, radiusUsed: r, expandedRadius: m > 1, density };
    }
  }

  // Not enough comps even at max expansion – return all (sorted by distance).
  return { filtered: withDist, radiusUsed: initialRadius * 5, expandedRadius: true, density };
}

/* ── End geo-radius helpers ─────────────────────────────────────── */

async function fetchClosedComps({ sinceDays, subjectRaw, priceBand, marketType, subjectDetails }) {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const ymd = since.toISOString().slice(0, 10);

  const city = odataEscape(String(subjectRaw?.City || '').toLowerCase());
  const county = odataEscape(String(subjectRaw?.CountyOrParish || ''));
  const beds = Number(subjectDetails?.beds ?? subjectRaw?.BedroomsTotal ?? 0);
  const bedsMin = beds ? Math.max(0, beds - 1) : null;
  const bedsMax = beds ? beds + 1 : null;
  const baths = Number(subjectDetails?.baths ?? subjectRaw?.BathroomsTotalInteger ?? 0);
  const bathsMin = baths ? Math.max(0, baths - 1) : null;
  const bathsMax = baths ? baths + 1 : null;
  const sqft = Number(subjectDetails?.sqft ?? subjectRaw?.LivingArea ?? 0);
  const sqftMin = sqft ? Math.max(300, Math.round(sqft * 0.65)) : null;
  const sqftMax = sqft ? Math.round(sqft * 1.35) : null;
  const garage = Number(subjectDetails?.garage ?? 0);

  const compFilters = [];
  compFilters.push(`StandardStatus eq 'Closed'`);
  compFilters.push(`CloseDate ge ${ymd}`);
  if (priceBand?.min) compFilters.push(`ClosePrice ge ${priceBand.min}`);
  if (priceBand?.max) compFilters.push(`ClosePrice le ${priceBand.max}`);
  if (county) compFilters.push(`CountyOrParish eq '${county}'`);
  if (city) compFilters.push(`contains(tolower(City), '${city}')`);
  if (typeof bedsMin === 'number') compFilters.push(`BedroomsTotal ge ${bedsMin}`);
  if (typeof bedsMax === 'number') compFilters.push(`BedroomsTotal le ${bedsMax}`);
  if (typeof bathsMin === 'number') compFilters.push(`BathroomsTotalInteger ge ${bathsMin}`);
  if (typeof bathsMax === 'number') compFilters.push(`BathroomsTotalInteger le ${bathsMax}`);
  if (typeof sqftMin === 'number') compFilters.push(`LivingArea ge ${sqftMin}`);
  if (typeof sqftMax === 'number') compFilters.push(`LivingArea le ${sqftMax}`);
  if (garage > 0) compFilters.push(`ParkingTotal ge ${Math.max(0, garage - 1)}`);

  const propertyTypeClause = buildPropertyTypeClause({ marketType, subjectType: subjectRaw?.PropertyType });
  if (propertyTypeClause) compFilters.push(propertyTypeClause);

  const compsRes = await fetchTrestleOData('odata/Property', {
    $top: '50',
    $select:
      'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,ParkingTotal,Latitude,Longitude,StandardStatus,ClosePrice,ListPrice,CloseDate',
    $expand: 'Media',
    $filter: compFilters.join(' and '),
    $orderby: 'CloseDate desc',
  });

  const compsRows = Array.isArray(compsRes?.json?.value) ? compsRes.json.value : [];
  const comps = compsRows.map(mapTrestlePropertyToListing).filter((l) => l.id);

  const closePrices = comps
    .map((c) => Number(c.price))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  return { comps, closePrices };
}

async function fetchClosedCompsForMarket({ sinceDays, cityToken, county, zip, priceBand, marketType, subjectDetails }) {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const ymd = since.toISOString().slice(0, 10);

  const compFilters = [];
  compFilters.push(`StandardStatus eq 'Closed'`);
  compFilters.push(`CloseDate ge ${ymd}`);
  compFilters.push(`ClosePrice ge 10000`);
  const propertyTypeClause = buildPropertyTypeClause({ marketType, subjectType: 'Residential' });
  if (propertyTypeClause) compFilters.push(propertyTypeClause);
  const beds = Number(subjectDetails?.beds ?? 0);
  const baths = Number(subjectDetails?.baths ?? 0);
  const sqft = Number(subjectDetails?.sqft ?? 0);
  const garage = Number(subjectDetails?.garage ?? 0);
  if (beds > 0) {
    compFilters.push(`BedroomsTotal ge ${Math.max(0, beds - 1)}`);
    compFilters.push(`BedroomsTotal le ${beds + 1}`);
  }
  if (baths > 0) {
    compFilters.push(`BathroomsTotalInteger ge ${Math.max(0, baths - 1)}`);
    compFilters.push(`BathroomsTotalInteger le ${baths + 1}`);
  }
  if (sqft > 0) {
    compFilters.push(`LivingArea ge ${Math.max(300, Math.round(sqft * 0.65))}`);
    compFilters.push(`LivingArea le ${Math.round(sqft * 1.35)}`);
  }
  if (garage > 0) {
    compFilters.push(`ParkingTotal ge ${Math.max(0, garage - 1)}`);
  }
  if (priceBand?.min) compFilters.push(`ClosePrice ge ${priceBand.min}`);
  if (priceBand?.max) compFilters.push(`ClosePrice le ${priceBand.max}`);

  if (county) {
    // Be forgiving: users type "Erie" but feeds may store "Erie County" or vary casing.
    compFilters.push(`contains(tolower(CountyOrParish), '${odataEscape(String(county).toLowerCase())}')`);
  }

  if (zip) {
    compFilters.push(`PostalCode eq '${odataEscape(zip)}'`);
  } else if (cityToken) {
    compFilters.push(`contains(tolower(City), '${odataEscape(cityToken)}')`);
  }

  const compsRes = await fetchTrestleOData('odata/Property', {
    $top: '50',
    $select:
      'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,ParkingTotal,Latitude,Longitude,StandardStatus,ClosePrice,ListPrice,CloseDate',
    $expand: 'Media',
    $filter: compFilters.join(' and '),
    $orderby: 'CloseDate desc',
  });

  const compsRows = Array.isArray(compsRes?.json?.value) ? compsRes.json.value : [];
  const comps = compsRows.map(mapTrestlePropertyToListing).filter((l) => l.id);

  const closePrices = comps
    .map((c) => Number(c.price))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  return { comps, closePrices };
}

export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ragBase = process.env.RAG_API_URL || 'http://127.0.0.1:3001';

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const address = body?.address;
    const subjectId = body?.subject_id;
    const county = body?.county;
    const zip = body?.zip;
    const subjectDetails = parseSubjectDetails(body?.subject_details);
    const marketTypeRaw = typeof body?.market_type === 'string' ? body.market_type.trim() : '';
    const requestedMarketType = normalizeMarketType(marketTypeRaw);

    if (subjectId && typeof subjectId !== 'string') {
      return res.status(400).json({ error: 'Invalid request: subject_id must be a string' });
    }
    if (county && typeof county !== 'string') {
      return res.status(400).json({ error: 'Invalid request: county must be a string' });
    }
    if (zip && typeof zip !== 'string') {
      return res.status(400).json({ error: 'Invalid request: zip must be a string' });
    }
    if (marketTypeRaw && !requestedMarketType) {
      return res.status(400).json({ error: 'Invalid request: market_type must be one of residential, commercial, retail, land, industrial, multifamily' });
    }
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Invalid request: address must be a string' });
    }

    const addr = address.trim();
    if (!addr) return res.status(400).json({ error: 'Invalid request: address required' });

    const includeDebug = wantsDebug(req);

    // If the UI provides county+zip, skip subject matching entirely (many owner addresses won't exist as a listing).
    // Use county/zip-based comps directly.
    const countyTrim = typeof county === 'string' ? county.trim() : '';
    const zipTrim = typeof zip === 'string' ? zip.trim() : '';

    if (countyTrim && zipTrim && !subjectId) {
      const startedAt = Date.now();
      const normalizedCounty = normalizeLoose(countyTrim).replace(/\bcounty\b/g, '').trim();
      const zip5 = (zipTrim.match(/\b\d{5}\b/) || [null])[0];
      const parsedAddr = parseAddressParts(addr);
      const { subjectRaw: subjectAnyStatus, parsed: parsedForMarket } = await lookupSubjectAnyStatusByAddress(addr, { countyHint: normalizedCounty });
      const cityToken = subjectAnyStatus
        ? normalizeLoose(String(subjectAnyStatus?.City || subjectAnyStatus?.PostalCity || '')).trim() || null
        : (parsedForMarket.mentionsCounty ? null : parsedForMarket.cityToken);

      // ZIP resilience:
      // - If we matched an MLS subject, prefer its ZIP (user might have typed the wrong ZIP).
      // - Otherwise, treat the provided ZIP as a hint and sanity-check it against county/city.
      const subjectZip5 = subjectAnyStatus
        ? (String(subjectAnyStatus?.PostalCode || '').match(/\b\d{5}\b/) || [null])[0]
        : null;

      let zipUsed = subjectZip5 || zip5;
      let zipIgnoredReason = null;

      if (!subjectZip5 && zipUsed && normalizedCounty) {
        try {
          const zipSanityFilters = [
            `PostalCode eq '${odataEscape(zipUsed)}'`,
            `contains(tolower(CountyOrParish), '${odataEscape(String(normalizedCounty).toLowerCase())}')`,
          ];
          if (cityToken) {
            zipSanityFilters.push(`contains(tolower(City), '${odataEscape(cityToken)}')`);
          }

          const sanityRes = await fetchTrestleOData('odata/Property', {
            $top: '1',
            $select: 'ListingKey',
            $filter: zipSanityFilters.join(' and '),
          });

          const sanityRows = Array.isArray(sanityRes?.json?.value) ? sanityRes.json.value : [];
          if (!sanityRows.length) {
            zipIgnoredReason = cityToken
              ? 'zip_not_in_county_city'
              : 'zip_not_in_county';
            zipUsed = null;
          }
        } catch {
          // If sanity-check fails, keep zipUsed; we still have relaxation fallbacks below.
          zipIgnoredReason = null;
        }
      }

      logPricing('market pricing request:', { county: normalizedCounty, zip: zip5 || zipTrim, address: addr, cityToken });

      const relaxation = [];

      let subject = {
        id: '',
        // Use a geocode-friendly street-only address; county/state/zip are separate fields.
        address: parsedAddr.streetRaw || addr,
        city: cityToken || '',
        county: countyTrim,
        state: 'PA',
        zip: zipUsed || zipTrim,
        price: 0,
        beds: 0,
        baths: 0,
        property_type: 'Residential',
        status: 'Unknown',
        sqft: 0,
        parking_total: 0,
        lat: null,
        lng: null,
      };

      // Prefer subject-based comps if we can find any MLS record (any status) for the address.
      // This allows us to use beds/baths/sqft/type to tighten comps and compute a $/sqft-adjusted estimate.
      let comps = [];
      let closePrices = [];
      let expanded = false;
      let searchWindowLabel = '6 months';

      if (subjectAnyStatus) {
        subject = applySubjectDetails(mapTrestlePropertyToListing(subjectAnyStatus), subjectDetails);
        const priceBand = computePriceBand(subjectAnyStatus?.ListPrice ?? subjectAnyStatus?.ClosePrice);

        // Progressive time-window expansion: 6mo → 12mo → 24mo → 36mo → 60mo (5 yrs).
        // Recent sales are weighted most heavily in the final price calculation.
        const timeSteps = [
          { days: 183, label: '6 months' },
          { days: 365, label: '12 months' },
          { days: 730, label: '2 years' },
          { days: 1095, label: '3 years' },
          { days: 1825, label: '5 years' },
        ];

        for (const step of timeSteps) {
          const result = await fetchClosedComps({ sinceDays: step.days, subjectRaw: subjectAnyStatus, priceBand, marketType: requestedMarketType, subjectDetails });
          comps = result.comps;
          closePrices = result.closePrices;
          searchWindowLabel = step.label;
          if (closePrices.length >= 3) break;
          expanded = true;
        }

        // If still thin, try without price band across 5 years.
        if (closePrices.length < 3 && priceBand) {
          const wide = await fetchClosedComps({ sinceDays: 1825, subjectRaw: subjectAnyStatus, marketType: requestedMarketType, subjectDetails });
          comps = wide.comps;
          closePrices = wide.closePrices;
          expanded = true;
          searchWindowLabel = '5 years';
          relaxation.push('Relaxed pricing comps: widened price band to find more comps.');
        }

        // If subject-based comps are still too thin, fall back to market comps.
        if (closePrices.length < 3) {
          relaxation.push('Relaxed pricing comps: subject-based comps were thin; using area comps instead.');
        }
      }

      if (closePrices.length < 3) {
        const priceBand = computePriceBand(subjectAnyStatus?.ListPrice ?? subjectAnyStatus?.ClosePrice);
        // 1) Strict: county + zip
        if (zipIgnoredReason) {
          relaxation.push('ZIP code looks inconsistent with the selected county/city; ignoring ZIP to avoid pulling the wrong comps.');
        }

        // Progressive time-window expansion for market comps.
        const marketTimeSteps = [
          { days: 183, label: '6 months' },
          { days: 365, label: '12 months' },
          { days: 730, label: '2 years' },
          { days: 1095, label: '3 years' },
          { days: 1825, label: '5 years' },
        ];

        expanded = false;
        for (const step of marketTimeSteps) {
          const result = await fetchClosedCompsForMarket({ sinceDays: step.days, county: normalizedCounty, zip: zipUsed, priceBand, marketType: requestedMarketType, subjectDetails });
          comps = result.comps;
          closePrices = result.closePrices;
          searchWindowLabel = step.label;
          if (closePrices.length >= 3) break;
          expanded = true;
        }

        if (closePrices.length < 3 && priceBand) {
          const wide = await fetchClosedCompsForMarket({ sinceDays: 1825, county: normalizedCounty, zip: zipUsed, marketType: requestedMarketType, subjectDetails });
          comps = wide.comps;
          closePrices = wide.closePrices;
          expanded = true;
          searchWindowLabel = '5 years';
          relaxation.push('Relaxed pricing comps: widened price band to find more comps.');
        }

        // 2) Relax: drop zip, use county + city (if we have it)
        if (closePrices.length < 3 && cityToken) {
          relaxation.push('Relaxed pricing comps: dropped ZIP; using county + city.');
          const countyCity = await fetchClosedCompsForMarket({ sinceDays: 1825, county: normalizedCounty, zip: null, cityToken, priceBand, marketType: requestedMarketType, subjectDetails });
          comps = countyCity.comps;
          closePrices = countyCity.closePrices;
          expanded = true;
          searchWindowLabel = '5 years';
        }

        // 3) Relax: county only
        if (closePrices.length < 3) {
          relaxation.push('Relaxed pricing comps: using county-wide comps.');
          const countyOnly = await fetchClosedCompsForMarket({ sinceDays: 1825, county: normalizedCounty, zip: null, cityToken: null, priceBand, marketType: requestedMarketType, subjectDetails });
          comps = countyOnly.comps;
          closePrices = countyOnly.closePrices;
          expanded = true;
          searchWindowLabel = '5 years';
        }
      }

      // If the user entered street+county+zip (no city), infer a likely city from comps.
      // This makes client-side geocoding for the "Your home" marker much more reliable.
      if (!subjectAnyStatus && (!subject.city || !String(subject.city).trim())) {
        const inferred = inferCityFromComps(comps);
        if (inferred) subject.city = inferred;
      }

      // ── Radius filtering ───────────────────────────────────────────
      const subjectCoords = { lat: Number(subject?.lat), lng: Number(subject?.lng) };
      const { radiusMiles: initialRadius, density: areaDensity } = determineSearchRadius(subjectAnyStatus);
      const radiusResult = filterCompsByRadius(comps, subjectCoords.lat, subjectCoords.lng, initialRadius, areaDensity);
      comps = radiusResult.filtered;
      // Recompute closePrices from radius-filtered comps.
      closePrices = comps
        .map((c) => Number(c.price))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b);
      if (radiusResult.expandedRadius) {
        relaxation.push('Expanded proximity search to find enough comps.');
      }
      // ── End radius filtering ───────────────────────────────────────

      // Use recency-weighted percentiles so recent comps count more than older ones.
      const wStats = weightedPriceStats(comps);
      const p25 = wStats.p25;
      const p50 = wStats.p50;
      const p75 = wStats.p75;

      // If we have a subject sqft, compute an adjusted estimate using $/sqft so the midpoint is tailored to the home size.
      const adjusted = computeAdjustedRangeFromComps({ comps, subjectSqft: subject?.sqft });

      const low = adjusted?.low ?? (Number.isFinite(p25) ? Math.round(p25) : null);
      const mid = adjusted?.mid ?? (Number.isFinite(p50) ? Math.round(p50) : null);
      const high = adjusted?.high ?? (Number.isFinite(p75) ? Math.round(p75) : null);

      // CMA playbook chunks (5 s timeout so a down RAG service doesn't block the response)
      let cmaChunks = [];
      try {
        const cmaAc = new AbortController();
        const cmaTimer = setTimeout(() => cmaAc.abort(), 5000);
        try {
          const cmaRes = await fetch(`${ragBase}/cma/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `CMA methodology for selecting comps, deriving a price range, and explaining adjustments.`,
              top_k: 6,
              kind: 'playbook',
            }),
            signal: cmaAc.signal,
          });
          const cmaJson = await cmaRes.json().catch(() => null);
          cmaChunks = Array.isArray(cmaJson?.chunks) ? cmaJson.chunks : [];
        } finally {
          clearTimeout(cmaTimer);
        }
      } catch {
        cmaChunks = [];
      }

      const reasoning = [
        subjectAnyStatus
          ? `Subject lookup: ${subject.address}${subject.city ? `, ${subject.city}` : ''}${subject.zip ? ` ${subject.zip}` : ''} • ${subject.property_type || 'Residential'} • ${subject.beds || 0} bd / ${subject.baths || 0} ba • ${subject.sqft ? `${Math.round(subject.sqft).toLocaleString()} sqft` : 'sqft unknown'} (status: ${subject.status || 'Unknown'}).`
          : `Subject lookup: no MLS record found for this address; using area comps.`,
        `Market type: ${requestedMarketType || 'residential (default)'}.`,
        `Using comps in PA near: ${normalizedCounty || countyTrim} County${zip5 ? `, ${zip5}` : ''}.`,
        expanded
          ? `Pulled ${comps.length} closed comps from the last ${searchWindowLabel} (expanded to find enough comps). Recent sales weighted more heavily.`
          : `Pulled ${comps.length} closed comps from the last ${searchWindowLabel}. Recent sales weighted more heavily.`,
      ];

      {
        const subjectDetailsLine = formatSubjectDetailsLine(subjectDetails);
        if (subjectDetailsLine) reasoning.push(subjectDetailsLine);
      }

      if (relaxation.length) {
        reasoning.push(...relaxation.slice(0, 3));
      }

      if (mid && low && high) {
        reasoning.push(
          adjusted
            ? `Adjusted value estimate using $/sqft (low/mid/high): $${low.toLocaleString()} / $${mid.toLocaleString()} / $${high.toLocaleString()}`
            : `Price range (low/mid/high from comps): $${low.toLocaleString()} / $${mid.toLocaleString()} / $${high.toLocaleString()}`
        );
      }

      const selectedComps = rankAndLimitCmaComps(comps, {
        subjectPrice: subject?.price,
        fallbackPrice: mid,
        radiusMiles: radiusResult.radiusUsed,
        subjectDetails,
      });
      reasoning.push(`Showing top ${selectedComps.length} comps ranked by closest price and proximity.`);

      if (cmaChunks.length > 0) {
        reasoning.push('CMA playbook guidance (methodology excerpts):');
        for (const c of cmaChunks.slice(0, 3)) {
          const excerpt = String(c?.content || '').replace(/\s+/g, ' ').trim().slice(0, 220);
          if (excerpt) reasoning.push(`- ${excerpt}${excerpt.length >= 220 ? '…' : ''}`);
        }
      } else {
        reasoning.push('No CMA playbook guidance found yet (admin needs to ingest the CMA playbook).');
      }

      const disclaimer = 'This is an estimate based on comparable sales, not a formal appraisal.';
      const answer = low && mid && high
        ? `Estimated value ~$${mid.toLocaleString()} (range $${low.toLocaleString()}–$${high.toLocaleString()}). ${disclaimer}`
        : `Found ${comps.length} comps, but couldn’t compute a stable range (missing/invalid ClosePrice). ${disclaimer}`;

      const durationMs = Date.now() - startedAt;
      logPricing('done (county+zip):', { comps: comps.length, usablePrices: closePrices.length, expanded, durationMs });

      const debug = includeDebug
        ? {
          path: 'county+zip',
          county: normalizedCounty || countyTrim,
          zip_input: zip5 || zipTrim,
          zip_used: zipUsed,
          zip_ignored_reason: zipIgnoredReason,
          duration_ms: durationMs,
          subject_matched: Boolean(subjectAnyStatus),
          used_market_fallback: !subjectAnyStatus,
          expanded_window: expanded,
          comps: comps.length,
          usable_prices: closePrices.length,
          adjusted_method: adjusted ? 'ppsf' : 'closeprice',
          radius_miles: radiusResult.radiusUsed,
          radius_expanded: radiusResult.expandedRadius,
          area_density: areaDensity,
          market_type: requestedMarketType || 'residential',
        }
        : undefined;

      return res.json({
        answer,
        reasoning,
        subject,
        price_range: low && mid && high ? { low, mid, high } : null,
        comp_stats: { p25, p50, p75, comps: selectedComps.length, candidate_comps: comps.length },
        market_type: requestedMarketType || 'residential',
        radius: { miles: radiusResult.radiusUsed, density: areaDensity, expanded: radiusResult.expandedRadius },
        deal_quality: null,
        listings: selectedComps,
        ...(debug ? { debug } : {}),
      });
    }

    // 1) Find a likely subject property record.
    // NOTE: Matching the full user-entered address against UnparsedAddress rarely works (commas/state/formatting differ).
    // We parse out street number + street name token, and optionally city/zip to narrow.
    const parsed = parseAddressParts(addr);
    const startedAt = Date.now();
    const clauses = [];

    if (parsed.streetNumber && parsed.streetNameToken) {
      const c = [
        `StreetNumber eq '${odataEscape(parsed.streetNumber)}'`,
        // UnparsedAddress is the most reliable string field across feeds.
        `contains(tolower(UnparsedAddress), '${odataEscape(`${parsed.streetNumber} ${parsed.streetNameToken}`)}')`,
      ];
      // If we have a ZIP, City is often unnecessary (and can be wrong for county-style inputs).
      if (parsed.cityToken && !parsed.zip) c.push(`contains(tolower(City), '${odataEscape(parsed.cityToken)}')`);
      if (parsed.zip) c.push(`PostalCode eq '${odataEscape(parsed.zip)}'`);
      clauses.push(`(${c.join(' and ')})`);
    }

    if (parsed.streetQuery) {
      clauses.push(`contains(tolower(UnparsedAddress), '${odataEscape(parsed.streetQuery)}')`);
    }

    if (!clauses.length) {
      // Last-resort: try the whole normalized string.
      clauses.push(`contains(tolower(UnparsedAddress), '${odataEscape(normalizeLoose(addr))}')`);
    }

    const subjectFilter = `StandardStatus ne 'Expired' and (${clauses.join(' or ')})`;

    logPricing('subject match:', { addr: parsed.raw, street: parsed.streetQuery, city: parsed.cityToken, zip: parsed.zip });
    logPricing('subjectFilter:', subjectFilter);

    const subjectSelect =
      'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,ParkingTotal,LotSizeAcres,Latitude,Longitude,StandardStatus,ClosePrice,ListPrice,CloseDate,MLSAreaMajor,ModificationTimestamp';

    let subjectRes;
    if (subjectId && subjectId.trim()) {
      const byIdFilter = `ListingKey eq '${odataEscape(subjectId.trim())}'`;
      logPricing('subject lookup by id:', subjectId.trim());
      subjectRes = await fetchTrestleOData('odata/Property', {
        $top: '1',
        $select: subjectSelect,
        $expand: 'Media',
        $filter: byIdFilter,
      });
    } else {
      subjectRes = await fetchTrestleOData('odata/Property', {
        $top: '3',
        $select: subjectSelect,
        $expand: 'Media',
        $filter: subjectFilter,
        $orderby: 'ModificationTimestamp desc',
      });
    }

    const subjectRows = Array.isArray(subjectRes?.json?.value) ? subjectRes.json.value : [];
    const subjectRaw = subjectRows[0] || null;

    const debug = includeDebug
      ? { attempted_subject_filter: subjectFilter, parsed_address: parsed }
      : undefined;

    let subject;
    let comps = [];
    let closePrices = [];
    let expanded = false;
    let usedMarketFallback = false;
    let searchWindowLabel2 = '6 months';

    if (subjectRaw) {
      subject = applySubjectDetails(mapTrestlePropertyToListing(subjectRaw), subjectDetails);
      const priceBand = computePriceBand(subjectRaw?.ListPrice ?? subjectRaw?.ClosePrice);

      // 2) Pull closed comps near the subject.
      // Progressive time-window expansion: 6mo → 12mo → 24mo → 36mo → 60mo (5 yrs).
      // Recent sales are weighted most heavily in the final price calculation.
      const timeSteps = [
        { days: 183, label: '6 months' },
        { days: 365, label: '12 months' },
        { days: 730, label: '2 years' },
        { days: 1095, label: '3 years' },
        { days: 1825, label: '5 years' },
      ];

      for (const step of timeSteps) {
        const result = await fetchClosedComps({ sinceDays: step.days, subjectRaw, priceBand, marketType: requestedMarketType, subjectDetails });
        comps = result.comps;
        closePrices = result.closePrices;
        searchWindowLabel2 = step.label;
        if (closePrices.length >= 3) break;
        expanded = true;
      }

      // If still thin, try without price band across 5 years.
      if (closePrices.length < 3 && priceBand) {
        const wide = await fetchClosedComps({ sinceDays: 1825, subjectRaw, marketType: requestedMarketType, subjectDetails });
        comps = wide.comps;
        closePrices = wide.closePrices;
        expanded = true;
        searchWindowLabel2 = '5 years';
      }
    } else {
      // The user's home often isn't an MLS listing. Don't fail; instead, use city/zip-based comps.
      const cityToken = parsed.cityToken;
      const zip = parsed.zip;

      if (!cityToken && !zip) {
        return res.status(400).json({
          error: 'Invalid request: include a city or zip so we can pull comps (e.g., "123 Main St, Erie, PA 16501").',
          ...(debug ? { debug } : {}),
        });
      }

      usedMarketFallback = true;
      subject = {
        id: '',
        address: parsed.raw,
        city: cityToken || '',
        county: '',
        state: 'PA',
        zip: zip || '',
        price: 0,
        beds: 0,
        baths: 0,
        property_type: 'Residential',
        status: 'Unknown',
        sqft: 0,
        parking_total: 0,
        lat: null,
        lng: null,
      };
      subject = applySubjectDetails(subject, subjectDetails);

      // Progressive time-window expansion for market comps.
      const marketTimeSteps = [
        { days: 183, label: '6 months' },
        { days: 365, label: '12 months' },
        { days: 730, label: '2 years' },
        { days: 1095, label: '3 years' },
        { days: 1825, label: '5 years' },
      ];

      for (const step of marketTimeSteps) {
        const result = await fetchClosedCompsForMarket({ sinceDays: step.days, cityToken, county: '', zip, marketType: requestedMarketType, subjectDetails });
        comps = result.comps;
        closePrices = result.closePrices;
        searchWindowLabel2 = step.label;
        if (closePrices.length >= 3) break;
        expanded = true;
      }
    }

    // ── Radius filtering ───────────────────────────────────────────
    const subjectCoords2 = { lat: Number(subject?.lat), lng: Number(subject?.lng) };
    const { radiusMiles: initialRadius2, density: areaDensity2 } = determineSearchRadius(subjectRaw);
    const radiusResult2 = filterCompsByRadius(comps, subjectCoords2.lat, subjectCoords2.lng, initialRadius2, areaDensity2);
    comps = radiusResult2.filtered;
    // Recompute closePrices from radius-filtered comps.
    closePrices = comps
      .map((c) => Number(c.price))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
    // ── End radius filtering ───────────────────────────────────────

    // Use recency-weighted percentiles so recent comps count more than older ones.
    const wStats2 = weightedPriceStats(comps);
    const p25 = wStats2.p25;
    const p50 = wStats2.p50;
    const p75 = wStats2.p75;

    const suggested = p50 ? Math.round(p50) : null;

    // 3) Retrieve relevant CMA *playbook* chunks (5 s timeout so a down RAG service doesn't block)
    let cmaChunks = [];
    try {
      const cmaAc = new AbortController();
      const cmaTimer = setTimeout(() => cmaAc.abort(), 5000);
      try {
        const cmaRes = await fetch(`${ragBase}/cma/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `CMA methodology for selecting comps, deriving a price range, and explaining adjustments.`,
            top_k: 6,
            kind: 'playbook',
          }),
          signal: cmaAc.signal,
        });
        const cmaJson = await cmaRes.json().catch(() => null);
        cmaChunks = Array.isArray(cmaJson?.chunks) ? cmaJson.chunks : [];
      } finally {
        clearTimeout(cmaTimer);
      }
    } catch {
      cmaChunks = [];
    }

    const reasoning = [
      subjectRaw
        ? `Matched subject property: ${subject.address}${subject.city ? `, ${subject.city}` : ''}`
        : `No exact MLS record found for this address; using market-level comps for ${subject.city || subject.zip || 'the provided area'}.`,
      `Market type: ${requestedMarketType || 'residential (default)'}.`,
      expanded
        ? `Pulled ${comps.length} closed comps from the last ${searchWindowLabel2} (expanded to find enough comps). Recent sales weighted more heavily.`
        : `Pulled ${comps.length} closed comps from the last ${searchWindowLabel2}. Recent sales weighted more heavily.`,
    ];

    {
      const subjectDetailsLine = formatSubjectDetailsLine(subjectDetails);
      if (subjectDetailsLine) reasoning.push(subjectDetailsLine);
    }

    const low = Number.isFinite(p25) ? Math.round(p25) : null;
    const mid = Number.isFinite(p50) ? Math.round(p50) : null;
    const high = Number.isFinite(p75) ? Math.round(p75) : null;

    if (mid && low && high) {
      reasoning.push(`Price range (low/mid/high from comps): $${low.toLocaleString()} / $${mid.toLocaleString()} / $${high.toLocaleString()}`);
    }

    const selectedComps = rankAndLimitCmaComps(comps, {
      subjectPrice: subject?.price,
      fallbackPrice: mid,
      radiusMiles: radiusResult2.radiusUsed,
      subjectDetails,
    });
    reasoning.push(`Showing top ${selectedComps.length} comps ranked by closest price and proximity.`);

    if (cmaChunks.length > 0) {
      reasoning.push('CMA playbook guidance (methodology excerpts):');
      for (const c of cmaChunks.slice(0, 3)) {
        const excerpt = String(c?.content || '').replace(/\s+/g, ' ').trim().slice(0, 220);
        if (excerpt) reasoning.push(`- ${excerpt}${excerpt.length >= 220 ? '…' : ''}`);
      }
    } else {
      reasoning.push('No CMA playbook guidance found yet (admin needs to ingest the CMA playbook).');
    }

    // Required: never present this as an appraisal, and never return a single exact value.
    const disclaimer = 'This is an estimate based on comparable sales, not a formal appraisal.';

    let answer;
    if (low && mid && high) {
      answer = `Estimated price range: $${low.toLocaleString()}–$${high.toLocaleString()} (market midpoint ~$${mid.toLocaleString()}). ${disclaimer}`;
    } else {
      answer = `Found ${comps.length} comps, but couldn’t compute a stable range (missing/invalid ClosePrice). ${disclaimer}`;
    }

    // Deal-quality classification (only if the subject is actively listed and has a list price).
    const subjectListPrice = Number(subjectRaw?.ListPrice ?? 0);
    const verdict = (subjectRaw?.StandardStatus === 'Active' && Number.isFinite(subjectListPrice) && subjectListPrice > 0 && low && mid && high)
      ? classifyPrice(subjectListPrice, low, high, mid)
      : null;

    if (verdict) {
      reasoning.push(`Deal quality vs current list price ($${Math.round(subjectListPrice).toLocaleString()}): ${verdict}`);
    }

    const durationMs = Date.now() - startedAt;
    logPricing('done:', {
      subjectMatched: Boolean(subjectRaw),
      usedMarketFallback,
      comps: comps.length,
      usablePrices: closePrices.length,
      expanded,
      durationMs,
    });

    return res.json({
      answer,
      reasoning,
      subject,
      price_range: low && mid && high ? { low, mid, high } : null,
      comp_stats: { p25, p50, p75, comps: selectedComps.length, candidate_comps: comps.length },
      market_type: requestedMarketType || 'residential',
      radius: { miles: radiusResult2.radiusUsed, density: areaDensity2, expanded: radiusResult2.expandedRadius },
      deal_quality: verdict,
      listings: selectedComps,
      ...(debug
        ? {
          debug: {
            ...debug,
            path: subjectRaw ? 'subject+comps' : 'market-fallback',
            subject_matched: Boolean(subjectRaw),
            used_market_fallback: usedMarketFallback,
            expanded_window: expanded,
            comps: comps.length,
            usable_prices: closePrices.length,
            duration_ms: durationMs,
            radius_miles: radiusResult2.radiusUsed,
            radius_expanded: radiusResult2.expandedRadius,
            area_density: areaDensity2,
            market_type: requestedMarketType || 'residential',
          },
        }
        : {}),
    });
  } catch (e) {
    return res.status(500).json({ error: 'Pricing failed'});
  }
}

);

export const runtime = 'edge';

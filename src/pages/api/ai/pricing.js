import { fetchTrestleOData } from '../../../lib/trestleServer.js';

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
  let primaryMedia = null;
  if (mediaItems.length) {
    const preferred = mediaItems.find(
      (m) => m?.PreferredPhotoYN === true || m?.PreferredPhotoYN === 'Y' || m?.PreferredPhotoYN === 'Yes'
    );
    primaryMedia = preferred || mediaItems[0];
  }

  const mediaUrls = mediaItems
    .slice()
    .sort((a, b) => {
      if (a?.Order !== undefined && b?.Order !== undefined) return a.Order - b.Order;
      return 0;
    })
    .map((m) => m?.MediaURL)
    .filter((url) => url && String(url).startsWith('http'));

  const imageUrl = primaryMedia?.MediaURL || mediaUrls[0] || '/fallback-property.jpg';
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
    property_type: String(p?.PropertyType || ''),
    status: String(p?.StandardStatus || ''),
    sqft: Number(p?.LivingArea ?? 0),
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
    'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,Latitude,Longitude,StandardStatus,ClosePrice,ListPrice,CloseDate,YearBuilt,LotSizeAcres,MLSAreaMajor,ModificationTimestamp';

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

  const ppsf = comps
    .map((c) => {
      const price = Number(c?.price);
      const sqft = Number(c?.sqft);
      if (!Number.isFinite(price) || price <= 0) return null;
      if (!Number.isFinite(sqft) || sqft <= 0) return null;
      return price / sqft;
    })
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  if (ppsf.length < 3) return null;

  const p25 = percentile(ppsf, 0.25);
  const p50 = percentile(ppsf, 0.5);
  const p75 = percentile(ppsf, 0.75);

  const low = Number.isFinite(p25) ? Math.round(p25 * subjectArea) : null;
  const mid = Number.isFinite(p50) ? Math.round(p50 * subjectArea) : null;
  const high = Number.isFinite(p75) ? Math.round(p75 * subjectArea) : null;

  if (!low || !mid || !high) return null;

  return {
    low,
    mid,
    high,
    ppsf_stats: { p25, p50, p75, n: ppsf.length },
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

async function fetchClosedComps({ sinceDays, subjectRaw, priceBand }) {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const ymd = since.toISOString().slice(0, 10);

  const city = odataEscape(String(subjectRaw?.City || '').toLowerCase());
  const county = odataEscape(String(subjectRaw?.CountyOrParish || ''));
  const beds = Number(subjectRaw?.BedroomsTotal ?? 0);
  const bedsMin = beds ? Math.max(0, beds - 1) : null;
  const bedsMax = beds ? beds + 1 : null;

  const compFilters = [];
  compFilters.push(`StandardStatus eq 'Closed'`);
  compFilters.push(`CloseDate ge ${ymd}`);
  if (priceBand?.min) compFilters.push(`ClosePrice ge ${priceBand.min}`);
  if (priceBand?.max) compFilters.push(`ClosePrice le ${priceBand.max}`);
  if (county) compFilters.push(`CountyOrParish eq '${county}'`);
  if (city) compFilters.push(`contains(tolower(City), '${city}')`);
  if (typeof bedsMin === 'number') compFilters.push(`BedroomsTotal ge ${bedsMin}`);
  if (typeof bedsMax === 'number') compFilters.push(`BedroomsTotal le ${bedsMax}`);

  // Prefer same property type when possible.
  const pt = String(subjectRaw?.PropertyType || '').trim();
  if (pt) compFilters.push(`PropertyType eq '${odataEscape(pt)}'`);

  const compsRes = await fetchTrestleOData('odata/Property', {
    $top: '25',
    $select:
      'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,Latitude,Longitude,StandardStatus,ClosePrice,ListPrice,CloseDate',
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

async function fetchClosedCompsForMarket({ sinceDays, cityToken, county, zip, priceBand }) {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const ymd = since.toISOString().slice(0, 10);

  const compFilters = [];
  compFilters.push(`StandardStatus eq 'Closed'`);
  compFilters.push(`CloseDate ge ${ymd}`);
  compFilters.push(`ClosePrice ge 10000`);
  compFilters.push(`PropertyType eq 'Residential'`);
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
    $top: '25',
    $select:
      'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,Latitude,Longitude,StandardStatus,ClosePrice,ListPrice,CloseDate',
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

export default async function handler(req, res) {
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

    if (subjectId && typeof subjectId !== 'string') {
      return res.status(400).json({ error: 'Invalid request: subject_id must be a string' });
    }
    if (county && typeof county !== 'string') {
      return res.status(400).json({ error: 'Invalid request: county must be a string' });
    }
    if (zip && typeof zip !== 'string') {
      return res.status(400).json({ error: 'Invalid request: zip must be a string' });
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
        lat: null,
        lng: null,
      };

      // Prefer subject-based comps if we can find any MLS record (any status) for the address.
      // This allows us to use beds/baths/sqft/type to tighten comps and compute a $/sqft-adjusted estimate.
      let comps = [];
      let closePrices = [];
      let expanded = false;

      if (subjectAnyStatus) {
        subject = mapTrestlePropertyToListing(subjectAnyStatus);
        const priceBand = computePriceBand(subjectAnyStatus?.ListPrice ?? subjectAnyStatus?.ClosePrice);

        // Attempt 6mo -> 12mo using subject-based filters.
        const sixMonth = await fetchClosedComps({ sinceDays: 183, subjectRaw: subjectAnyStatus, priceBand });
        comps = sixMonth.comps;
        closePrices = sixMonth.closePrices;

        if (closePrices.length < 3) {
          const twelveMonth = await fetchClosedComps({ sinceDays: 365, subjectRaw: subjectAnyStatus, priceBand });
          comps = twelveMonth.comps;
          closePrices = twelveMonth.closePrices;
          expanded = true;
        }

        if (closePrices.length < 3 && priceBand) {
          const twelveMonth = await fetchClosedComps({ sinceDays: 365, subjectRaw: subjectAnyStatus });
          comps = twelveMonth.comps;
          closePrices = twelveMonth.closePrices;
          expanded = true;
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

        const sixMonth = await fetchClosedCompsForMarket({ sinceDays: 183, county: normalizedCounty, zip: zipUsed, priceBand });
        comps = sixMonth.comps;
        closePrices = sixMonth.closePrices;
        expanded = false;

        if (closePrices.length < 3) {
          const twelveMonth = await fetchClosedCompsForMarket({ sinceDays: 365, county: normalizedCounty, zip: zipUsed, priceBand });
          comps = twelveMonth.comps;
          closePrices = twelveMonth.closePrices;
          expanded = true;
        }

        if (closePrices.length < 3 && priceBand) {
          const twelveMonth = await fetchClosedCompsForMarket({ sinceDays: 365, county: normalizedCounty, zip: zipUsed });
          comps = twelveMonth.comps;
          closePrices = twelveMonth.closePrices;
          expanded = true;
          relaxation.push('Relaxed pricing comps: widened price band to find more comps.');
        }

        // 2) Relax: drop zip, use county + city (if we have it)
        if (closePrices.length < 3 && cityToken) {
          relaxation.push('Relaxed pricing comps: dropped ZIP; using county + city.');
          const twelveMonth = await fetchClosedCompsForMarket({ sinceDays: 365, county: normalizedCounty, zip: null, cityToken, priceBand });
          comps = twelveMonth.comps;
          closePrices = twelveMonth.closePrices;
          expanded = true;
        }

        // 3) Relax: county only
        if (closePrices.length < 3) {
          relaxation.push('Relaxed pricing comps: using county-wide comps.');
          const twelveMonth = await fetchClosedCompsForMarket({ sinceDays: 365, county: normalizedCounty, zip: null, cityToken: null, priceBand });
          comps = twelveMonth.comps;
          closePrices = twelveMonth.closePrices;
          expanded = true;
        }
      }

      // If the user entered street+county+zip (no city), infer a likely city from comps.
      // This makes client-side geocoding for the "Your home" marker much more reliable.
      if (!subjectAnyStatus && (!subject.city || !String(subject.city).trim())) {
        const inferred = inferCityFromComps(comps);
        if (inferred) subject.city = inferred;
      }

      const p25 = percentile(closePrices, 0.25);
      const p50 = percentile(closePrices, 0.5);
      const p75 = percentile(closePrices, 0.75);

      // If we have a subject sqft, compute an adjusted estimate using $/sqft so the midpoint is tailored to the home size.
      const adjusted = computeAdjustedRangeFromComps({ comps, subjectSqft: subject?.sqft });

      const low = adjusted?.low ?? (Number.isFinite(p25) ? Math.round(p25) : null);
      const mid = adjusted?.mid ?? (Number.isFinite(p50) ? Math.round(p50) : null);
      const high = adjusted?.high ?? (Number.isFinite(p75) ? Math.round(p75) : null);

      // CMA playbook chunks
      let cmaChunks = [];
      try {
        const cmaRes = await fetch(`${ragBase}/cma/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `CMA methodology for selecting comps, deriving a price range, and explaining adjustments.`,
            top_k: 6,
            kind: 'playbook',
          }),
        });
        const cmaJson = await cmaRes.json().catch(() => null);
        cmaChunks = Array.isArray(cmaJson?.chunks) ? cmaJson.chunks : [];
      } catch {
        cmaChunks = [];
      }

      const reasoning = [
        subjectAnyStatus
          ? `Subject lookup: ${subject.address}${subject.city ? `, ${subject.city}` : ''}${subject.zip ? ` ${subject.zip}` : ''} • ${subject.property_type || 'Residential'} • ${subject.beds || 0} bd / ${subject.baths || 0} ba • ${subject.sqft ? `${Math.round(subject.sqft).toLocaleString()} sqft` : 'sqft unknown'} (status: ${subject.status || 'Unknown'}).`
          : `Subject lookup: no MLS record found for this address; using area comps.`,
        `Using comps in PA near: ${normalizedCounty || countyTrim} County${zip5 ? `, ${zip5}` : ''}.`,
        expanded
          ? `Pulled ${comps.length} closed comps from the last 12 months (expanded from 6 months due to low comp count).`
          : `Pulled ${comps.length} closed comps from the last 6 months.`,
      ];

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
        }
        : undefined;

      return res.json({
        answer,
        reasoning,
        subject,
        price_range: low && mid && high ? { low, mid, high } : null,
        comp_stats: { p25, p50, p75, comps: comps.length },
        deal_quality: null,
        listings: comps,
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
      'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,Latitude,Longitude,StandardStatus,ClosePrice,ListPrice,CloseDate,MLSAreaMajor,ModificationTimestamp';

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

    if (subjectRaw) {
      subject = mapTrestlePropertyToListing(subjectRaw);
      const priceBand = computePriceBand(subjectRaw?.ListPrice ?? subjectRaw?.ClosePrice);

      // 2) Pull closed comps near the subject.
      // Playbook default: last 6 months; extend to 12 months if < 3 usable comps.
      const sixMonth = await fetchClosedComps({ sinceDays: 183, subjectRaw, priceBand });
      comps = sixMonth.comps;
      closePrices = sixMonth.closePrices;

      if (closePrices.length < 3) {
        const twelveMonth = await fetchClosedComps({ sinceDays: 365, subjectRaw, priceBand });
        comps = twelveMonth.comps;
        closePrices = twelveMonth.closePrices;
        expanded = true;
      }

      if (closePrices.length < 3 && priceBand) {
        const twelveMonth = await fetchClosedComps({ sinceDays: 365, subjectRaw });
        comps = twelveMonth.comps;
        closePrices = twelveMonth.closePrices;
        expanded = true;
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
        lat: null,
        lng: null,
      };

      const sixMonth = await fetchClosedCompsForMarket({ sinceDays: 183, cityToken, county: '', zip });
      comps = sixMonth.comps;
      closePrices = sixMonth.closePrices;

      if (closePrices.length < 3) {
        const twelveMonth = await fetchClosedCompsForMarket({ sinceDays: 365, cityToken, county: '', zip });
        comps = twelveMonth.comps;
        closePrices = twelveMonth.closePrices;
        expanded = true;
      }
    }

    const p25 = percentile(closePrices, 0.25);
    const p50 = percentile(closePrices, 0.5);
    const p75 = percentile(closePrices, 0.75);

    const suggested = p50 ? Math.round(p50) : null;

    // 3) Retrieve relevant CMA *playbook* chunks (methodology, not client-specific facts)
    let cmaChunks = [];
    try {
      const cmaRes = await fetch(`${ragBase}/cma/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `CMA methodology for selecting comps, deriving a price range, and explaining adjustments.`,
          top_k: 6,
          kind: 'playbook',
        }),
      });
      const cmaJson = await cmaRes.json().catch(() => null);
      cmaChunks = Array.isArray(cmaJson?.chunks) ? cmaJson.chunks : [];
    } catch {
      cmaChunks = [];
    }

    const reasoning = [
      subjectRaw
        ? `Matched subject property: ${subject.address}${subject.city ? `, ${subject.city}` : ''}`
        : `No exact MLS record found for this address; using market-level comps for ${subject.city || subject.zip || 'the provided area'}.`,
      expanded
        ? `Pulled ${comps.length} closed comps from the last 12 months (expanded from 6 months due to low comp count).`
        : `Pulled ${comps.length} closed comps from the last 6 months.`,
    ];

    const low = Number.isFinite(p25) ? Math.round(p25) : null;
    const mid = Number.isFinite(p50) ? Math.round(p50) : null;
    const high = Number.isFinite(p75) ? Math.round(p75) : null;

    if (mid && low && high) {
      reasoning.push(`Price range (low/mid/high from comps): $${low.toLocaleString()} / $${mid.toLocaleString()} / $${high.toLocaleString()}`);
    }

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
      comp_stats: { p25, p50, p75, comps: comps.length },
      deal_quality: verdict,
      listings: comps,
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
          },
        }
        : {}),
    });
  } catch (e) {
    return res.status(500).json({ error: 'Pricing failed', details: e?.message || String(e) });
  }
}

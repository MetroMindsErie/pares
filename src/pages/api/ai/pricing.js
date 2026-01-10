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
  };
}

function shouldLogPricing() {
  return process.env.NODE_ENV !== 'production' || process.env.DEBUG_PRICING === '1';
}

function logPricing(...args) {
  if (!shouldLogPricing()) return;
  // eslint-disable-next-line no-console
  console.log('[pricing]', ...args);
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
    price: Number(p?.ClosePrice ?? p?.ListPrice ?? 0),
    beds: Number(p?.BedroomsTotal ?? 0),
    baths: Number(p?.BathroomsTotalInteger ?? 0),
    property_type: String(p?.PropertyType || ''),
    status: String(p?.StandardStatus || ''),
    sqft: Number(p?.LivingArea ?? 0),
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

async function fetchClosedComps({ sinceDays, subjectRaw }) {
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
      'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,StandardStatus,ClosePrice,ListPrice,CloseDate',
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

async function fetchClosedCompsForMarket({ sinceDays, cityToken, county, zip }) {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const ymd = since.toISOString().slice(0, 10);

  const compFilters = [];
  compFilters.push(`StandardStatus eq 'Closed'`);
  compFilters.push(`CloseDate ge ${ymd}`);
  compFilters.push(`ClosePrice ge 10000`);
  compFilters.push(`PropertyType eq 'Residential'`);

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
      'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,StandardStatus,ClosePrice,ListPrice,CloseDate',
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

    // If the UI provides county+zip, skip subject matching entirely (many owner addresses won't exist as a listing).
    // Use county/zip-based comps directly.
    const countyTrim = typeof county === 'string' ? county.trim() : '';
    const zipTrim = typeof zip === 'string' ? zip.trim() : '';

    if (countyTrim && zipTrim && !subjectId) {
      const startedAt = Date.now();
      const normalizedCounty = normalizeLoose(countyTrim).replace(/\bcounty\b/g, '').trim();
      const zip5 = (zipTrim.match(/\b\d{5}\b/) || [null])[0];
      const parsedForMarket = parseAddressParts(addr);
      const cityToken = parsedForMarket.cityToken;

      logPricing('market pricing request:', { county: normalizedCounty, zip: zip5 || zipTrim, address: addr, cityToken });

      const relaxation = [];

      // 1) Strict: county + zip
      const sixMonth = await fetchClosedCompsForMarket({ sinceDays: 183, county: normalizedCounty, zip: zip5 });
      let comps = sixMonth.comps;
      let closePrices = sixMonth.closePrices;
      let expanded = false;

      if (closePrices.length < 3) {
        const twelveMonth = await fetchClosedCompsForMarket({ sinceDays: 365, county: normalizedCounty, zip: zip5 });
        comps = twelveMonth.comps;
        closePrices = twelveMonth.closePrices;
        expanded = true;
      }

      // 2) Relax: drop zip, use county + city (if we have it)
      if (closePrices.length < 3 && cityToken) {
        relaxation.push('Relaxed pricing comps: dropped ZIP; using county + city.');
        const twelveMonth = await fetchClosedCompsForMarket({ sinceDays: 365, county: normalizedCounty, zip: null, cityToken });
        comps = twelveMonth.comps;
        closePrices = twelveMonth.closePrices;
        expanded = true;
      }

      // 3) Relax: county only
      if (closePrices.length < 3) {
        relaxation.push('Relaxed pricing comps: using county-wide comps.');
        const twelveMonth = await fetchClosedCompsForMarket({ sinceDays: 365, county: normalizedCounty, zip: null, cityToken: null });
        comps = twelveMonth.comps;
        closePrices = twelveMonth.closePrices;
        expanded = true;
      }

      const p25 = percentile(closePrices, 0.25);
      const p50 = percentile(closePrices, 0.5);
      const p75 = percentile(closePrices, 0.75);

      const low = Number.isFinite(p25) ? Math.round(p25) : null;
      const mid = Number.isFinite(p50) ? Math.round(p50) : null;
      const high = Number.isFinite(p75) ? Math.round(p75) : null;

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
        `Using comps in PA near: ${normalizedCounty || countyTrim} County${zip5 ? `, ${zip5}` : ''}.`,
        expanded
          ? `Pulled ${comps.length} closed comps from the last 12 months (expanded from 6 months due to low comp count).`
          : `Pulled ${comps.length} closed comps from the last 6 months.`,
      ];

      if (relaxation.length) {
        reasoning.push(...relaxation.slice(0, 3));
      }

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

      const disclaimer = 'This is an estimate based on comparable sales, not a formal appraisal.';
      const answer = low && mid && high
        ? `Estimated price range: $${low.toLocaleString()}–$${high.toLocaleString()} (market midpoint ~$${mid.toLocaleString()}). ${disclaimer}`
        : `Found ${comps.length} comps, but couldn’t compute a stable range (missing/invalid ClosePrice). ${disclaimer}`;

      const durationMs = Date.now() - startedAt;
      logPricing('done (county+zip):', { comps: comps.length, usablePrices: closePrices.length, expanded, durationMs });

      const debug = shouldLogPricing()
        ? { county: normalizedCounty || countyTrim, zip: zip5 || zipTrim, duration_ms: durationMs }
        : undefined;

      return res.json({
        answer,
        reasoning,
        subject: {
          id: '',
          address: addr,
          city: '',
          county: countyTrim,
          state: 'PA',
          zip: zipTrim,
          price: 0,
          beds: 0,
          baths: 0,
          property_type: 'Residential',
          status: 'Unknown',
          sqft: 0,
        },
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
      if (parsed.cityToken) c.push(`contains(tolower(City), '${odataEscape(parsed.cityToken)}')`);
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
      'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,StandardStatus,ClosePrice,ListPrice,CloseDate,MLSAreaMajor,ModificationTimestamp';

    let subjectRes;
    if (subjectId && subjectId.trim()) {
      const byIdFilter = `ListingKey eq '${odataEscape(subjectId.trim())}'`;
      logPricing('subject lookup by id:', subjectId.trim());
      subjectRes = await fetchTrestleOData('odata/Property', {
        $top: '1',
        $select: subjectSelect,
        $filter: byIdFilter,
      });
    } else {
      subjectRes = await fetchTrestleOData('odata/Property', {
        $top: '3',
        $select: subjectSelect,
        $filter: subjectFilter,
        $orderby: 'ModificationTimestamp desc',
      });
    }

    const subjectRows = Array.isArray(subjectRes?.json?.value) ? subjectRes.json.value : [];
    const subjectRaw = subjectRows[0] || null;

    const debug = shouldLogPricing()
      ? { attempted_subject_filter: subjectFilter, parsed_address: parsed }
      : undefined;

    let subject;
    let comps = [];
    let closePrices = [];
    let expanded = false;
    let usedMarketFallback = false;

    if (subjectRaw) {
      subject = mapTrestlePropertyToListing(subjectRaw);

      // 2) Pull closed comps near the subject.
      // Playbook default: last 6 months; extend to 12 months if < 3 usable comps.
      const sixMonth = await fetchClosedComps({ sinceDays: 183, subjectRaw });
      comps = sixMonth.comps;
      closePrices = sixMonth.closePrices;

      if (closePrices.length < 3) {
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
        address: parsed.streetRaw || parsed.raw,
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
      ...(debug ? { debug: { ...debug, subject_matched: Boolean(subjectRaw), used_market_fallback: usedMarketFallback, duration_ms: durationMs } } : {}),
    });
  } catch (e) {
    return res.status(500).json({ error: 'Pricing failed', details: e?.message || String(e) });
  }
}

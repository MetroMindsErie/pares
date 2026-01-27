import { createClient } from '@supabase/supabase-js';
import { fetchTrestleOData } from '../../../lib/trestleServer';
import crypto from 'node:crypto';

const ALLOWED_COUNTIES = ['Erie', 'Warren', 'Crawford'];
const ALLOWED_ROLES = new Set(['seller', 'buyer', 'investor', 'realtor']);

function shouldLogAiFlow() {
  // AI search can include PII (addresses, names). Only log when explicitly enabled.
  return process.env.DEBUG_AI_FLOW === '1';
}

function logAiFlow(traceId, ...args) {
  if (!shouldLogAiFlow()) return;
}

function odataEscape(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/'/g, "''");
}

function parseBasicSearch(query) {
  const q = String(query || '').toLowerCase();

  const hasLeaseIntent = /\b(lease|for\s+rent|renting)\b/.test(q);
  const hasRentalKeyword = /\b(rent|rental|rentals)\b/.test(q);

  const out = {
    price_min: null,
    price_max: null,
    beds_min: null,
    zip: null,
    location: null,
    mls_area: null,
    mls_area_num: null,
    sold_within_days: null,
    status: 'Active',
    status_explicit: false,
    // want_lease means the user wants *lease listings* (e.g., $/month), not "a rental property" purchase.
    want_lease: false,
    want_income: false,
    want_residential: false,
    want_commercial: false,
  };

  // We finalize want_lease after price parsing (below) to disambiguate "rental".
  out.want_lease = hasLeaseIntent;
  out.want_income = /\b(duplex|triplex|fourplex|quadplex|multi\s*-?\s*family|multifamily|residential\s*income|income\s*property)\b/.test(q);
  out.want_residential = /\b(single\s*-?\s*family|house|home|residential)\b/.test(q);
  out.want_commercial = /\b(commercial|retail|office|industrial)\b/.test(q);

  // status heuristics
  if (/\b(sold|closed)\b/.test(q)) {
    out.status = 'Closed';
    out.status_explicit = true;
  } else if (/\b(pending|under contract)\b/.test(q)) {
    out.status = 'Pending';
    out.status_explicit = true;
  } else if (/\b(expired)\b/.test(q)) {
    out.status = 'Expired';
    out.status_explicit = true;
  } else if (/\b(active|available)\b/.test(q)) {
    out.status = 'Active';
    out.status_explicit = true;
  }

  // Time window parsing (for sold/closed queries)
  // Examples:
  // - "sold within the past year"
  // - "sold in the last 12 months"
  // - "sold in the last 30 days"
  if (/\b(past|last)\s+year\b|\blast\s+12\s+months\b|\bpast\s+12\s+months\b/.test(q)) {
    out.sold_within_days = 365;
  } else {
    const daysMatch = q.match(/\b(?:past|last)\s+(\d{1,3})\s+days\b/);
    if (daysMatch) {
      const n = Number(daysMatch[1]);
      if (!Number.isNaN(n) && n > 0) out.sold_within_days = n;
    } else {
      const monthsMatch = q.match(/\b(?:past|last)\s+(\d{1,2})\s+months\b/);
      if (monthsMatch) {
        const n = Number(monthsMatch[1]);
        if (!Number.isNaN(n) && n > 0) out.sold_within_days = n * 30;
      }
    }
  }

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

  // Finalize lease intent.
  // Heuristic:
  // - If the query clearly indicates leasing ("lease", "for rent"), treat as lease listings.
  // - If the query only says "rental(s)" and the price looks like monthly rent (<= 10k), treat as lease listings.
  // - Otherwise treat "rental" as "rental property" (purchase), not a lease listing.
  const monthlySignal = /\b(per\s+month|\/\s*mo|\/\s*month|monthly|\$\s*\d+\s*\/\s*mo)\b/.test(q);
  if (!out.want_lease && hasRentalKeyword) {
    if (monthlySignal || (typeof out.price_max === 'number' && out.price_max > 0 && out.price_max <= 10000)) {
      out.want_lease = true;
    }
  }

  // beds: "3 beds", "3 bed", "3br", "3+ beds"
  const bedsMatch = q.match(/\b(\d+)\s*\+?\s*(beds?|br)\b/);
  if (bedsMatch) {
    const num = Number(bedsMatch[1]);
    if (!Number.isNaN(num)) out.beds_min = num;
  }

  // location: "in erie" or "near erie" or "in 16505" or fallback county
  // Use lookaheads so we don't accidentally include trailing phrases like "near the university".
  const inMatch = q.match(
    /\bin\s+([a-z0-9\s]+?)(?=\bin\b|\bwith\b|\bunder\b|\bbelow\b|\bover\b|\babove\b|\bbetween\b|\bnear\b|\baround\b|\bwithin\b|\blast\b|\bpast\b|\bsell\b|\bsold\b|\bfor\b|\b$)/
  );
  const nearMatch = q.match(
    /\bnear\s+(?:the\s+)?([a-z0-9\s]+?)(?=\bwith\b|\bunder\b|\bbelow\b|\bover\b|\babove\b|\bbetween\b|\bin\b|\bfor\b|\b$)/
  );

  if (inMatch) {
    const term = inMatch[1].trim();
    if (/^\d{5}$/.test(term)) out.zip = term;
    else out.location = term;
  } else if (nearMatch) {
    const term = nearMatch[1].trim();
    // "near the university" isn't a stable geo filter, so ignore those.
    if (term && !/(university|campus)/.test(term)) {
      if (/^\d{5}$/.test(term)) out.zip = term;
      else out.location = term;
    }
  } else {
    // fallback: if query contains one of the target counties
    const county = ALLOWED_COUNTIES.find((c) => q.includes(c.toLowerCase()));
    if (county) out.location = county.toLowerCase();
  }

  // Sanitize location: avoid accidentally including verbs like "sell" (e.g. "in erie sell for")
  if (out.location) {
    out.location = out.location
      .replace(/\b(sell|sold|buy|rent|lease)\b.*$/i, '')
      .replace(/\b(within|last|past)\b.*$/i, '')
      .trim();
    if (!out.location) out.location = null;
  }

  // MLS Area numeric parsing (e.g., "area 5", "mlsarea5", "mls area 5")
  const areaNumMatch = q.match(/\b(?:mls\s*area|mlsarea|area)\s*(\d{1,2})\b/);
  if (areaNumMatch) {
    const n = Number(areaNumMatch[1]);
    if (!Number.isNaN(n)) {
      out.mls_area_num = n;
      // If user typed "in area 5", don't treat that as a city/location constraint.
      if (out.location && /^area\s*\d{1,2}$/.test(out.location)) out.location = null;
    }
  }

  // MLS Area parsing (Erie market)
  // Examples users may type:
  // - "north east erie" / "northeast erie" / "erie northeast"
  // We map these to MLSAreaMajor contains("Erie Northeast") style filtering.
  const areaMatch = q.match(/\b(north\s*east|northeast|north\s*west|northwest|south\s*east|southeast|south\s*west|southwest)\s+erie\b|\berie\s+(northeast|northwest|southeast|southwest)\b/);
  if (areaMatch) {
    const rawDir = (areaMatch[1] || areaMatch[2] || '').replace(/\s+/g, ' ').trim();
    if (rawDir) {
      const dirNorm = rawDir.replace('north east', 'northeast').replace('north west', 'northwest').replace('south east', 'southeast').replace('south west', 'southwest');
      const label =
        dirNorm === 'northeast' ? 'Erie Northeast' :
        dirNorm === 'northwest' ? 'Erie Northwest' :
        dirNorm === 'southeast' ? 'Erie Southeast' :
        dirNorm === 'southwest' ? 'Erie Southwest' : null;

      if (label) {
        out.mls_area = label;
        // Always normalize base location to Erie so we don't over-restrict City filter.
        out.location = 'erie';
      }
    }
  }

  // Normalize location if it's just an area reference.
  if (out.location && /^(?:area|mls\s*area|mlsarea)\s*\d{1,2}$/.test(out.location)) {
    out.location = null;
  }

  // If a user typed something like "north east erie" as the location, normalize it.
  if (out.location && /\berie\b/.test(out.location) && /\b(north|south|east|west)\b/.test(out.location)) {
    out.location = 'erie';
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

  // Extract media with preferred photo logic
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
    image_url: imageUrl,
    media_urls: mediaUrls,
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
    const traceId = crypto.randomUUID();
    const startedAt = Date.now();
    // Default to IPv4 loopback to avoid occasional localhost/IPv6 resolution issues.
    const ragBase = process.env.RAG_API_URL || 'http://127.0.0.1:3001';

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const query = body?.query;
    const roleRaw = body?.role;
    const role = typeof roleRaw === 'string' && ALLOWED_ROLES.has(roleRaw) ? roleRaw : 'buyer';

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Invalid request: query must be a string' });
    }

    logAiFlow(traceId, 'start', { ragBase, role });
    logAiFlow(traceId, 'query', String(query).trim().slice(0, 220));

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
    logAiFlow(traceId, 'parsed', parsed);

    // Role-specific retrieval defaults (safe, with fallback)
    // - buyer: default to Residential (exclude ResidentialIncome/CommercialSale) unless user explicitly asked for income/commercial
    // - investor: prefer ResidentialIncome unless user explicitly asked for commercial/residential
    // - seller: default to recent Closed comps unless user explicitly asked for a status
    const roleDefaults = {
      preferPropertyType: null,
      propertyTypeStrict: false,
      overrideStatus: null,
      overrideSoldWithinDays: null,
    };

    // Explicit property-type intent should be treated as strict so we don't top-up into other types.
    if (parsed.want_commercial) {
      roleDefaults.preferPropertyType = 'CommercialSale';
      roleDefaults.propertyTypeStrict = true;
    } else if (parsed.want_residential && !parsed.want_income) {
      roleDefaults.preferPropertyType = 'Residential';
      roleDefaults.propertyTypeStrict = true;
    }

    if (!roleDefaults.preferPropertyType) {
      if (role === 'buyer') {
        if (!parsed.want_income && !parsed.want_commercial) {
          roleDefaults.preferPropertyType = 'Residential';
        }
      } else if (role === 'investor') {
        if (!parsed.want_commercial && !parsed.want_residential && !parsed.want_income) {
          roleDefaults.preferPropertyType = 'ResidentialIncome';
        }
      }
    }

    if (role === 'seller') {
      if (!parsed.status_explicit) {
        roleDefaults.overrideStatus = 'Closed';
        roleDefaults.overrideSoldWithinDays = parsed.sold_within_days || 365;
      }
    }

    if (roleDefaults.overrideStatus) {
      parsed.status = roleDefaults.overrideStatus;
    }
    if (typeof roleDefaults.overrideSoldWithinDays === 'number') {
      parsed.sold_within_days = roleDefaults.overrideSoldWithinDays;
    }

    logAiFlow(traceId, 'role defaults', roleDefaults);
    const filters = [];

    // Track whether we relax constraints, and why.
    // These notes are forwarded to /ai/explain so the UI can be transparent about what changed.
    const retrievalNotes = [];
    let retrievalAttempt = 'primary';

    // County restriction (MLS coverage)
    filters.push(`(${ALLOWED_COUNTIES.map((c) => `CountyOrParish eq '${odataEscape(c)}'`).join(' or ')})`);

    // Default status
    if (parsed.status) {
      filters.push(`StandardStatus eq '${odataEscape(parsed.status)}'`);
    }

    // Sold/Closed within a time window
    if (parsed.status === 'Closed' && typeof parsed.sold_within_days === 'number') {
      const since = new Date();
      since.setDate(since.getDate() - parsed.sold_within_days);
      const ymd = since.toISOString().slice(0, 10);
      filters.push(`CloseDate ge ${ymd}`);
    }

    // Pending within a time window (use ContractStatusChangeDate; PendingTimestamp can be null)
    if (parsed.status === 'Pending' && typeof parsed.sold_within_days === 'number') {
      const since = new Date();
      since.setDate(since.getDate() - parsed.sold_within_days);
      const ymd = since.toISOString().slice(0, 10);
      filters.push(`ContractStatusChangeDate ge ${ymd}`);
    }

    // Sold/Closed within a time window
    if (parsed.status === 'Closed' && typeof parsed.sold_within_days === 'number') {
      const since = new Date();
      since.setDate(since.getDate() - parsed.sold_within_days);
      const ymd = since.toISOString().slice(0, 10);
      filters.push(`CloseDate ge ${ymd}`);
    }

    if (parsed.zip) {
      filters.push(`PostalCode eq '${odataEscape(parsed.zip)}'`);
    }

    // Price field differs by status
    const priceField = parsed.status === 'Closed' ? 'ClosePrice' : 'ListPrice';
    if (parsed.price_min) {
      filters.push(`${priceField} ge ${Math.floor(parsed.price_min)}`);
    }

    if (parsed.price_max) {
      filters.push(`${priceField} le ${Math.floor(parsed.price_max)}`);
    }

    if (parsed.beds_min) {
      filters.push(`BedroomsTotal ge ${Math.floor(parsed.beds_min)}`);
    }

    if (parsed.location) {
      const loc = odataEscape(parsed.location);
      filters.push(`(contains(tolower(City), '${loc.toLowerCase()}') or contains(tolower(CountyOrParish), '${loc.toLowerCase()}') or contains(tolower(UnparsedAddress), '${loc.toLowerCase()}'))`);
    }

    // MLS Area filtering (optional). Use contains because MLSAreaMajor includes numeric prefixes.
    if (parsed.mls_area) {
      const area = odataEscape(parsed.mls_area);
      filters.push(`contains(tolower(MLSAreaMajor), '${area.toLowerCase()}')`);
    }

    // MLS Area numeric filtering (e.g., "area 5" => "5 - ...")
    if (typeof parsed.mls_area_num === 'number') {
      const prefix = `${parsed.mls_area_num} -`;
      const nextPrefix = `${parsed.mls_area_num + 1} -`;
      // Avoid `contains(..., '5 -')` because it also matches areas like '15 -', '25 -', etc.
      // Use either startswith or a lexicographic range.
      filters.push(`(startswith(MLSAreaMajor, '${odataEscape(prefix)}') or (MLSAreaMajor ge '${odataEscape(prefix)}' and MLSAreaMajor lt '${odataEscape(nextPrefix)}'))`);
    }

    // Property type intent (duplex/multifamily/income)
    // These fields appear to be enums; equality comparisons work reliably.
    if (parsed.want_income) {
      filters.push("PropertyType eq 'ResidentialIncome'");
    }

    // Default to sale listings unless user explicitly asks to rent/lease.
    // This MLS feed exposes PropertyType as an enum, so string comparisons/functions are unreliable.
    // Heuristic: rental ListPrice is typically a monthly amount (< 10k).
    if (!parsed.want_lease) {
      filters.push(`${priceField} ge 10000`);
    }

    // Role-driven property type preference (applied as a first-pass filter; we will relax if needed)
    const rolePropertyFilter = roleDefaults.preferPropertyType
      ? `PropertyType eq '${odataEscape(roleDefaults.preferPropertyType)}'`
      : null;
    const rolePropertyStrict = Boolean(roleDefaults.propertyTypeStrict);

    const orderBy = parsed.status === 'Closed' ? 'CloseDate desc' : 'ListPrice asc';

    const fetchAndMap = async (filterString) => {
      const trestleParams = {
        $filter: filterString,
        $top: '25',
        $skip: '0',
        $expand: 'Media',
        $orderby: orderBy
      };

      logAiFlow(traceId, 'trestle retrieve', { orderBy, top: 25 });
      const trestle = await fetchTrestleOData('odata/Property', trestleParams);
      const trestleValues = Array.isArray(trestle?.json?.value) ? trestle.json.value : [];
      return {
        trestle,
        trestleParams,
        mappedListings: trestleValues.map(mapTrestlePropertyToListing).filter((l) => l.id),
      };
    };

    const hasAreaConstraint = filters.some((f) => f.includes('MLSAreaMajor'));
    const incomeExplicit = Boolean(parsed.want_income);
    const roleFilterIsIncome = Boolean(rolePropertyFilter && /ResidentialIncome/.test(rolePropertyFilter));

    const buildAttempt = ({
      label,
      dropArea,
      dropRoleProperty,
      dropIncome,
      notes,
    }) => {
      const baseFilters = filters
        .filter((f) => (dropArea ? !f.includes('MLSAreaMajor') : true))
        .filter((f) => (dropIncome ? !/PropertyType eq 'ResidentialIncome'/.test(f) : true));

      const baseFilter = baseFilters.join(' and ');
      const rp = dropRoleProperty ? null : rolePropertyFilter;
      const filter = rp ? `${baseFilter} and ${rp}` : baseFilter;
      return { label, filter, baseFilter, rolePropertyApplied: Boolean(rp), notes };
    };

    const attempts = [];

    // Primary attempt.
    attempts.push(
      buildAttempt({
        label: 'primary',
        dropArea: false,
        dropRoleProperty: false,
        dropIncome: false,
        notes: [],
      })
    );

    // If role-based property filter is too restrictive, try without it (only if it's a preference).
    if (rolePropertyFilter && !rolePropertyStrict) {
      attempts.push(
        buildAttempt({
          label: 'no_role_property_type',
          dropArea: false,
          dropRoleProperty: true,
          dropIncome: false,
          notes: ['Relaxed search: removed role-based property type preference'],
        })
      );
    }

    // If an MLS area constraint yields 0, expand the geo constraint but keep intent.
    if (hasAreaConstraint) {
      attempts.push(
        buildAttempt({
          label: 'no_mls_area',
          dropArea: true,
          dropRoleProperty: false,
          dropIncome: false,
          notes: ['Relaxed search: removed MLS area constraint to find nearby matches'],
        })
      );
      if (rolePropertyFilter && !rolePropertyStrict) {
        attempts.push(
          buildAttempt({
            label: 'no_mls_area_no_role_property_type',
            dropArea: true,
            dropRoleProperty: true,
            dropIncome: false,
            notes: [
              'Relaxed search: removed MLS area constraint to find nearby matches',
              'Relaxed search: removed role-based property type preference',
            ],
          })
        );
      }
    }

    // Last resort: if user explicitly asked for income/multifamily and we still got 0,
    // show other property types (with a clear disclosure).
    if (incomeExplicit || roleFilterIsIncome) {
      attempts.push(
        buildAttempt({
          label: 'no_income_constraint',
          dropArea: false,
          dropRoleProperty: roleFilterIsIncome, // drop role RI preference if present
          dropIncome: true,
          notes: ['Relaxed search: removed multifamily/income constraint to show alternatives'],
        })
      );
    }

    let chosen = null;
    for (const attempt of attempts) {
      logAiFlow(traceId, 'retrieval attempt', { label: attempt.label });
      const result = await fetchAndMap(attempt.filter);
      if (result.mappedListings.length > 0 || attempt === attempts[attempts.length - 1]) {
        chosen = { ...attempt, ...result };
        break;
      }
    }

    let mappedListings = chosen?.mappedListings || [];
    retrievalAttempt = chosen?.label || 'primary';
    retrievalNotes.push(...(chosen?.notes || []));

    // If role-based property filter is a *preference*, top up with a relaxed query (never overrides existing matches).
    // Never top-up if the user explicitly asked for a property type (strict intent).
    if (chosen?.rolePropertyApplied && !rolePropertyStrict && mappedListings.length > 0 && mappedListings.length < 25) {
      logAiFlow(traceId, 'top-up without role filter', { current: mappedListings.length });
      const relaxed = await fetchAndMap(chosen.baseFilter);
      const relaxedListings = relaxed.mappedListings;
      const seen = new Set(mappedListings.map((l) => l.id));
      for (const l of relaxedListings) {
        if (seen.has(l.id)) continue;
        mappedListings.push(l);
        seen.add(l.id);
        if (mappedListings.length >= 25) break;
      }
    }

    // Phase B: call Easters AI explanation endpoint using provided listings
    logAiFlow(traceId, 'upstream request', {
      url: `${ragBase}/ai/explain`,
      listings: mappedListings.length,
      retrievalAttempt,
      retrievalNotes: retrievalNotes.slice(0, 4),
    });
    const upstream = await fetch(`${ragBase}/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Trace-Id': traceId },
      body: JSON.stringify({ query, role, listings: mappedListings, retrieval_notes: retrievalNotes, retrieval_attempt: retrievalAttempt })
    });

    const text = await upstream.text();

    logAiFlow(traceId, 'upstream response', {
      status: upstream.status,
      elapsed_ms: Date.now() - startedAt,
      trace_header: upstream.headers.get('x-trace-id') || null,
    });

    // If we relaxed constraints, ensure the client sees the disclosure even if upstream
    // doesn't echo it (e.g., stale container / older build).
    if (retrievalNotes.length > 0) {
      try {
        const parsedUpstream = JSON.parse(text);
        if (parsedUpstream && typeof parsedUpstream === 'object') {
          if (!Array.isArray(parsedUpstream.reasoning)) parsedUpstream.reasoning = [];
          const existing = new Set(
            parsedUpstream.reasoning
              .filter((r) => typeof r === 'string')
              .map((r) => String(r))
          );

          // Insert after the first couple of standard lines if present.
          const insertAt = Math.min(2, parsedUpstream.reasoning.length);
          const notesToInsert = retrievalNotes
            .filter((n) => typeof n === 'string' && n.trim().length > 0)
            .filter((n) => !existing.has(n))
            .slice(0, 4);

          if (notesToInsert.length > 0) {
            parsedUpstream.reasoning.splice(insertAt, 0, ...notesToInsert);
          }

          // Also annotate the attempt label for debugging/transparency.
          if (retrievalAttempt && typeof retrievalAttempt === 'string') {
            parsedUpstream.retrieval_attempt = retrievalAttempt;
          }

          parsedUpstream.trace_id = traceId;
          res.setHeader('X-Trace-Id', traceId);

          try {
            const top = Array.isArray(parsedUpstream?.listings) ? parsedUpstream.listings[0] : null;
            logAiFlow(traceId, 'result summary', {
              deal_score: parsedUpstream?.deal_score,
              suggested_offer: parsedUpstream?.suggested_offer,
              top_id: top?.id,
              top_deal_score: top?.deal_score,
              top_vector_score: top?.vector_score,
              reasoning_preview: Array.isArray(parsedUpstream?.reasoning) ? parsedUpstream.reasoning.slice(0, 8) : null,
            });
          } catch {
            // ignore
          }

          res.status(upstream.status);
          res.setHeader('Content-Type', 'application/json');
          return res.send(JSON.stringify(parsedUpstream));
        }
      } catch {
        // ignore JSON patch errors; fall back to raw upstream response
      }
    }

    // Best-effort: if upstream returned JSON, attach trace_id even when no retrieval notes.
    try {
      const parsedUpstream = JSON.parse(text);
      if (parsedUpstream && typeof parsedUpstream === 'object') {
        parsedUpstream.trace_id = traceId;
        res.status(upstream.status);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Trace-Id', traceId);
        return res.send(JSON.stringify(parsedUpstream));
      }
    } catch {
      // ignore
    }

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
          query_params: { query, role },
          results_count: resultsCount
        });
      } catch {
        // ignore logging errors
      }
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.setHeader('X-Trace-Id', traceId);
    return res.send(text);
  } catch (e) {
    return res.status(500).json({
      error: 'AI search proxy failed',
      details: e?.message || String(e)
    });
  }
}

import { fetchTrestleOData } from '../../../../lib/trestleServer.js';

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

function shouldDebug() {
  return process.env.NODE_ENV !== 'production' || process.env.DEBUG_PRICING === '1';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const query = body?.query;
    if (!query || typeof query !== 'string' || query.trim().length < 4) {
      return res.status(400).json({ error: 'Invalid request: query must be a string (min 4 chars)' });
    }

    const parsed = parseAddressParts(query);

    const clauses = [];
    if (parsed.streetQuery) {
      clauses.push(`contains(tolower(UnparsedAddress), '${odataEscape(parsed.streetQuery)}')`);
    }
    if (parsed.streetNumber && parsed.streetNameToken) {
      clauses.push(
        `StreetNumber eq '${odataEscape(parsed.streetNumber)}' and contains(tolower(UnparsedAddress), '${odataEscape(`${parsed.streetNumber} ${parsed.streetNameToken}`)}')`
      );
    }

    const filterParts = [];
    filterParts.push(`StandardStatus ne 'Expired'`);
    filterParts.push(`(${clauses.join(' or ')})`);
    if (parsed.zip) filterParts.push(`PostalCode eq '${odataEscape(parsed.zip)}'`);
    if (parsed.cityToken) filterParts.push(`contains(tolower(City), '${odataEscape(parsed.cityToken)}')`);

    const subjectFilter = filterParts.join(' and ');

    const r = await fetchTrestleOData('odata/Property', {
      $top: '10',
      $select:
        'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,StandardStatus,ClosePrice,ListPrice,CloseDate,ModificationTimestamp',
      $filter: subjectFilter,
      $orderby: 'ModificationTimestamp desc',
    });

    const rows = Array.isArray(r?.json?.value) ? r.json.value : [];
    const subjects = rows
      .map((p) => {
        const unparsed = p?.UnparsedAddress ? String(p.UnparsedAddress) : '';
        const fallbackAddress = `${p?.StreetNumber || ''} ${p?.StreetName || ''}`.trim();
        const address = unparsed || fallbackAddress;
        const city = String(p?.City || '');
        const state = String(p?.StateOrProvince || '');
        const zip = String(p?.PostalCode || '');
        const status = String(p?.StandardStatus || '');
        const id = String(p?.ListingKey || '');
        const label = [address, city && `\u2022 ${city}`, state && state, zip && zip].filter(Boolean).join(' ');
        return {
          id,
          label,
          address,
          city,
          state,
          zip,
          status,
          property_type: String(p?.PropertyType || ''),
        };
      })
      .filter((s) => s.id && s.address);

    return res.json({ subjects, ...(shouldDebug() ? { debug: { attempted_subject_filter: subjectFilter, parsed_address: parsed } } : {}) });
  } catch (e) {
    return res.status(500).json({ error: 'Subject lookup failed', details: e?.message || String(e) });
  }
}

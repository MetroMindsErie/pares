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
  const restRaw = parts.slice(1).join(' ');
  const rest = normalizeLoose(restRaw);
  const zipMatch = raw.match(/\b\d{5}\b/);
  const zip = zipMatch ? zipMatch[0] : null;
  const cityToken = rest.split(' ').find((t) => t.length >= 3) || null;
  return { raw, cityToken, zip };
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

export default async function handler(req, res) {
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
          'ListingKey,UnparsedAddress,StreetNumber,StreetName,City,CountyOrParish,StateOrProvince,PostalCode,MLSAreaMajor,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,Latitude,Longitude,StandardStatus,ClosePrice,ListPrice',
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
        $top: '20',
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

    return res.json({ listings });
  } catch (e) {
    return res.status(500).json({ error: 'Active nearby lookup failed', details: e?.message || String(e) });
  }
}
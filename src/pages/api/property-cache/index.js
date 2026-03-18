/**
 * /api/property-cache — Cache-first property search
 *
 * GET  ?q=123+Main        → fuzzy address search (trigram)
 * GET  ?location=Erie&…   → structured search with cache → Trestle fallback
 * POST                    → manually warm the cache for a county
 */

import {
  searchCacheByAddress,
  searchCachedProperties,
  upsertListingsToCache,
  isCacheWarm,
} from '../../../lib/propertyCache';
import { fetchTrestleOData } from '../../../lib/trestleServer';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

/* GET — search with cache-first strategy */
async function handleGet(req, res) {
  const q        = req.query.q        || '';
  const location = req.query.location  || q;
  const city     = req.query.city      || '';
  const county   = req.query.county    || '';
  const zip      = req.query.zip       || '';
  const status   = req.query.status    || '';
  const minPrice = req.query.minPrice  || '';
  const maxPrice = req.query.maxPrice  || '';
  const beds     = req.query.beds      || '';
  const baths    = req.query.baths     || '';
  const sort     = req.query.sort      || 'relevance';
  const limit    = Math.min(Number(req.query.limit) || 50, 100);

  try {
    // 1. Quick address fuzzy search if q looks like an address
    const looksLikeAddress = /\d/.test(q) && q.length >= 4;
    if (looksLikeAddress) {
      const cached = await searchCacheByAddress(q, limit);
      if (cached.properties.length > 0) {
        return res.status(200).json({
          properties: cached.properties,
          total: cached.properties.length,
          source: 'cache',
        });
      }
    }

    // 2. Structured cache search
    const cached = await searchCachedProperties({
      location, city, county, zip, status,
      minPrice, maxPrice, beds, baths,
      sort, limit,
    });

    if (cached.properties.length > 0) {
      return res.status(200).json({
        properties: cached.properties,
        total: cached.properties.length,
        source: 'cache',
      });
    }

    // 3. Cache miss → query Trestle and backfill
    const trestleResult = await fetchFromTrestle({ location, city, county, zip, status, minPrice, maxPrice, beds, baths, sort, limit });

    if (trestleResult.properties.length > 0) {
      upsertListingsToCache(trestleResult.properties).catch(err =>
        console.error('Background cache backfill failed:', err.message)
      );
    }

    return res.status(200).json({
      properties: trestleResult.properties,
      total: trestleResult.properties.length,
      nextLink: trestleResult.nextLink || null,
      source: 'trestle',
    });
  } catch (err) {
    console.error('Property cache search error:', err);
    return res.status(500).json({ error: 'Search failed' });
  }
}

/* POST — warm the cache for a county */
async function handlePost(req, res) {
  try {
    const body = req.body;
    const county = body.county || 'Erie';
    const maxPages = Math.min(body.maxPages || 5, 20);

    const warm = await isCacheWarm(county);
    if (warm) {
      return res.status(200).json({ message: `Cache already warm for ${county}`, skipped: true });
    }

    let total = 0;
    let nextLink = null;
    const filters = [
      `(CountyOrParish eq '${county}')`,
      `(StandardStatus eq 'Active' or StandardStatus eq 'Pending')`,
    ].join(' and ');

    for (let page = 0; page < maxPages; page++) {
      let data;
      if (nextLink) {
        const resp = await fetch(nextLink);
        data = await resp.json();
      } else {
        data = await fetchTrestleOData('Property', {
          $filter: filters,
          $expand: 'Media',
          $top: '200',
        });
      }

      const listings = data?.value || [];
      if (!listings.length) break;

      await upsertListingsToCache(listings);
      total += listings.length;
      nextLink = data?.['@odata.nextLink'] || null;
      if (!nextLink) break;
    }

    return res.status(200).json({ message: `Cached ${total} properties for ${county}`, total });
  } catch (err) {
    console.error('Cache warm error:', err);
    return res.status(500).json({ error: 'Cache warm failed' });
  }
}

/* Trestle fallback helper */
async function fetchFromTrestle({ location, city, county, zip, status, minPrice, maxPrice, beds, baths, sort, limit }) {
  const filters = [];

  const counties = ['Erie', 'Crawford', 'Warren'];
  if (county && counties.map(c => c.toLowerCase()).includes(county.toLowerCase())) {
    filters.push(`CountyOrParish eq '${county}'`);
  } else {
    filters.push(`(${counties.map(c => `CountyOrParish eq '${c}'`).join(' or ')})`);
  }

  if (location) {
    if (/^\d{5}$/.test(location)) {
      filters.push(`PostalCode eq '${location}'`);
    } else if (/\d/.test(location)) {
      const safe = location.replace(/'/g, "''").toLowerCase();
      filters.push(`contains(tolower(UnparsedAddress), '${safe}')`);
    } else {
      const safe = location.replace(/'/g, "''");
      filters.push(`(contains(tolower(City), '${safe.toLowerCase()}') or contains(tolower(CountyOrParish), '${safe.toLowerCase()}'))`);
    }
  }

  if (city) filters.push(`contains(tolower(City), '${city.toLowerCase()}')`);
  if (zip) filters.push(`PostalCode eq '${zip}'`);
  if (status) {
    filters.push(`StandardStatus eq '${status}'`);
  } else {
    filters.push(`(StandardStatus eq 'Active' or StandardStatus eq 'Pending')`);
  }
  if (minPrice) filters.push(`ListPrice ge ${Number(minPrice)}`);
  if (maxPrice) filters.push(`ListPrice le ${Number(maxPrice)}`);
  if (beds) filters.push(`BedroomsTotal ge ${Number(beds)}`);
  if (baths) filters.push(`BathroomsTotalInteger ge ${Number(baths)}`);

  const orderby = {
    'price-asc': 'ListPrice asc',
    'price-desc': 'ListPrice desc',
    'newest': 'ModificationTimestamp desc',
    'sqft-desc': 'LivingArea desc',
  }[sort] || 'ModificationTimestamp desc';

  const data = await fetchTrestleOData('Property', {
    $filter: filters.join(' and '),
    $expand: 'Media',
    $top: String(limit),
    $orderby: orderby,
  });

  return {
    properties: data?.value || [],
    nextLink: data?.['@odata.nextLink'] || null,
  };
}

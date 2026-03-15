/**
 * /api/property-cache  — Cache-first property search
 *
 * GET  ?q=123+Main        → fuzzy address search (trigram)
 * GET  ?location=Erie&…   → structured search with cache → Trestle fallback
 * POST                    → manually warm the cache for a county
 */

import { NextResponse } from 'next/server';
import {
  searchCacheByAddress,
  searchCachedProperties,
  upsertListingsToCache,
  isCacheWarm,
} from '@/lib/propertyCache';
import { fetchTrestleOData } from '@/lib/trestleServer';

/* ------------------------------------------------------------------ */
/*  GET — search with cache-first strategy                             */
/* ------------------------------------------------------------------ */

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const q        = searchParams.get('q')        || '';
  const location = searchParams.get('location')  || q;
  const city     = searchParams.get('city')      || '';
  const county   = searchParams.get('county')    || '';
  const zip      = searchParams.get('zip')       || '';
  const status   = searchParams.get('status')    || '';
  const minPrice = searchParams.get('minPrice')  || '';
  const maxPrice = searchParams.get('maxPrice')  || '';
  const beds     = searchParams.get('beds')      || '';
  const baths    = searchParams.get('baths')     || '';
  const sort     = searchParams.get('sort')      || 'relevance';
  const limit    = Math.min(Number(searchParams.get('limit')) || 50, 100);

  try {
    // 1. Quick address fuzzy search if q looks like an address
    const looksLikeAddress = /\d/.test(q) && q.length >= 4;
    if (looksLikeAddress) {
      const cached = await searchCacheByAddress(q, limit);
      if (cached.properties.length > 0) {
        return NextResponse.json({
          properties: cached.properties,
          total: cached.properties.length,
          source: 'cache',
        });
      }
      // Fall through to Trestle if cache miss
    }

    // 2. Structured cache search
    const cached = await searchCachedProperties({
      location, city, county, zip, status,
      minPrice, maxPrice, beds, baths,
      sort, limit,
    });

    if (cached.properties.length > 0) {
      return NextResponse.json({
        properties: cached.properties,
        total: cached.properties.length,
        source: 'cache',
      });
    }

    // 3. Cache miss → query Trestle and backfill
    const trestleResult = await fetchFromTrestle({ location, city, county, zip, status, minPrice, maxPrice, beds, baths, sort, limit });

    // Backfill cache in background (don't block response)
    if (trestleResult.properties.length > 0) {
      upsertListingsToCache(trestleResult.properties).catch(err =>
        console.error('Background cache backfill failed:', err.message)
      );
    }

    return NextResponse.json({
      properties: trestleResult.properties,
      total: trestleResult.properties.length,
      nextLink: trestleResult.nextLink || null,
      source: 'trestle',
    });
  } catch (err) {
    console.error('Property cache search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST — warm the cache for a county                                 */
/* ------------------------------------------------------------------ */

export async function POST(request) {
  try {
    const body = await request.json();
    const county = body.county || 'Erie';
    const maxPages = Math.min(body.maxPages || 5, 20);

    const warm = await isCacheWarm(county);
    if (warm) {
      return NextResponse.json({ message: `Cache already warm for ${county}`, skipped: true });
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

    return NextResponse.json({ message: `Cached ${total} properties for ${county}`, total });
  } catch (err) {
    console.error('Cache warm error:', err);
    return NextResponse.json({ error: 'Cache warm failed' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  Trestle fallback helper                                            */
/* ------------------------------------------------------------------ */

async function fetchFromTrestle({ location, city, county, zip, status, minPrice, maxPrice, beds, baths, sort, limit }) {
  const filters = [];

  // County restriction
  const counties = ['Erie', 'Crawford', 'Warren'];
  if (county && counties.map(c => c.toLowerCase()).includes(county.toLowerCase())) {
    filters.push(`CountyOrParish eq '${county}'`);
  } else {
    filters.push(`(${counties.map(c => `CountyOrParish eq '${c}'`).join(' or ')})`);
  }

  // Location — detect zip vs address vs city
  if (location) {
    if (/^\d{5}$/.test(location)) {
      filters.push(`PostalCode eq '${location}'`);
    } else if (/\d/.test(location)) {
      // Address-like
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

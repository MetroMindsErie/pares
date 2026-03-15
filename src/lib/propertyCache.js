/**
 * Property search cache backed by Supabase with pg_trgm fuzzy search.
 *
 * Flow:
 *  1. Client searches → hits cache first via RPC (trigram similarity)
 *  2. If cache miss / stale → falls through to Trestle OData
 *  3. Trestle results are upserted back into the cache for next time
 */

import { getSupabaseAdminClient } from './supabaseAdmin';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function extractPhoto(listing) {
  if (listing.Media?.length) return listing.Media[0].MediaURL;
  if (listing.photos?.length) return listing.photos[0];
  return null;
}

/** Map a Trestle listing into the flat cache row shape */
function listingToRow(l) {
  return {
    listing_key:       l.ListingKey || l.ListingId,
    unparsed_address:  l.UnparsedAddress || [l.StreetNumber, l.StreetName, l.StreetSuffix].filter(Boolean).join(' '),
    street_number:     l.StreetNumber || null,
    street_name:       l.StreetName || null,
    street_suffix:     l.StreetSuffix || null,
    city:              l.PostalCity || l.City || null,
    county:            l.CountyOrParish || null,
    state:             l.StateOrProvince || 'PA',
    zip:               l.PostalCode || null,
    list_price:        l.ListPrice ?? l.Price ?? null,
    beds:              l.BedroomsTotal ?? l.Bedrooms ?? l.Beds ?? null,
    baths:             l.BathroomsTotalInteger ?? l.BathroomsTotal ?? l.Baths ?? null,
    living_area:       l.LivingArea ?? l.LivingAreaSqFt ?? l.SqFt ?? null,
    property_type:     l.PropertyType || null,
    standard_status:   l.StandardStatus || l.MlsStatus || null,
    special_listing_conditions: Array.isArray(l.SpecialListingConditions)
      ? l.SpecialListingConditions.join(',')
      : (l.SpecialListingConditions || null),
    latitude:          l.Latitude ?? null,
    longitude:         l.Longitude ?? null,
    primary_photo_url: extractPhoto(l),
    snapshot:          {
      ListingKey:      l.ListingKey,
      UnparsedAddress: l.UnparsedAddress,
      StreetNumber:    l.StreetNumber,
      StreetName:      l.StreetName,
      StreetSuffix:    l.StreetSuffix,
      PostalCity:      l.PostalCity || l.City,
      CountyOrParish:  l.CountyOrParish,
      PostalCode:      l.PostalCode,
      StateOrProvince: l.StateOrProvince,
      ListPrice:       l.ListPrice ?? l.Price,
      BedroomsTotal:   l.BedroomsTotal ?? l.Bedrooms,
      BathroomsTotalInteger: l.BathroomsTotalInteger ?? l.BathroomsTotal,
      LivingArea:      l.LivingArea ?? l.LivingAreaSqFt,
      StandardStatus:  l.StandardStatus || l.MlsStatus,
      SpecialListingConditions: l.SpecialListingConditions,
      PropertyType:    l.PropertyType,
      Latitude:        l.Latitude,
      Longitude:       l.Longitude,
      Media:           l.Media ? l.Media.slice(0, 5) : undefined,
      photos:          l.photos ? l.photos.slice(0, 5) : undefined,
      PublicRemarks:   l.PublicRemarks,
      YearBuilt:       l.YearBuilt,
      LotSizeArea:     l.LotSizeArea,
      GarageSpaces:    l.GarageSpaces,
    },
    modification_timestamp: l.ModificationTimestamp || null,
    updated_at: new Date().toISOString(),
  };
}

/** Convert a cache row back to the Trestle-like shape that SearchResults expects */
function rowToListing(row) {
  const snap = row.snapshot || {};
  return {
    ListingKey:        row.listing_key,
    UnparsedAddress:   row.unparsed_address,
    StreetNumber:      row.street_number,
    StreetName:        row.street_name,
    StreetSuffix:      row.street_suffix,
    PostalCity:        row.city,
    City:              row.city,
    CountyOrParish:    row.county,
    PostalCode:        row.zip,
    StateOrProvince:   row.state,
    ListPrice:         row.list_price ? Number(row.list_price) : null,
    BedroomsTotal:     row.beds,
    BathroomsTotalInteger: row.baths,
    LivingArea:        row.living_area ? Number(row.living_area) : null,
    PropertyType:      snap.PropertyType,
    StandardStatus:    row.standard_status,
    SpecialListingConditions: row.special_listing_conditions,
    Latitude:          row.latitude ? Number(row.latitude) : null,
    Longitude:         row.longitude ? Number(row.longitude) : null,
    Media:             snap.Media || (row.primary_photo_url ? [{ MediaURL: row.primary_photo_url }] : []),
    photos:            snap.photos,
    PublicRemarks:     snap.PublicRemarks,
    YearBuilt:         snap.YearBuilt,
    LotSizeArea:       snap.LotSizeArea,
    GarageSpaces:      snap.GarageSpaces,
    _fromCache:        true,
    _similarity:       row.relevance ?? row.similarity ?? null,
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Upsert an array of Trestle listings into the property cache.
 * Called after every Trestle fetch to keep cache warm.
 */
export async function upsertListingsToCache(listings) {
  const sb = getSupabaseAdminClient();
  if (!sb || !listings?.length) return;

  const rows = listings
    .filter(l => l.ListingKey || l.ListingId)
    .map(listingToRow);

  if (!rows.length) return;

  // Batch in chunks of 200
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await sb
      .from('property_search_cache')
      .upsert(batch, { onConflict: 'listing_key', ignoreDuplicates: false });

    if (error) {
      console.error('Cache upsert error:', error.message);
    }
  }
}

/**
 * Fuzzy address search powered by pg_trgm similarity.
 * Returns listings in Trestle-compatible shape.
 */
export async function searchCacheByAddress(addressQuery, limit = 25) {
  const sb = getSupabaseAdminClient();
  if (!sb || !addressQuery) return { properties: [], fromCache: false };

  const { data, error } = await sb.rpc('search_properties_by_address', {
    query_text: addressQuery,
    similarity_threshold: 0.15,
    max_results: limit,
  });

  if (error) {
    console.error('Cache address search error:', error.message);
    return { properties: [], fromCache: false };
  }

  if (!data?.length) return { properties: [], fromCache: false };

  return {
    properties: data.map(rowToListing),
    fromCache: true,
  };
}

/**
 * Full structured search against the cache.
 * Combines fuzzy address match with exact filters.
 */
export async function searchCachedProperties({
  location,
  city,
  county,
  zip,
  status,
  minPrice,
  maxPrice,
  beds,
  baths,
  sort = 'relevance',
  limit = 50,
} = {}) {
  const sb = getSupabaseAdminClient();
  if (!sb) return { properties: [], fromCache: false };

  // Determine if location looks like an address vs city/zip
  const isZip = /^\d{5}$/.test(location);
  const addressQuery = location && !isZip ? location : null;
  const filterZip = isZip ? location : (zip || null);

  const { data, error } = await sb.rpc('search_cached_properties', {
    address_query: addressQuery,
    filter_city: city || null,
    filter_county: county || null,
    filter_zip: filterZip,
    filter_status: status || null,
    min_price: minPrice ? Number(minPrice) : null,
    max_price: maxPrice ? Number(maxPrice) : null,
    min_beds: beds ? Number(beds) : null,
    min_baths: baths ? Number(baths) : null,
    sort_by: sort || 'relevance',
    max_results: limit,
  });

  if (error) {
    console.error('Cached property search error:', error.message);
    return { properties: [], fromCache: false };
  }

  if (!data?.length) return { properties: [], fromCache: false };

  return {
    properties: data.map(rowToListing),
    fromCache: true,
  };
}

/**
 * Check whether the cache has reasonably fresh data for a given county.
 */
export async function isCacheWarm(county = 'Erie') {
  const sb = getSupabaseAdminClient();
  if (!sb) return false;

  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();

  const { count, error } = await sb
    .from('property_search_cache')
    .select('id', { count: 'exact', head: true })
    .eq('county', county)
    .gte('updated_at', cutoff);

  if (error) return false;
  return (count || 0) > 10;
}

export { listingToRow, rowToListing };

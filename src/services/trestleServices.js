// /services/trestleService.js
import axios from 'axios';
import { getPrimaryPhotoUrl, getMediaUrls as getMediaUrlsFromArray } from '../utils/mediaHelpers';

// Route all Trestle calls through our Next.js server proxy so:
// 1) queries are visible in server logs, and
// 2) client never sees OAuth client credentials or bearer tokens.
const API_BASE_URL = '/api/trestle';

export async function getPropertyById(listingKey) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/odata/Property`,
      {
        params: { 
          $filter: `ListingKey eq '${listingKey}'`,
          $expand: 'Media'
        },
        headers: {
          Accept: 'application/json'
        }
      }
    );
    return response.data.value[0];
  } catch (error) {
    console.error('Error fetching property by id:', error);
    throw error;
  }
}

export async function getPropertyDetails(listingKey) {
  // Ensure we have a safe string and escape any single quotes for OData
  const rawKey = String(listingKey ?? '');
  const isNumericKey = /^\d+$/.test(rawKey);
  const escapedKey = rawKey.replace(/'/g, "''"); // OData single-quote escape

  // Auth is injected server-side by the /api/trestle proxy.
  const headers = { Accept: 'application/json' };

  // Build entity-path request but URL-encode the quoted key to avoid malformed URLs
  const entityQuoted = `'${escapedKey}'`;
  const entityPathQuoted = `${API_BASE_URL}/odata/Property(${encodeURIComponent(entityQuoted)})`;
  const entityPathNumeric = isNumericKey ? `${API_BASE_URL}/odata/Property(${rawKey})` : null;
  const filterValueQuoted = `ListingKey eq '${escapedKey}'`;
  const filterValueNumeric = isNumericKey ? `ListingKey eq ${rawKey}` : null;
  const listingIdFilterQuoted = `ListingId eq '${escapedKey}'`;
  const listingIdFilterNumeric = isNumericKey ? `ListingId eq ${rawKey}` : null;

  const attempts = [
    // 1) Entity key path (numeric key) - Active properties
    entityPathNumeric && (async () => axios.get(entityPathNumeric, { params: { $expand: 'Media' }, headers })),
    // 2) Entity key path (quoted key) - Active properties
    async () => axios.get(entityPathQuoted, { params: { $expand: 'Media' }, headers }),
    // 3) $filter by ListingKey (numeric)
    filterValueNumeric && (async () => axios.get(`${API_BASE_URL}/odata/Property`, { params: { $filter: filterValueNumeric, $top: 1, $expand: 'Media' }, headers })),
    // 4) $filter by ListingKey (quoted)
    async () => axios.get(`${API_BASE_URL}/odata/Property`, { params: { $filter: filterValueQuoted, $top: 1, $expand: 'Media' }, headers }),
    // 5) $filter by ListingId (numeric)
    listingIdFilterNumeric && (async () => axios.get(`${API_BASE_URL}/odata/Property`, { params: { $filter: listingIdFilterNumeric, $top: 1, $expand: 'Media' }, headers })),
    // 6) $filter by ListingId (quoted)
    async () => axios.get(`${API_BASE_URL}/odata/Property`, { params: { $filter: listingIdFilterQuoted, $top: 1, $expand: 'Media' }, headers }),
    // 7) ResidentialProperty endpoint - for closed/sold properties (ListingKey numeric)
    filterValueNumeric && (async () => axios.get(`${API_BASE_URL}/odata/ResidentialProperty`, { params: { $filter: filterValueNumeric, $top: 1, $expand: 'Media' }, headers })),
    // 8) ResidentialProperty endpoint - for closed/sold properties (ListingKey quoted)
    async () => axios.get(`${API_BASE_URL}/odata/ResidentialProperty`, { params: { $filter: filterValueQuoted, $top: 1, $expand: 'Media' }, headers }),
    // 9) ResidentialProperty with ListingId numeric
    listingIdFilterNumeric && (async () => axios.get(`${API_BASE_URL}/odata/ResidentialProperty`, { params: { $filter: listingIdFilterNumeric, $top: 1, $expand: 'Media' }, headers })),
    // 10) ResidentialProperty with ListingId quoted
    async () => axios.get(`${API_BASE_URL}/odata/ResidentialProperty`, { params: { $filter: listingIdFilterQuoted, $top: 1, $expand: 'Media' }, headers })
  ].filter(Boolean);

  for (let i = 0; i < attempts.length; i++) {
    try {
      const res = await attempts[i]();
      if (!res) continue;

      // axios response -> res.data
      const data = res.data;

      // If response is an entity object (entity-path) it may return the record directly
      if (data && !Array.isArray(data) && !Array.isArray(data.value) && Object.keys(data).length) {
        const candidate = data.value ? data.value[0] : data;
        if (candidate) {
          return candidate;
        }
      }

      // Standard OData collection shape
      const record = Array.isArray(data.value) && data.value.length ? data.value[0] : null;
      if (record) return record;

      console.warn(`getPropertyDetails attempt #${i + 1} returned no record for ${rawKey}`);
    } catch (err) {
      const status = err?.response?.status;
      // Log more context for debugging but keep trying other strategies
      console.warn(`getPropertyDetails attempt #${i + 1} failed for ${rawKey}:`, status || err.message);
      // continue to next attempt
      continue;
    }
  }

  // Final fallback: fetch media only so UI can still show images
  try {
    const mediaUrls = await getMediaUrls(String(rawKey));
    const mediaArray = Array.isArray(mediaUrls) ? mediaUrls : [];
    return {
      ListingKey: rawKey,
      Media: mediaArray.map(url => ({ MediaURL: url })),
      mediaArray,
      media: mediaArray[0] || '/fallback-property.jpg'
    };
  } catch (fallbackErr) {
    console.error('getPropertyDetails: fallback media fetch failed for', rawKey, fallbackErr);
    return {
      ListingKey: rawKey,
      Media: [],
      mediaArray: [],
      media: '/fallback-property.jpg'
    };
  }
}

// List queries: only the fields the result cards actually render, and at most
// 5 trimmed media records per listing instead of every photo with all fields.
// This cut a typical county search from ~12 MB to ~0.14 MB (measured 2026-07-06).
const LIST_SELECT_FIELDS = [
  'ListingKey', 'ListingId', 'UnparsedAddress', 'City', 'StateOrProvince',
  'PostalCode', 'PostalCity', 'CountyOrParish', 'ListPrice', 'ClosePrice',
  'BedroomsTotal', 'BathroomsTotalInteger', 'LivingArea', 'LotSizeAcres',
  'PropertyType', 'PropertySubType', 'StandardStatus', 'MlsStatus',
  'SpecialListingConditions', 'YearBuilt', 'Latitude', 'Longitude',
  'CloseDate', 'ModificationTimestamp', 'PublicRemarks',
].join(',');
const LIST_MEDIA_EXPAND = 'Media($select=MediaURL,Order,PreferredPhotoYN;$orderby=Order asc;$top=5)';

// trestleServices.js
export const getPropertiesByFilter = async (filterQuery, top = 9, skip = 0) => {
  try {
    const query = [
      filterQuery,
      `$top=${top}`,
      `$skip=${skip}`,
      `$select=${LIST_SELECT_FIELDS}`,
      `$expand=${LIST_MEDIA_EXPAND}`,
      '$count=true',
    ].filter(Boolean).join('&');

    const response = await fetch(`${API_BASE_URL}/odata/Property?${query}`, {
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch properties');

    const data = await response.json();
    const properties = Array.isArray(data.value) ? data.value : [];
    return {
      properties: properties.map(property => {
        // Use shared helpers to extract primary photo and all media URLs
        const mediaArray = Array.isArray(property.Media) ? property.Media : [];
        
        return {
          ...property,
          media: getPrimaryPhotoUrl(mediaArray),
          mediaArray: getMediaUrlsFromArray(mediaArray).filter(url => url !== '/fallback-property.jpg')
        };
      }),
      nextLink: data['@odata.nextLink'] || null,
      total: Number.isFinite(data['@odata.count']) ? data['@odata.count'] : null
    };
  } catch (error) {
    console.error('Error in getPropertiesByFilter:', error);
    throw error;
  }
};

// Function to fetch the next set of properties using the nextLink
// export const getNextProperties = async (nextLink) => {
//   try {
//     const response = await fetch(nextLink, {
//       headers: {
//         Authorization: `Bearer ${await fetchToken()}`,
//         Accept: 'application/json'
//       }
//     });

//     if (!response.ok) throw new Error('Failed to fetch properties');

//     const data = await response.json();
//     const properties = Array.isArray(data.value) ? data.value : [];
//     return {
//       properties: properties.map(property => ({
//         ...property,
//         media: property.Media?.[0]?.MediaURL || '/fallback-property.jpg'
//       })),
//       nextLink: data['@odata.nextLink'] || null
//     };
//   } catch (error) {
//     console.error('Error in getNextProperties:', error);
//     throw error;
//   }
// };

export async function getMediaUrls(listingKey) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/odata/Media`,
        {
          params: {
            $filter: `ResourceRecordKey eq '${listingKey}' and MediaCategory eq 'Photo'`,
            $orderby: 'Order',
            $select: 'MediaURL'
          },
          headers: {
            Accept: 'application/json'
          }
        }
      );
  
      // Log the raw URL for debugging

  
      // If the API returns complete URLs, simply map over them:
      return response.data.value
        .map((media) => media.MediaURL)
        .filter(url => !!url);
    } catch (error) {
      console.error('Error fetching media URLs:', error);
      return [];
    }
  }

  export const fetchCountyNames = async () => {
    const response = await fetch(`${API_BASE_URL}/odata/Lookup`, { headers: { Accept: 'application/json' } });
    const data = await response.json();
    const counties = data.value
      .filter(item => item.LookupType === 'CountyOrParish' && ['Erie', 'Crawford', 'Warren'].includes(item.LookupValue))
      .map(item => item.LookupValue);
    return counties;
  };

  export const fetchMediaUrls = async (listingKey) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/odata/Media`,
        {
          params: {
            $filter: `ResourceRecordKey eq '${listingKey}'`,
            $orderby: 'Order',
            $select: 'MediaURL',
          },
          headers: {
            Accept: 'application/json',
          },
        }
      );
      return response.data.value.map((media) => media.MediaURL);
    } catch (error) {
      console.error('Error fetching media:', error);
      return [];
    }
  };

  // Trestle API integration for property search

// --- helper utilities for building safer OData filters ---
const ALLOWED_COUNTIES = ['Erie', 'Warren', 'Crawford'];

const odataEscape = (val) => {
  if (val === undefined || val === null) return '';
  // Escape single quote for OData by doubling it
  return String(val).replace(/'/g, "''");
};

const isZip = (s) => /^\d{5}$/.test(s);
const isProbableAddress = (s) => {
  if (!s) return false;
  const trimmed = s.trim();
  // simple heuristic: starts with a number (street number) OR contains common street suffixes
  const startsWithNumber = /^\d+\s+/.test(trimmed);
  const streetSuffixes = /\b(st|street|ave|avenue|rd|road|blvd|lane|ln|drive|dr|court|ct|way|place|pl|terrace|trl)\b/i;
  return startsWithNumber || streetSuffixes.test(trimmed);
};

// --- new: generate address variants (directionals and street type abbreviations) ---
const DIRECTIONS = [
  ['north', 'n'],
  ['south', 's'],
  ['east', 'e'],
  ['west', 'w'],
  ['northeast', 'ne'],
  ['northwest', 'nw'],
  ['southeast', 'se'],
  ['southwest', 'sw']
];

const STREET_TYPES = [
  ['street','st'],
  ['avenue','ave'],
  ['road','rd'],
  ['boulevard','blvd'],
  ['lane','ln'],
  ['drive','dr'],
  ['court','ct'],
  ['place','pl'],
  ['terrace','ter'],
  ['trail','trl'],
  ['circle','cir'],
  ['square','sq']
];

const generateVariants = (input) => {
  if (!input) return [''];
  const base = input.toLowerCase().trim();
  const variants = new Set([base]);

  const replaceWord = (str, from, to) => str.replace(new RegExp(`\\b${from}\\b`, 'g'), to);

  // Apply direction and street-type replacements iteratively to build variants
  [...DIRECTIONS, ...DIRECTIONS.map(d => [d[1], d[0]]), ...STREET_TYPES, ...STREET_TYPES.map(s => [s[1], s[0]])]
    .forEach(([from, to]) => {
      Array.from(variants).forEach(v => {
        if (v.includes(from)) {
          variants.add(replaceWord(v, from, to));
        }
      });
    });

  // also add variants with periods for single-letter directions (e.g., "e" -> "e.")
  Array.from(variants).forEach(v => {
    DIRECTIONS.forEach(([full, abbr]) => {
      if (v.includes(` ${abbr} `) || v.startsWith(`${abbr} `) || v.endsWith(` ${abbr}`)) {
        variants.add(v.replace(new RegExp(`\\b${abbr}\\b`, 'g'), `${abbr}.`));
      }
      if (v.includes(`${abbr}.`)) {
        variants.add(v.replace(new RegExp(`\\b${abbr}\\.\\b`, 'g'), abbr));
      }
    });
  });

  return Array.from(variants);
};

/** Fire-and-forget: send Trestle results to the server-side cache */
function backfillCache(properties) {
  if (!properties?.length) return;
  fetch('/api/property-cache/backfill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listings: properties }),
  }).catch(() => {}); // silent
}

/** Try the Supabase property cache (trigram fuzzy search) first */
async function tryCacheSearch(searchParams) {
  try {
    const params = new URLSearchParams();
    if (searchParams.location)  params.set('q', searchParams.location);
    if (searchParams.status)    params.set('status', searchParams.status);
    if (searchParams.minPrice)  params.set('minPrice', searchParams.minPrice);
    if (searchParams.maxPrice)  params.set('maxPrice', searchParams.maxPrice);
    if (searchParams.beds)      params.set('beds', searchParams.beds);
    if (searchParams.baths)     params.set('baths', searchParams.baths);
    if (searchParams.sort)      params.set('sort', searchParams.sort);
    if (searchParams.mlsAreaMajor) params.set('county', searchParams.mlsAreaMajor);
    params.set('limit', '50');

    const resp = await fetch(`/api/property-cache?${params.toString()}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.properties?.length > 0) return data;
    return null;
  } catch {
    return null;
  }
}

export const searchProperties = async (searchParams) => {
  try {
    // --- Cache-first ONLY for address-like queries (not zips, not city names) ---
    const loc = searchParams.location || '';
    const isZipCode = /^\d{5}$/.test(loc.trim());
    const looksLikeAddress = !isZipCode && /^\d+\s+\S/.test(loc.trim());
    if (looksLikeAddress) {
      const cached = await tryCacheSearch(searchParams);
      if (cached && cached.properties.length > 0) {
        return {
          properties: cached.properties,
          nextLink: null,
          total: cached.properties.length,
        };
      }
    }

    const filters = [];
    // NOTE: Per /odata/$metadata, SpecialListingConditions is a Flags Enum:
    // Type="Cotality.DataStandard.RESO.DD.Enums.Multi.SpecialListingConditions" IsFlags="true"
    // Filtering must use Enum literals + `has`, not string functions.
    const SPECIAL_LISTING_CONDITIONS_ENUM = 'Cotality.DataStandard.RESO.DD.Enums.Multi.SpecialListingConditions';
    const specialListingEnumMap = {
      // common aliases -> enum member identifiers
      'REO': 'RealEstateOwned',
      'Real Estate Owned': 'RealEstateOwned',
      'RealEstateOwned': 'RealEstateOwned',

      'Short Sale': 'ShortSale',
      'ShortSale': 'ShortSale',

      'Foreclosure': 'InForeclosure',
      'In Foreclosure': 'InForeclosure',
      'InForeclosure': 'InForeclosure',

      'Auction': 'Auction',

      'Probate': 'ProbateListing',
      'Probate Listing': 'ProbateListing',
      'ProbateListing': 'ProbateListing',

      'Bankruptcy': 'BankruptcyProperty',
      'Bankruptcy Property': 'BankruptcyProperty',
      'BankruptcyProperty': 'BankruptcyProperty',

      'HUD': 'HudOwned',
      'HUD Owned': 'HudOwned',
      'HudOwned': 'HudOwned',

      'NOD': 'NoticeOfDefault',
      'Notice Of Default': 'NoticeOfDefault',
      'NoticeOfDefault': 'NoticeOfDefault',

      'Standard': 'Standard',
      'Third Party Approval': 'ThirdPartyApproval',
      'ThirdPartyApproval': 'ThirdPartyApproval',
      'Trust': 'Trust'
    };

    const resolveSpecialListingEnumMember = (rawValue) => {
      if (!rawValue) return '';
      const direct = specialListingEnumMap[rawValue];
      if (direct) return direct;

      const needle = String(rawValue).trim().toLowerCase();
      const matchKey = Object.keys(specialListingEnumMap).find(
        (k) => String(k).trim().toLowerCase() === needle
      );
      return matchKey ? specialListingEnumMap[matchKey] : '';
    };

    // Always limit to MLS counties (MLS only contains Erie, Warren, Crawford)
    const countyClause = `(${ALLOWED_COUNTIES.map(c => `CountyOrParish eq '${odataEscape(c)}'`).join(' or ')})`;

    // Normalize user input
    const rawLocation = (searchParams.location || '').trim();

    // STATUS + sold timeline handling (kept similar to previous logic)
    if (searchParams.status) {
      filters.push(`StandardStatus eq '${odataEscape(searchParams.status)}'`);
      if (searchParams.status === 'Closed' && searchParams.soldWithin) {
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - parseInt(searchParams.soldWithin, 10));
        const formattedToday = today.toISOString().split('T')[0];
        const formattedPastDate = pastDate.toISOString().split('T')[0];
        filters.push(`CloseDate ge ${formattedPastDate} and CloseDate le ${formattedToday}`);
      }
    }

    // LOCATION handling (zip / address / county/city)
    if (rawLocation) {
      if (isZip(rawLocation)) {
        // Exact postal code match
        filters.push(`PostalCode eq '${odataEscape(rawLocation)}'`);
      } else if (isProbableAddress(rawLocation)) {
        // Generate variants to match "E" vs "East", "St" vs "Street", etc.
        const fullVariants = generateVariants(rawLocation);
        // IMPORTANT: lowercase variants since we compare with tolower()
        const escapedFullVariants = fullVariants.map(v => odataEscape(v.toLowerCase()));

        // Build unparsed exact equality OR clauses for variants
        const unparsedExactClauses = escapedFullVariants
          .map(v => `tolower(UnparsedAddress) eq '${v}'`)
          .join(' or ');

        // Build unparsed contains() OR clauses for variants
        const unparsedContainsClauses = escapedFullVariants
          .map(v => `contains(tolower(UnparsedAddress), '${v}')`)
          .join(' or ');

        // If the user started with a number, try StreetNumber + StreetName variants
        const parts = rawLocation.split(/\s+/);
        const firstToken = parts[0];
        let streetNumberClause = null;
        if (/^\d+$/.test(firstToken) && parts.length > 1) {
          const streetNumber = odataEscape(firstToken);
          const streetNameRaw = parts.slice(1).join(' ');
          const streetNameVariants = generateVariants(streetNameRaw);
          const escapedStreetNameVariants = streetNameVariants.map(v => odataEscape(v.toLowerCase()));
          const streetNameContains = escapedStreetNameVariants
            .map(v => `contains(tolower(StreetName), '${v}')`)
            .join(' or ');
          streetNumberClause = `(StreetNumber eq '${streetNumber}' and (${streetNameContains}))`;
        }

        // Combine all generated address sub-clauses
        const addressSubClauses = [
          unparsedExactClauses ? `(${unparsedExactClauses})` : null,
          unparsedContainsClauses ? `(${unparsedContainsClauses})` : null,
          streetNumberClause
        ].filter(Boolean);

        filters.push(`(${addressSubClauses.join(' or ')})`);
      } else {
        // Treat as county / city / general text search
        const escapedLower = odataEscape(rawLocation.toLowerCase());
        filters.push(`(contains(tolower(City), '${escapedLower}') or contains(tolower(CountyOrParish), '${escapedLower}') or contains(tolower(UnparsedAddress), '${escapedLower}'))`);
      }
    }

    // Price, beds, baths, property type, sqft (same as before but with escaping where applicable)
    if (searchParams.minPrice) {
      filters.push(`ListPrice ge ${parseInt(searchParams.minPrice, 10)}`);
    }
    if (searchParams.maxPrice) {
      filters.push(`ListPrice le ${parseInt(searchParams.maxPrice, 10)}`);
    }
    if (searchParams.beds) {
      filters.push(`BedroomsTotal ge ${parseInt(searchParams.beds, 10)}`);
    }
    if (searchParams.baths) {
      filters.push(`BathroomsTotalInteger ge ${parseInt(searchParams.baths, 10)}`);
    }
    if (searchParams.propertyType) {
      let propertyTypeFilter = searchParams.propertyType.toLowerCase();
      
      // Map user-friendly property type values to Trestle enum values (no spaces)
      if (propertyTypeFilter === 'residential') {
        filters.push(`PropertyType eq 'Residential'`);
      } else if (propertyTypeFilter === 'commercial') {
        // For commercial, match both Commercial Sale and Commercial Lease
        filters.push(`(PropertyType eq 'CommercialSale' or PropertyType eq 'CommercialLease')`);
      } else if (propertyTypeFilter === 'land') {
        filters.push(`PropertyType eq 'Land'`);
      } else if (propertyTypeFilter === 'multi-family') {
        filters.push(`PropertyType eq 'ResidentialIncome'`);
      } else if (propertyTypeFilter === 'farm') {
        filters.push(`PropertyType eq 'Farm'`);
      }
    }
    const rawSpecialCondition = searchParams.specialListingConditions
      ? String(searchParams.specialListingConditions).trim()
      : '';
    const specialEnumMember = resolveSpecialListingEnumMember(rawSpecialCondition);

    // Add server-side filter for Special Listing Conditions (Flags Enum)
    if (specialEnumMember) {
      filters.push(
        `SpecialListingConditions has ${SPECIAL_LISTING_CONDITIONS_ENUM}'${specialEnumMember}'`
      );
    }

    if (searchParams.minSqFt) {
      filters.push(`LivingArea ge ${parseInt(searchParams.minSqFt, 10)}`);
    }
    if (searchParams.maxSqFt) {
      filters.push(`LivingArea le ${parseInt(searchParams.maxSqFt, 10)}`);
    }

    // MLS Area Major filter - uses contains to match the area name value (e.g., "Erie Northeast")
    // MLSAreaMajor values in the data have format like "5 - Erie Northeast", so we search by the value portion
    if (searchParams.mlsAreaMajor) {
      const escapedArea = odataEscape(searchParams.mlsAreaMajor);
      filters.push(`contains(MLSAreaMajor, '${escapedArea}')`);
    }

    // MLS Area Minor filter (if available in the data)
    if (searchParams.mlsAreaMinor) {
      const escapedAreaMinor = odataEscape(searchParams.mlsAreaMinor);
      filters.push(`contains(MLSAreaMinor, '${escapedAreaMinor}')`);
    }

    // Ensure county limitation is always applied (avoid returning outside-MLS results)
    filters.push(countyClause);

    // Build the filter query string
    const filterQuery = filters.length > 0 ? `$filter=${filters.join(' and ')}` : '';

    // Build OData $orderby based on sort parameter
    let orderbyClause = '';
    if (searchParams.sort) {
      switch (searchParams.sort) {
        case 'price-asc':
          orderbyClause = '&$orderby=ListPrice asc';
          break;
        case 'price-desc':
          orderbyClause = '&$orderby=ListPrice desc';
          break;
        case 'newest':
          orderbyClause = '&$orderby=ModificationTimestamp desc';
          break;
        case 'sqft-desc':
          orderbyClause = '&$orderby=LivingArea desc';
          break;
        default:
          orderbyClause = '&$orderby=ListPrice asc';
      }
    }

    // Always order server-side — pagination is meaningless on an unordered set.
    const fullQuery = filterQuery + (orderbyClause || '&$orderby=ListPrice asc');
    // 60 per page: fast first paint; "load more" follows @odata.nextLink.
    const response = await getPropertiesByFilter(fullQuery, 60, 0);

    // Format results (server already sorted if $orderby was provided)
    let formattedProperties = response.properties
      .map(property => ({
        ...property,
        media: property.media,
        mediaArray: property.mediaArray
      }));

    // Backfill the DB cache with fresh Trestle data
    backfillCache(formattedProperties);

    return {
      properties: formattedProperties,
      nextLink: response.nextLink,
      total: response.total ?? formattedProperties.length
    };
  } catch (error) {
    console.error('Error searching properties:', error);

    // On Trestle failure, try cache as fallback
    try {
      const cached = await tryCacheSearch(searchParams);
      if (cached && cached.properties.length > 0) {
        return { properties: cached.properties, nextLink: null, total: cached.properties.length };
      }
    } catch {}

    throw new Error('Failed to search properties');
  }
};

export const getNextProperties = async (nextLink) => {
  try {
    if (!nextLink) return { properties: [], nextLink: null };
    
    // Extract the query part from the next link
    const urlParts = nextLink.split('?');
    if (urlParts.length < 2) {
      throw new Error('Invalid next link format');
    }

    // Make sure we're requesting Media expansion in the query
    let queryParams = urlParts[1];
    if (!queryParams.includes('$expand=Media')) {
      queryParams += queryParams.includes('?') ? '&$expand=Media' : '?$expand=Media';
    }
    
    const response = await fetch(`${API_BASE_URL}/odata/Property?${queryParams}`, {
      headers: {
        Accept: 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const properties = Array.isArray(data.value) ? data.value : [];

    return {
      properties: properties.map(property => {
        let mediaArray = [];
        if (property.Media && Array.isArray(property.Media)) {
          mediaArray = property.Media
            .slice()
            .sort((a, b) => {
              if (a.Order !== undefined && b.Order !== undefined) {
                return a.Order - b.Order;
              }
              return 0;
            })
            .map(mediaItem => mediaItem.MediaURL)
            .filter(url => !!url);
        }
        return {
          ...property,
          media: mediaArray.length > 0 ? mediaArray[0] : '/fallback-property.jpg',
          mediaArray: mediaArray
        };
      }),
      nextLink: data['@odata.nextLink'] || null
    };
  } catch (error) {
    console.error('Error fetching next properties:', error);
    throw error;
  }
};

// In the property processing function, ensure media is properly structured
const processProperty = (property) => {
  // Ensure media array is properly ordered with display image first
  if (property.Media && Array.isArray(property.Media)) {
    // Sort media to ensure the main/featured image comes first
    property.media = property.Media.sort((a, b) => {
      // If there's an Order field, use it
      if (a.Order !== undefined && b.Order !== undefined) {
        return a.Order - b.Order;
      }
      // Otherwise maintain original order (first is primary)
      return 0;
    }).map(mediaItem => mediaItem.MediaURL || mediaItem.url || mediaItem);
  } else if (property.Media) {
    property.media = [property.Media];
  }
};

// Optional small export helper for candidate mapping (used by future integrations).
// mapSearchResultsToCandidates(list) can be reused in dashboard if you want to
// pass current results alongside historical context to AI again.
export function mapSearchResultsToCandidates(list = []) {
  return list.slice(0, 25).map(p => ({
    listing_id: p.ListingKey,
    city: p.City,
    neighborhood: p.SubdivisionName || p.Subdivision || p.Neighborhood || null,
    price: p.ListPrice || p.ClosePrice || null,
    bedrooms: p.BedroomsTotal || null,
    bathrooms: p.BathroomsTotalInteger || null,
    property_type: (p.PropertyType || '').toLowerCase(),
    highlights: [
      p.HasBasement ? 'basement' : null,
      p.HasFireplace ? 'fireplace' : null,
      p.HasGarage ? 'garage' : null,
      p.HasPool ? 'pool' : null
    ].filter(Boolean)
  }));
}

/**
 * Fetch all properties listed by a specific agent
 * @param {object} options - Configuration options
 * @param {string} options.email - Agent email (preferred filter method)
 * @param {string} options.name - Agent full name (fallback filter method)
 * @param {number} options.limit - Maximum number of properties to return (default: 100)
 * @returns {Promise<Array>} Array of property objects with agent's listings
 */
export async function getAgentProperties(options = {}) {
  try {
    let filter = null;
    
    // Prefer email filter as it's more reliable
    if (options.email) {
      const escapedEmail = String(options.email).replace(/'/g, "''");
      filter = `ListAgentEmail eq '${escapedEmail}'`;
    } else if (options.name) {
      const escapedName = String(options.name).replace(/'/g, "''");
      filter = `ListAgentFullName eq '${escapedName}'`;
    } else {
      throw new Error('Either email or name is required');
    }

    const limit = options.limit || 100;

    const response = await axios.get(`${API_BASE_URL}/odata/Property`, {
      params: {
        $filter: filter,
        $top: limit,
        $select: LIST_SELECT_FIELDS,
        $expand: LIST_MEDIA_EXPAND,
        $orderby: 'ModificationTimestamp desc'
      },
      headers: {
        Accept: 'application/json'
      }
    });

    const properties = Array.isArray(response.data.value) ? response.data.value : [];
    
    return properties.map(property => {
      const mediaArray = Array.isArray(property.Media) ? property.Media : [];
      
      return {
        ...property,
        media: getPrimaryPhotoUrl(mediaArray),
        mediaArray: getMediaUrlsFromArray(mediaArray).filter(url => url !== '/fallback-property.jpg')
      };
    });
  } catch (error) {
    console.error('Error fetching agent properties:', error);
    return [];
  }
}


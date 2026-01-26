// /services/trestleService.js
import axios from 'axios';
import { getPrimaryPhotoUrl, getMediaUrls as getMediaUrlsFromArray } from '../utils/mediaHelpers';

// Route all Trestle calls through our Next.js server proxy so:
// 1) queries are visible in server logs, and
// 2) client never sees OAuth client credentials or bearer tokens.
const API_BASE_URL = '/api/trestle';

export const fetchToken = async () => {
  try {
    const response = await axios.post('/api/token');
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching token:', error);
    throw new Error('Failed to fetch token');
  }
};

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

  const token = await fetchToken().catch(err => {
    console.warn('fetchToken failed in getPropertyDetails:', err);
    return null;
  });

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: 'application/json'
  };

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

// trestleServices.js
export const getPropertiesByFilter = async (filterQuery, top = 9, skip = 0) => {
  try {
    const response = await fetch(`${API_BASE_URL}/odata/Property?${filterQuery}&$top=${top}&$skip=${skip}&$expand=Media`, {
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
      nextLink: data['@odata.nextLink'] || null
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

export const searchProperties = async (searchParams) => {
  try {
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
        const escapedFullVariants = fullVariants.map(v => odataEscape(v));

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
          const escapedStreetNameVariants = streetNameVariants.map(v => odataEscape(v));
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
      filters.push(`PropertyType eq '${odataEscape(searchParams.propertyType)}'`);
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

    // Ensure county limitation is always applied (avoid returning outside-MLS results)
    filters.push(countyClause);

    // Build the filter query string
    const filterQuery = filters.length > 0 ? `$filter=${filters.join(' and ')}` : '';

    // Reuse getPropertiesByFilter which already handles $top/$skip/$expand and media processing
    const response = await getPropertiesByFilter(filterQuery, 50, 0);

    // Format and sort results for the UI (ascending price)
    let formattedProperties = response.properties
      .map(property => ({
        ...property,
        media: property.media,
        mediaArray: property.mediaArray
      }))
      .sort((a, b) => {
        const priceA = a.ListPrice || 0;
        const priceB = b.ListPrice || 0;
        return priceA - priceB;
      });

    return {
      properties: formattedProperties,
      nextLink: response.nextLink,
      total: formattedProperties.length
    };
  } catch (error) {
    console.error('Error searching properties:', error);
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
// (No change needed; localContextService uses fetchToken)
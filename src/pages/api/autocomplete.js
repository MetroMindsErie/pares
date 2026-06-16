import { getTrestleToken, buildTrestleODataUrl } from '../../lib/trestleServer';
import { searchCacheByAddress } from '../../lib/propertyCache';
import { edgeHandler } from '../../lib/edgeHandler';


// Known cities/townships in GEBOR MLS tri-county area
const AREA_CITIES = [
  // Erie County
  'Erie', 'Millcreek', 'Harborcreek', 'Fairview', 'North East', 'Girard',
  'Edinboro', 'Waterford', 'Corry', 'Union City', 'Lake City', 'Wesleyville',
  'Lawrence Park', 'McKean', 'Albion', 'Cranesville', 'Elgin', 'Wattsburg',
  'Mill Village', 'Summit', 'Greene', 'Venango', 'Platea',
  // Crawford County
  'Meadville', 'Titusville', 'Conneaut Lake', 'Conneautville', 'Saegertown',
  'Cambridge Springs', 'Linesville', 'Springboro', 'Cochranton', 'Venango',
  'Townville', 'Centerville', 'Spartansburg', 'Guys Mills', 'Harmonsburg',
  // Warren County
  'Warren', 'Youngsville', 'Sheffield', 'Tidioute', 'Clarendon', 'Sugar Grove',
  'Russell', 'Bear Lake', 'Columbus', 'Pittsfield', 'Spring Creek', 'Irvine',
  'Chandlers Valley', 'Lottsville', 'Grand Valley',
];

const COUNTIES = ['Erie', 'Crawford', 'Warren'];

const ZIP_CODES = [
  // Erie County ZIPs (matched to Zillow)
  '16509','16510','16506','16504','16503','16508','16505','16502','16428','16511',
  '16412','16441','16407','16507','16417','16415','16438','16533','16401','16532',
  '16554','16423','16426','16501','16442','16421','16410','16411','16443','16546',
  '16430','16565','16563','16427','16534','16413','16444','16475','16512','16514',
  '16515','16522','16530','16531','16538','16541','16544','16550','16553',
  // Crawford County ZIPs (matched to Zillow)
  '16335','16354','16403','16314','16316','16424','16433','16134','16404','16406',
  '16434','16327','16435','16111','16360','16131','16440','16110','16328','16388',
  '16422','16432',
  // Warren County ZIPs (matched to Zillow)
  '16365','16345','16371','16350','16347','16340','16313','16351','16405','16436',
  '16402','16420','16329','16312','16352','16366','16367','16368','16369','16416',
];

// Escape OData single quotes
function odataEscape(val) {
  return String(val || '').replace(/'/g, "''");
}

export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const q = (req.query.q || '').trim();

    if (q.length < 2) {
      return res.status(200).json({ suggestions: [] });
    }

    const lower = q.toLowerCase();
    const suggestions = [];

    // 1) Match counties
    COUNTIES.forEach(county => {
      if (county.toLowerCase().includes(lower)) {
        suggestions.push({
          type: 'county',
          label: `${county} County, PA`,
          value: county,
          searchValue: county,
        });
      }
    });

    // 2) Match cities/townships
    AREA_CITIES.forEach(city => {
      if (city.toLowerCase().includes(lower)) {
        suggestions.push({
          type: 'city',
          label: `${city}, PA`,
          value: city,
          searchValue: city,
        });
      }
    });

    // 3) Match ZIP codes
    if (/^\d{1,5}$/.test(q)) {
      ZIP_CODES.forEach(zip => {
        if (zip.startsWith(q)) {
          suggestions.push({
            type: 'zip',
            label: `${zip}`,
            value: zip,
            searchValue: zip,
          });
        }
      });
    }

    // 4) Address lookup — try DB cache first (trigram), then Trestle
    const isAddressLike = /^\d+\s+/.test(q) || (q.length >= 3 && !/^\d+$/.test(q));
    if (isAddressLike && !COUNTIES.some(c => c.toLowerCase() === lower)) {
      const seen = new Set();

      // 4a) Fast: query Supabase property_search_cache via pg_trgm
      try {
        const cached = await searchCacheByAddress(q, 8);
        (cached.properties || []).forEach(prop => {
          const addr = prop.UnparsedAddress || '';
          const city = prop.PostalCity || prop.City || '';
          const zip = prop.PostalCode || '';
          const fullAddr = `${addr}, ${city}, PA ${zip}`.trim();
          const key = fullAddr.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            suggestions.push({
              type: 'address',
              label: fullAddr,
              value: addr,
              searchValue: addr,
              city,
              zip,
              county: prop.CountyOrParish,
              listingKey: prop.ListingKey,
            });
          }
        });
      } catch (cacheErr) {
        console.warn('Autocomplete cache lookup failed:', cacheErr.message);
      }

      // 4b) If cache didn't provide enough results, supplement from Trestle
      if (suggestions.filter(s => s.type === 'address').length < 4) {
        try {
          const token = await getTrestleToken();
          const escaped = odataEscape(lower);

          const countyFilter = "(CountyOrParish eq 'Erie' or CountyOrParish eq 'Crawford' or CountyOrParish eq 'Warren')";
          const addressFilter = `contains(tolower(UnparsedAddress), '${escaped}')`;
          const filter = `${addressFilter} and ${countyFilter}`;

          const url = buildTrestleODataUrl('odata/Property', {
            $filter: filter,
            $select: 'UnparsedAddress,PostalCity,StateOrProvince,PostalCode,CountyOrParish,ListingKey',
            $top: '8',
            $orderby: 'ModificationTimestamp desc',
          });

          const response = await fetch(url.toString(), {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            cache: 'no-store',
          });

          if (response.ok) {
            const data = await response.json();
            (data.value || []).forEach(prop => {
              const addr = prop.UnparsedAddress || '';
              const city = prop.PostalCity || '';
              const zip = prop.PostalCode || '';
              const fullAddr = `${addr}, ${city}, PA ${zip}`.trim();
              const key = fullAddr.toLowerCase();
              if (!seen.has(key)) {
                seen.add(key);
                suggestions.push({
                  type: 'address',
                  label: fullAddr,
                  value: addr,
                  searchValue: addr,
                  city,
                  zip,
                  county: prop.CountyOrParish,
                  listingKey: prop.ListingKey,
                });
              }
            });
          }
        } catch (apiErr) {
          console.warn('Autocomplete Trestle lookup failed:', apiErr.message);
        }
      }
    }

    // Deduplicate and limit
    const seen = new Set();
    const unique = suggestions.filter(s => {
      const key = `${s.type}:${s.label.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort: addresses first, then cities, then counties, then zips
    const typeOrder = { address: 0, city: 1, county: 2, zip: 3 };
    unique.sort((a, b) => (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9));

    return res.status(200).json({ suggestions: unique.slice(0, 12) });
  } catch (error) {
    console.error('Autocomplete error:', error);
    return res.status(200).json({ suggestions: [] });
  }
}

);

export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getTrestleToken, buildTrestleODataUrl } from '../../../lib/trestleServer';
import { searchCacheByAddress } from '../../../lib/propertyCache';

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
  // Erie County ZIPs
  '16501','16502','16503','16504','16505','16506','16507','16508','16509','16510',
  '16511','16512','16514','16515','16522','16530','16531','16534','16538','16541',
  '16544','16546','16550','16553','16563','16565','16401','16403','16407','16410',
  '16411','16412','16415','16417','16421','16422','16423','16426','16428','16430',
  '16432','16433','16434','16435','16436','16438','16440','16441','16442','16443',
  '16444',
  // Crawford County ZIPs
  '16335','16314','16316','16317','16319','16323','16327','16329','16332','16340',
  '16341','16342','16344','16345','16346','16347','16350','16351','16352','16354',
  '16360','16362','16364','16365','16370','16371','16372','16373','16374',
  // Warren County ZIPs
  '16365','16301','16311','16321','16326','16328','16334','16343','16353','16361',
  '16366','16367','16369','16375',
];

// Escape OData single quotes
function odataEscape(val) {
  return String(val || '').replace(/'/g, "''");
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (q.length < 2) {
      return NextResponse.json({ suggestions: [] });
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

    return NextResponse.json({ suggestions: unique.slice(0, 12) });
  } catch (error) {
    console.error('Autocomplete error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}

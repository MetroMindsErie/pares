import axios from 'axios';

// Route through the server-side proxy — auth is injected there, the client never sees tokens.
const API_BASE_URL = '/api/trestle';

/**
 * Fetch extended neighborhood + school context for a listing.
 * Select only needed fields for performance.
 */
export async function fetchLocalContext(listingKey) {
  if (!listingKey) return null;
  const key = String(listingKey).replace(/'/g, "''");
  const headers = { Accept: 'application/json' };

  // Request a slim projection
  const params = {
    $filter: `ListingKey eq '${key}'`,
    $select: [
      'ListingKey',
      'SubdivisionName',
      'Subdivision',
      'Neighborhood',
      'CommunityFeatures',
      'AssociationAmenities',
      'LotFeatures',
      'ElementarySchool',
      'MiddleOrJuniorSchool',
      'HighSchool',
      'SchoolDistrict',
      'HighSchoolDistrict',
      'TaxAnnualAmount'
    ].join(','),
  };

  try {
    const res = await axios.get(`${API_BASE_URL}/odata/Property`, { params, headers });
    const value = Array.isArray(res.data?.value) ? res.data.value[0] : null;
    if (!value) return null;

    return {
      listingKey: value.ListingKey,
      subdivision: value.SubdivisionName || value.Subdivision || value.Neighborhood || null,
      communityFeatures: toList(value.CommunityFeatures),
      associationAmenities: toList(value.AssociationAmenities),
      lotFeatures: toList(value.LotFeatures),
      schools: {
        district: value.SchoolDistrict || value.HighSchoolDistrict || null,
        elementary: value.ElementarySchool || null,
        middle: value.MiddleOrJuniorSchool || null,
        high: value.HighSchool || null
      },
      taxAnnualAmount: value.TaxAnnualAmount || null
    };
  } catch (err) {
    console.warn('fetchLocalContext failed', err?.response?.status, err.message);
    return null;
  }
}

// Accept array or comma/semicolon-delimited string
function toList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  return String(raw)
    .split(/[,;]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

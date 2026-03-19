/**
 * PDF template generator for saved property listings.
 * Builds a self-contained HTML document and triggers the browser's
 * native "Save as PDF" / print dialog via a hidden iframe.
 *
 * Usage:
 *   import { buildPropertyPdfHtml, printPropertyPdf } from '../utils/pdfTemplate';
 *   printPropertyPdf(property);          // triggers print dialog
 *   const html = buildPropertyPdfHtml(property); // just the HTML string
 */

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const num = (v) => { if (v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const fmt = (v) => { const n = num(v); return n != null ? n.toLocaleString() : null; };
const money = (v) => { const n = num(v); return n != null ? `$${n.toLocaleString()}` : null; };

/** Case-insensitive multi-key field picker (same logic as CompareModal) */
function getField(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
    // case-insensitive fallback
    const lower = Object.keys(obj).find((x) => x.toLowerCase() === k.toLowerCase());
    if (lower && obj[lower] !== undefined && obj[lower] !== null && obj[lower] !== '') return obj[lower];
  }
  return undefined;
}

function asList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  return String(raw).split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
}

function formatValue(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (Array.isArray(raw)) { const items = raw.filter(Boolean).map(String); return items.length ? items.join(', ') : null; }
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
  return String(raw);
}

/* ------------------------------------------------------------------ */
/*  extractDetails (still used by SavedProperties.js detail panel)     */
/* ------------------------------------------------------------------ */

export function extractDetails(property) {
  const d = property.property_data && typeof property.property_data === 'object' ? property.property_data : property;
  return {
    beds: d.BedroomsTotal ?? d.Bedrooms ?? null,
    baths: d.BathroomsTotalInteger ?? d.BathroomsFull ?? null,
    sqft: d.LivingArea ?? d.LivingAreaSqFt ?? null,
    lotSize: d.LotSizeAcres ?? d.LotSizeArea ?? null,
    lotUnits: d.LotSizeUnits || (d.LotSizeAcres ? 'acres' : ''),
    yearBuilt: d.YearBuilt ?? null,
    type: d.PropertyType ?? d.PropertySubType ?? null,
    garage: d.GarageSpaces ?? d.ParkingTotal ?? null,
    stories: d.Stories ?? d.StoriesTotal ?? null,
    taxes: d.TaxAnnualAmount ?? null,
    dom: d.DaysOnMarket ?? d.CumulativeDaysOnMarket ?? null,
    mls: d.ListingKey ?? d.ListingId ?? property.listing_key ?? null,
    city: d.City ?? null,
    state: d.StateOrProvince ?? null,
    zip: d.PostalCode ?? null,
    county: d.CountyOrParish ?? null,
    cooling: d.Cooling ?? null,
    heating: d.Heating ?? null,
    basement: d.HasBasement ?? null,
    hoa: d.AssociationFee ?? null,
    hoaFreq: d.AssociationFeeFrequency ?? null,
    remarks: d.PublicRemarks ?? null,
    elemSchool: d.ElementarySchool ?? null,
    midSchool: d.MiddleOrJuniorSchool ?? null,
    hiSchool: d.HighSchool ?? null,
    address: d.UnparsedAddress ?? property.address ?? '',
    price: d.ListPrice ?? property.price ?? null,
    imageUrl: property.image_url || d.mediaUrls?.[0] || d.mediaArray?.[0] || '/fallback-property.jpg',
    savedAt: property.saved_at,
  };
}

/* ------------------------------------------------------------------ */
/*  Full-detail PDF sections (mirrors CompareModal SECTIONS exactly)   */
/* ------------------------------------------------------------------ */

/**
 * Given an enriched property object, resolve the "source" object to read
 * from — either the JSONB property_data or the top-level enriched row.
 */
function src(property) {
  return property.property_data && typeof property.property_data === 'object'
    ? { ...property.property_data, ...property }   // merge so saved_at / address / image_url available
    : property;
}

function resolveAddress(p) {
  const addr = getField(p, ['UnparsedAddress','full_address','address','Address']);
  if (typeof addr === 'string' && addr.trim()) return addr;
  const parts = [
    getField(p, ['StreetNumber','street_number']),
    getField(p, ['StreetName','street_name']),
    getField(p, ['City','city']),
    getField(p, ['StateOrProvince','state']),
    getField(p, ['PostalCode','zip']),
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : '—';
}

function resolvePrice(p) {
  return getField(p, ['ClosePrice','ListPrice','List_Price','list_price','price']);
}

function resolveImage(property) {
  const p = src(property);
  // Try Media array first (Trestle shape)
  if (Array.isArray(p.Media) && p.Media.length) {
    const url = p.Media[0]?.MediaURL || p.Media[0];
    if (url && typeof url === 'string') return url;
  }
  const url = property.image_url || getField(p, ['mediaUrls','mediaArray','photos','images','image_url','media']);
  if (Array.isArray(url) && url.length) return url[0];
  if (typeof url === 'string' && url) return url;
  return '/fallback-property.jpg';
}

/**
 * Build the section → row data for one property.
 * Returns array of { title, rows: [{ label, value }] } only for sections
 * that have at least one non-empty value.
 */
function buildSections(property) {
  const p = src(property);

  const price = resolvePrice(p);
  const sqft  = getField(p, ['LivingArea','LivingAreaSqFt','livingspace','building_area','sqft']);
  const beds  = getField(p, ['BedroomsTotal','Bedrooms','bedrooms','beds']);
  const baths = getField(p, ['BathroomsTotalInteger','BathroomsTotal','bathrooms','baths']);

  const raw = [
    { title: 'Key Facts', rows: [
      { label: 'Status', value: formatValue(getField(p, ['StandardStatus','MlsStatus','status'])) },
      { label: 'Price', value: price ? money(price) : null },
      { label: 'Price / sqft', value: price && sqft ? money(Math.round(num(price) / num(sqft))) : null },
      { label: 'Bedrooms', value: formatValue(beds) },
      { label: 'Bathrooms', value: formatValue(baths) },
      { label: 'Living Area', value: sqft ? `${fmt(sqft)} sq ft` : null },
      { label: 'Lot Size', value: (() => {
        const acres = getField(p, ['LotSizeAcres','lot_acres']);
        if (acres) return `${fmt(acres)} acres`;
        const ls = getField(p, ['LotSizeSquareFeet','LotSizeArea','lot_sqft']);
        return ls ? `${fmt(ls)} sq ft` : null;
      })() },
      { label: 'Property Type', value: formatValue(getField(p, ['PropertyType','property_type','type'])) },
      { label: 'Year Built', value: formatValue(getField(p, ['YearBuilt','year_built'])) },
      { label: 'Days on Market', value: formatValue(getField(p, ['DaysOnMarket','days_on_market','dom'])) },
      { label: 'MLS Number', value: formatValue(getField(p, ['ListingKey','ListingId','MLSListingID'])) },
      { label: 'Listing Date', value: (() => {
        const d = getField(p, ['ListingContractDate','listDate','OnMarketDate','OriginalEntryTimestamp']);
        return d ? new Date(d).toLocaleDateString() : null;
      })() },
      { label: 'Close Date', value: (() => {
        const d = getField(p, ['CloseDate','close_date']);
        return d ? new Date(d).toLocaleDateString() : null;
      })() },
      { label: 'Annual Taxes', value: (() => {
        const t = getField(p, ['TaxAnnualAmount','taxes','tax_amount']);
        return t ? `${money(t)}/yr` : null;
      })() },
      { label: 'HOA Fee', value: (() => {
        const h = getField(p, ['AssociationFee','AssociationFee2','hoa']);
        if (!h) return null;
        const freq = getField(p, ['AssociationFeeFrequency','hoa_frequency']);
        return `${money(h)}${freq ? '/' + freq : '/mo'}`;
      })() },
    ]},
    { title: 'Price & Listing Details', rows: [
      { label: 'Original List Price', value: money(getField(p, ['OriginalListPrice','original_list_price'])) },
      { label: 'Current List Price', value: money(getField(p, ['ListPrice','List_Price','list_price'])) },
      { label: 'Sold Price', value: money(getField(p, ['ClosePrice','Close_Price','sold_price'])) },
      { label: 'Address', value: resolveAddress(p) },
      { label: 'Listing Agent', value: formatValue(getField(p, ['ListAgentFullName','agent_name','listing_agent'])) },
      { label: 'Agent Phone', value: formatValue(getField(p, ['ListAgentPhone','agent_phone','ListAgentDirectPhone'])) },
      { label: 'Agent Email', value: formatValue(getField(p, ['ListAgentEmail','agent_email'])) },
      { label: 'Listing Office', value: formatValue(getField(p, ['ListOfficeName','office','ListingOffice'])) },
      { label: 'County', value: formatValue(getField(p, ['CountyOrParish','county','County'])) },
      { label: 'Subdivision', value: formatValue(getField(p, ['SubdivisionName','Subdivision','subdivision','Neighborhood'])) },
      { label: 'School District', value: formatValue(getField(p, ['SchoolDistrict','HighSchoolDistrict'])) },
      { label: 'Zoning', value: formatValue(getField(p, ['ZoningDescription','zoning'])) },
      { label: 'Parcel Number', value: formatValue(getField(p, ['ParcelNumber','TaxParcelId','parcel'])) },
    ]},
    { title: 'Interior Features', rows: [
      { label: 'Total Rooms', value: formatValue(getField(p, ['RoomsTotal','rooms','Rooms'])) },
      { label: 'Basement', value: (() => {
        const b = getField(p, ['Basement','basement','HasBasement','BasementYN']);
        if (typeof b === 'boolean') return b ? 'Yes' : 'No';
        return formatValue(b);
      })() },
      { label: 'Heating', value: formatValue(getField(p, ['Heating','heating','HeatingTypes'])) },
      { label: 'Cooling', value: formatValue(getField(p, ['Cooling','cooling','CoolingTypes'])) },
      { label: 'Flooring', value: formatValue(getField(p, ['Flooring','flooring'])) },
      { label: 'Fireplaces', value: formatValue(getField(p, ['FireplaceNumber','fireplaces','FireplacesTotal'])) },
      { label: 'Fireplace Features', value: formatValue(getField(p, ['FireplaceFeatures','fireplacefeatures'])) },
      { label: 'Appliances', value: (() => { const a = asList(getField(p, ['Appliances','appliances'])); return a.length ? a.join(', ') : null; })() },
      { label: 'Interior Features', value: (() => { const a = asList(getField(p, ['InteriorFeatures','interiorFeatures'])); return a.length ? a.join(', ') : null; })() },
    ]},
    { title: 'Exterior Features', rows: [
      { label: 'Parking', value: (() => {
        const t = getField(p, ['ParkingTotal','parking_total']);
        if (t) return `${t} spaces`;
        return formatValue(getField(p, ['ParkingFeatures','parking']));
      })() },
      { label: 'Garage', value: (() => {
        const s = getField(p, ['GarageSpaces','garage','garage_spaces']);
        return s ? `${s} spaces` : null;
      })() },
      { label: 'Pool', value: (() => {
        const yn = getField(p, ['PoolPrivateYN','pool','Pool','PoolYN']);
        const feat = getField(p, ['PoolFeatures','poolFeatures']);
        if (yn === true || yn === 'Yes' || yn === 'Y') return feat ? `Yes - ${formatValue(feat)}` : 'Yes';
        if (yn === false || yn === 'No' || yn === 'N') return 'No';
        return formatValue(feat);
      })() },
      { label: 'View', value: formatValue(getField(p, ['View','view','ViewType'])) },
      { label: 'Construction', value: formatValue(getField(p, ['ConstructionMaterials','construction'])) },
      { label: 'Roof', value: formatValue(getField(p, ['Roof','RoofMaterialType','roof'])) },
      { label: 'Style', value: formatValue(getField(p, ['ArchitecturalStyle','style'])) },
      { label: 'Foundation', value: formatValue(getField(p, ['FoundationDetails','foundation'])) },
      { label: 'Exterior Features', value: (() => { const a = asList(getField(p, ['ExteriorFeatures','exteriorFeatures'])); return a.length ? a.join(', ') : null; })() },
      { label: 'Lot Features', value: (() => { const a = asList(getField(p, ['LotFeatures','lotFeatures'])); return a.length ? a.join(', ') : null; })() },
      { label: 'Patio/Deck', value: formatValue(getField(p, ['PatioAndPorchFeatures','patio','deck'])) },
      { label: 'Fencing', value: formatValue(getField(p, ['Fencing','fence','FenceYN'])) },
    ]},
    { title: 'Utilities & Services', rows: [
      { label: 'Utilities', value: formatValue(getField(p, ['Utilities','utilities'])) },
      { label: 'Water Source', value: formatValue(getField(p, ['WaterSource','waterSource','water'])) },
      { label: 'Sewer', value: formatValue(getField(p, ['Sewer','sewer','SewerType'])) },
      { label: 'Electric', value: formatValue(getField(p, ['Electric','electric'])) },
    ]},
    { title: 'Location & Community', rows: [
      { label: 'City', value: formatValue(getField(p, ['City','city'])) },
      { label: 'State', value: formatValue(getField(p, ['StateOrProvince','state','State'])) },
      { label: 'Zip Code', value: formatValue(getField(p, ['PostalCode','zip','ZipCode'])) },
      { label: 'Directions', value: formatValue(getField(p, ['Directions','directions'])) },
      { label: 'Lot Dimensions', value: formatValue(getField(p, ['LotSizeDimensions','lot_dimensions'])) },
      { label: 'Topography', value: formatValue(getField(p, ['Topography','topography'])) },
      { label: 'Community Features', value: (() => { const a = asList(getField(p, ['CommunityFeatures','communityFeatures'])); return a.length ? a.join(', ') : null; })() },
      { label: 'Association Amenities', value: (() => { const a = asList(getField(p, ['AssociationAmenities','associationAmenities'])); return a.length ? a.join(', ') : null; })() },
    ]},
    { title: 'Schools', rows: [
      { label: 'High School', value: formatValue(getField(p, ['HighSchool','highSchool','HighSchoolName'])) },
      { label: 'High School District', value: formatValue(getField(p, ['HighSchoolDistrict','high_school_district'])) },
      { label: 'Middle School', value: formatValue(getField(p, ['MiddleOrJuniorSchool','middleschool','MiddleSchool'])) },
      { label: 'Middle School District', value: formatValue(getField(p, ['MiddleOrJuniorSchoolDistrict','middle_school_district'])) },
      { label: 'Elementary School', value: formatValue(getField(p, ['ElementarySchool','elementary','ElementarySchoolName'])) },
      { label: 'Elementary District', value: formatValue(getField(p, ['ElementarySchoolDistrict','elementary_district'])) },
    ]},
    { title: 'HOA Information', rows: [
      { label: 'Has HOA', value: (() => {
        const v = getField(p, ['AssociationYN','hoa_yn']);
        if (typeof v === 'boolean') return v ? 'Yes' : 'No';
        if (v === 'Y' || v === 'Yes') return 'Yes';
        if (v === 'N' || v === 'No') return 'No';
        return null;
      })() },
      { label: 'HOA Name', value: formatValue(getField(p, ['AssociationName','hoa_name'])) },
      { label: 'HOA Phone', value: formatValue(getField(p, ['AssociationPhone','hoa_phone'])) },
      { label: 'HOA Fee Includes', value: (() => { const a = asList(getField(p, ['AssociationFeeIncludes','hoa_fee_includes'])); return a.length ? a.join(', ') : null; })() },
      { label: 'HOA Fee 2', value: (() => { const f = getField(p, ['AssociationFee2','hoa_fee2']); return f ? money(f) : null; })() },
    ]},
    { title: 'Additional Details', rows: [
      { label: 'Stories', value: formatValue(getField(p, ['Stories','stories','StoriesTotal'])) },
      { label: 'Lot Size Units', value: formatValue(getField(p, ['LotSizeUnits','lot_size_units'])) },
      { label: 'MLS Area', value: formatValue(getField(p, ['MLSAreaMajor','mls_area'])) },
      { label: 'Last Modified', value: (() => {
        const d = getField(p, ['ModificationTimestamp','modified_date','UpdatedDate']);
        return d ? new Date(d).toLocaleDateString() : null;
      })() },
      { label: 'Tax Year', value: formatValue(getField(p, ['TaxYear','tax_year'])) },
    ]},
    { title: 'Description', rows: [
      { label: 'Public Remarks', value: formatValue(getField(p, ['PublicRemarks','remarks','description','Description'])) },
    ]},
  ];

  // Filter out sections with zero non-null rows
  return raw
    .map((s) => ({ ...s, rows: s.rows.filter((r) => r.value != null && r.value !== '' && r.value !== '—') }))
    .filter((s) => s.rows.length > 0);
}

/* ------------------------------------------------------------------ */
/*  HTML builders                                                      */
/* ------------------------------------------------------------------ */

function gridItem(label, value) {
  if (value == null || value === '' || value === 'None' || value === '—') return '';
  // For long values (remarks, feature lists) use a full-width cell
  const isLong = String(value).length > 80;
  const cls = isLong ? 'gi gi-wide' : 'gi';
  return `<div class="${cls}"><div class="gl">${label}</div><div class="gv">${value}</div></div>`;
}

function buildSectionsHtml(sections) {
  return sections.map((s) => {
    // Description / remarks section gets special treatment
    if (s.title === 'Description') {
      return `<div class="sect">
  <div class="sect-title">${s.title}</div>
  <p class="remarks">${s.rows.map((r) => r.value).join('<br/>')}</p>
</div>`;
    }
    const items = s.rows.map((r) => gridItem(r.label, r.value)).join('');
    return `<div class="sect">
  <div class="sect-title">${s.title}</div>
  <div class="grid">${items}</div>
</div>`;
  }).join('\n');
}

const PDF_STYLES = `
*{margin:0;padding:0;box-sizing:border-box}
@page{size:letter portrait;margin:0.6in}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1e293b;
  padding:16px 20px;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}

/* Header */
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2563EB;padding-bottom:12px;margin-bottom:14px}
.hdr-left h1{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#2563EB;margin-bottom:2px}
.hdr-left .price{font-size:22px;font-weight:800;color:#0f172a}
.hdr-left .addr{font-size:12px;color:#64748b;margin-top:2px}
.hdr-right{text-align:right;font-size:10px;color:#94a3b8;line-height:1.5}
.hdr-right .brand{font-weight:700;color:#2563EB;font-size:12px}

/* Photo */
.photo{width:100%;max-height:220px;object-fit:cover;border-radius:5px;margin-bottom:12px;display:block}

/* Highlights bar */
.hl{display:flex;gap:5px;margin-bottom:12px;flex-wrap:wrap}
.hl span{background:#eff6ff;color:#1e40af;font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px}

/* Grid sections */
.sect{margin-bottom:10px}
.sect-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#2563EB;border-bottom:1px solid #e2e8f0;padding-bottom:2px;margin-bottom:5px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px 14px}
.gi{padding:3px 0;border-bottom:1px solid #f1f5f9}
.gi-wide{grid-column:1/-1}
.gl{font-size:9px;text-transform:uppercase;letter-spacing:.03em;color:#94a3b8}
.gv{font-size:11px;font-weight:600;color:#1e293b;word-wrap:break-word}

/* Remarks */
.remarks{font-size:11px;line-height:1.6;color:#475569;word-wrap:break-word}

/* Footer */
.ft{margin-top:14px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}

/* Multi-property separator */
.property-page{padding-bottom:16px}
`;

function resolveAbsoluteUrl(url) {
  if (!url || url === '/fallback-property.jpg') return null;
  if (url.startsWith('http')) return url;
  if (typeof window !== 'undefined') return `${window.location.origin}${url}`;
  return url;
}

/** Build a fully self-contained HTML string for one property */
export function buildPropertyPdfHtml(property) {
  const p = src(property);
  const address  = resolveAddress(p);
  const price    = resolvePrice(p);
  const priceStr = money(price) || '—';
  const loc      = [getField(p, ['City','city']), getField(p, ['StateOrProvince','state']), getField(p, ['PostalCode','zip'])].filter(Boolean).join(', ');
  const imgUrl   = resolveAbsoluteUrl(resolveImage(property));
  const sections = buildSections(property);

  const beds  = getField(p, ['BedroomsTotal','Bedrooms']);
  const baths = getField(p, ['BathroomsTotalInteger','BathroomsTotal']);
  const sqft  = getField(p, ['LivingArea','LivingAreaSqFt']);
  const year  = getField(p, ['YearBuilt','year_built']);
  const type  = getField(p, ['PropertyType','PropertySubType']);
  const mls   = getField(p, ['ListingKey','ListingId']) || property.listing_key;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>${address || 'Property Listing'}</title>
<script>
  window.addEventListener('load', function() {
    setTimeout(function() { window.print(); }, 900);
  });
<\/script>
<style>${PDF_STYLES}</style></head><body>

<div class="hdr">
  <div class="hdr-left">
    <h1>Property Listing</h1>
    <div class="price">${priceStr}</div>
    <div class="addr">${address}${loc ? ' &mdash; ' + loc : ''}</div>
  </div>
  <div class="hdr-right">
    <div class="brand">pares.homes</div>
    ${mls ? `<div>MLS# ${mls}</div>` : ''}
    <div>${new Date().toLocaleDateString()}</div>
  </div>
</div>

${imgUrl ? `<img class="photo" src="${imgUrl}" alt="Property photo"/>` : ''}

<div class="hl">
  ${beds != null ? `<span>${beds} Beds</span>` : ''}
  ${baths != null ? `<span>${baths} Baths</span>` : ''}
  ${sqft ? `<span>${fmt(sqft)} sqft</span>` : ''}
  ${year ? `<span>Built ${year}</span>` : ''}
  ${type ? `<span>${type}</span>` : ''}
</div>

${buildSectionsHtml(sections)}

<div class="ft">
  Courtesy of GEBOR &bull;
  Saved ${property.saved_at ? new Date(property.saved_at).toLocaleDateString() : '—'}
  &bull; Generated ${new Date().toLocaleDateString()}
  &bull; pares.homes
</div>

</body></html>`;
}

/* ------------------------------------------------------------------ */
/*  Multi-property PDF                                                 */
/* ------------------------------------------------------------------ */

function buildPropertyBodyFragment(property, index, total) {
  const p = src(property);
  const address  = resolveAddress(p);
  const price    = resolvePrice(p);
  const priceStr = money(price) || '—';
  const loc      = [getField(p, ['City','city']), getField(p, ['StateOrProvince','state']), getField(p, ['PostalCode','zip'])].filter(Boolean).join(', ');
  const imgUrl   = resolveAbsoluteUrl(resolveImage(property));
  const sections = buildSections(property);
  const mls      = getField(p, ['ListingKey','ListingId']) || property.listing_key;

  const beds  = getField(p, ['BedroomsTotal','Bedrooms']);
  const baths = getField(p, ['BathroomsTotalInteger','BathroomsTotal']);
  const sqft  = getField(p, ['LivingArea','LivingAreaSqFt']);
  const year  = getField(p, ['YearBuilt','year_built']);
  const type  = getField(p, ['PropertyType','PropertySubType']);

  const pageBreak = index < total - 1 ? 'style="page-break-after:always"' : '';

  return `
<div class="property-page" ${pageBreak}>
  <div class="hdr">
    <div class="hdr-left">
      <h1>Property ${index + 1} of ${total}</h1>
      <div class="price">${priceStr}</div>
      <div class="addr">${address}${loc ? ' &mdash; ' + loc : ''}</div>
    </div>
    <div class="hdr-right">
      <div class="brand">pares.homes</div>
      ${mls ? `<div>MLS# ${mls}</div>` : ''}
      <div>${new Date().toLocaleDateString()}</div>
    </div>
  </div>

  ${imgUrl ? `<img class="photo" src="${imgUrl}" alt="Property photo"/>` : ''}

  <div class="hl">
    ${beds != null ? `<span>${beds} Beds</span>` : ''}
    ${baths != null ? `<span>${baths} Baths</span>` : ''}
    ${sqft ? `<span>${fmt(sqft)} sqft</span>` : ''}
    ${year ? `<span>Built ${year}</span>` : ''}
    ${type ? `<span>${type}</span>` : ''}
  </div>

  ${buildSectionsHtml(sections)}

  <div class="ft">
    Courtesy of GEBOR &bull;
    Saved ${property.saved_at ? new Date(property.saved_at).toLocaleDateString() : '—'}
    &bull; Generated ${new Date().toLocaleDateString()}
    &bull; pares.homes
  </div>
</div>`;
}

export function buildAllPropertiesPdfHtml(properties) {
  const count = properties.length;
  const pages = properties.map((p, i) => buildPropertyBodyFragment(p, i, count)).join('\n');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>Saved Properties (${count})</title>
<script>
  window.addEventListener('load', function() {
    setTimeout(function() { window.print(); }, 900);
  });
<\/script>
<style>${PDF_STYLES}</style></head><body>
${pages}
</body></html>`;
}

/* ------------------------------------------------------------------ */
/*  Print trigger (popup window – gives proper viewport for layout)   */
/* ------------------------------------------------------------------ */

/**
 * Trigger the browser's print / "Save as PDF" dialog for a single property.
 * Opens a popup window so the HTML renders in a real viewport (fixes the
 * zero-width iframe collapse that caused single-page / empty PDFs).
 */
export function printPropertyPdf(property) {
  const html = buildPropertyPdfHtml(property);

  const win = window.open('', '_blank', 'width=960,height=800,scrollbars=yes,resizable=yes,menubar=no,toolbar=no');
  if (!win) {
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const tab = window.open(url, '_blank');
    if (!tab) window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
}

/**
 * Trigger the browser's print / "Save as PDF" for ALL saved properties.
 * Each property gets its own page via page-break-after CSS.
 */
export function printAllPropertiesPdf(properties) {
  if (!properties || properties.length === 0) return;

  console.log(`[PDF] Printing ${properties.length} properties`);
  const html = buildAllPropertiesPdfHtml(properties);

  const win = window.open('', '_blank', 'width=960,height=800,scrollbars=yes,resizable=yes,menubar=no,toolbar=no');
  if (!win) {
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const tab = window.open(url, '_blank');
    if (!tab) window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
}

/* ------------------------------------------------------------------ */
/*  Comparison PDF  (side-by-side table – mirrors CompareModal view)  */
/* ------------------------------------------------------------------ */

const COMPARISON_STYLES = `
*{margin:0;padding:0;box-sizing:border-box}
@page{size:landscape;margin:0.45in}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1e293b;
  padding:12px 16px;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}

.hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #2563EB;padding-bottom:10px;margin-bottom:14px}
.hdr h1{font-size:18px;color:#2563EB;font-weight:700}
.hdr .sub{font-size:10px;color:#94a3b8;text-align:right;line-height:1.5}
.hdr .sub .brand{font-weight:700;color:#2563EB;font-size:11px}

table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}
th,td{padding:5px 7px;text-align:left;vertical-align:top;border-bottom:1px solid #f1f5f9;word-wrap:break-word}
th{background:#f8fafc;font-weight:600;color:#64748b;font-size:10px}

.prop-hdr{vertical-align:top}
.prop-hdr img{width:100%;max-height:100px;object-fit:cover;border-radius:4px;margin-bottom:4px;display:block}
.prop-hdr .price{font-weight:800;font-size:14px;color:#0f172a}
.prop-hdr .addr{font-size:10px;color:#64748b;margin-top:2px;overflow:hidden;text-overflow:ellipsis}
.prop-hdr .hl{font-size:9px;color:#475569;margin-top:3px}

.sect-row td{background:#eff6ff;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#2563EB;border-bottom:2px solid #bfdbfe;padding:6px 7px}

.label-col{font-weight:600;color:#64748b;font-size:10px;background:#fafbfc;width:140px;min-width:120px}

.ft{margin-top:12px;padding-top:6px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}
`;

export function buildComparisonPdfHtml(properties) {
  const count = properties.length;
  const propData = properties.map((property) => {
    const p = src(property);
    return {
      raw: property,
      p,
      address: resolveAddress(p),
      price: money(resolvePrice(p)) || '\u2014',
      image: resolveAbsoluteUrl(resolveImage(property)),
      beds: getField(p, ['BedroomsTotal','Bedrooms']),
      baths: getField(p, ['BathroomsTotalInteger','BathroomsTotal']),
      sqft: getField(p, ['LivingArea','LivingAreaSqFt']),
      year: getField(p, ['YearBuilt','year_built']),
      sections: buildSections(property),
    };
  });

  // Merge all section titles (union across all properties, preserve order)
  const sectionOrder = [];
  const sectionMap = {};
  for (let i = 0; i < propData.length; i++) {
    for (const sec of propData[i].sections) {
      if (!sectionMap[sec.title]) {
        sectionMap[sec.title] = { labels: new Map() };
        sectionOrder.push(sec.title);
      }
      for (const row of sec.rows) {
        if (!sectionMap[sec.title].labels.has(row.label)) {
          sectionMap[sec.title].labels.set(row.label, new Array(count).fill('\u2014'));
        }
        sectionMap[sec.title].labels.get(row.label)[i] = row.value || '\u2014';
      }
    }
  }

  const colWidth = Math.max(120, Math.floor(700 / count));

  // Build a filename-safe title from the addresses
  const docTitle = propData
    .map((d) => d.address.replace(/[<>:"/\\|?*]+/g, '').trim())
    .filter((a) => a && a !== '—')
    .join(' vs ') || `Property Comparison (${count})`;

  const headerCells = propData.map((d) => `
    <td class="prop-hdr" style="width:${colWidth}px">
      ${d.image ? `<img src="${d.image}" alt="photo"/>` : ''}
      <div class="price">${d.price}</div>
      <div class="addr">${d.address}</div>
      <div class="hl">${[d.beds != null ? d.beds + ' bd' : '', d.baths != null ? d.baths + ' ba' : '', d.sqft ? fmt(d.sqft) + ' sqft' : '', d.year ? 'Built ' + d.year : ''].filter(Boolean).join(' \u2022 ')}</div>
    </td>`).join('');

  let bodyRows = '';
  for (const title of sectionOrder) {
    const sec = sectionMap[title];
    bodyRows += `<tr class="sect-row"><td colspan="${count + 1}">${title}</td></tr>\n`;
    for (const [label, values] of sec.labels) {
      if (values.every((v) => v === '\u2014' || v === null || v === '')) continue;
      const cells = values.map((v) => {
        const display = (v && String(v).length > 200) ? String(v).substring(0, 200) + '\u2026' : (v || '\u2014');
        return `<td>${display}</td>`;
      }).join('');
      bodyRows += `<tr><td class="label-col">${label}</td>${cells}</tr>\n`;
    }
  }

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>${docTitle}</title>
<script>
  window.addEventListener('load', function() {
    setTimeout(function() { window.print(); }, 900);
  });
<\/script>
<style>${COMPARISON_STYLES}</style></head><body>

<div class="hdr">
  <h1>Property Comparison</h1>
  <div class="sub">
    <div class="brand">pares.homes</div>
    <div>${count} properties \u2022 ${new Date().toLocaleDateString()}</div>
  </div>
</div>

<table>
  <thead>
    <tr><th class="label-col"></th>${headerCells}</tr>
  </thead>
  <tbody>
    ${bodyRows}
  </tbody>
</table>

<div class="ft">Courtesy of GEBOR \u2022 Generated ${new Date().toLocaleDateString()} \u2022 pares.homes</div>

</body></html>`;
}

export function printComparisonPdf(properties) {
  if (!properties || properties.length === 0) return;

  const html = buildComparisonPdfHtml(properties);

  const win = window.open('', '_blank', 'width=1100,height=800,scrollbars=yes,resizable=yes,menubar=no,toolbar=no');
  if (!win) {
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const tab = window.open(url, '_blank');
    if (!tab) window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
}

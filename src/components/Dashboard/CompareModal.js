import React, { useEffect, useRef, useState } from 'react';
import { getPropertyDetails } from '../../services/trestleServices';

export default function CompareModal({ open = false, onClose = () => {}, properties = [], allSelectedIds = [] }) {
  const MAX_COMPARE = 4;
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [selectedProps, setSelectedProps] = useState(properties.slice(0, Math.min(MAX_COMPARE, properties.length)));

  // --- NORMALIZE helper: canonicalize MLS / saved row fields so getters always work ---
  function normalizeProperty(raw = {}) {
    if (!raw || typeof raw !== 'object') return raw;

    const pick = (obj, keys = []) => {
      for (const k of keys) {
        // direct
        if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
        // nested path support
        if (k.includes('.')) {
          const parts = k.split('.');
          let cur = obj;
          let ok = true;
          for (const p of parts) {
            cur = cur?.[p];
            if (cur === undefined) { ok = false; break; }
          }
          if (ok && cur !== undefined && cur !== null && cur !== '') return cur;
        }
        // lowercase variants
        const lowerKey = Object.keys(obj || {}).find(key => key.toLowerCase() === k.toLowerCase());
        if (lowerKey && obj[lowerKey] !== undefined && obj[lowerKey] !== null && obj[lowerKey] !== '') return obj[lowerKey];
      }
      return undefined;
    };

    const ListingKey = pick(raw, ['ListingKey','ListingId','listing_key','listing_id','property_id','id','mlsId','uuid']) || null;
    const ListPrice = pick(raw, ['ListPrice','List_Price','list_price','price','amount']) || null;
    const BedroomsTotal = pick(raw, ['BedroomsTotal','Bedrooms','bedrooms','beds']) || null;
    const BathroomsTotalInteger = pick(raw, ['BathroomsTotalInteger','BathroomsTotal','bathrooms','baths']) || null;
    const LivingArea = pick(raw, ['LivingArea','LivingAreaSqFt','livingspace','building_area','sqft']) || null;
    const LotSizeSquareFeet = pick(raw, ['LotSizeSquareFeet','LotSizeArea','lot_size','lotArea','lot_sqft']) || null;
    const YearBuilt = pick(raw, ['YearBuilt','year_built','yearBuilt','year']) || null;
    const DaysOnMarket = pick(raw, ['DaysOnMarket','days_on_market','dom']) || null;
    const UnparsedAddress = pick(raw, ['UnparsedAddress','full_address','address','Address','address_line']) || null;

    // media normalization
    let mediaArray = [];
    if (Array.isArray(raw.Media) && raw.Media.length) {
      mediaArray = raw.Media.map(m => m?.MediaURL || m?.url || m?.uri || m).filter(Boolean);
    } else if (Array.isArray(raw.mediaArray) && raw.mediaArray.length) {
      mediaArray = raw.mediaArray.filter(Boolean);
    } else if (Array.isArray(raw.mediaUrls) && raw.mediaUrls.length) {
      mediaArray = raw.mediaUrls.filter(Boolean);
    } else if (Array.isArray(raw.photos) && raw.photos.length) {
      mediaArray = raw.photos.filter(Boolean);
    } else if (Array.isArray(raw.images) && raw.images.length) {
      mediaArray = raw.images.filter(Boolean);
    } else if (raw.media && typeof raw.media === 'string') {
      mediaArray = [raw.media];
    }
    const media = mediaArray.length ? mediaArray[0] : (raw.media || raw.image || raw.image_url || '/fallback-property.jpg');

    return {
      ...raw,
      ListingKey,
      ListPrice,
      BedroomsTotal,
      BathroomsTotalInteger,
      LivingArea,
      LotSizeSquareFeet,
      YearBuilt,
      DaysOnMarket,
      UnparsedAddress,
      mediaArray,
      media,
      mediaUrls: mediaArray,
      images: mediaArray
    };
  }

  useEffect(() => {
    // Quick sync of incoming rows so UI updates immediately
    // Normalize incoming rows immediately so UI getters can read canonical keys even before enrichment
    const initial = (properties || []).slice(0, Math.min(MAX_COMPARE, properties.length)).map(normalizeProperty);
    setSelectedProps(initial);

    // Enrich minimal saved_property rows by fetching full trestle/MLS details.
    // If an item already contains MLS fields (BedroomsTotal, LivingArea, etc.) we skip fetching.
    let mounted = true;
    const enrich = async () => {
      if (!properties || properties.length === 0) return;
      const toProcess = properties.slice(0, Math.min(MAX_COMPARE, properties.length));

      const needsLookup = toProcess.some(p => (
        !(p.BedroomsTotal || p.Bedrooms || p.LivingAreaSqFt || p.LivingArea || p.Media || p.mediaUrls)
      ));

      if (!needsLookup) return; // nothing to fetch

      try {
        const enriched = await Promise.all(toProcess.map(async (p) => {
          // Determine a listing key we can use to fetch full details
          const listingKey = p.ListingKey || p.listing_key || p.ListingId || p.listing_id || p.property_id || p.propertyId;
          if (!listingKey) {
            // No listing key; return normalized original row
            return normalizeProperty(p);
          }

          try {
            const full = await getPropertyDetails(String(listingKey));
            // Merge full MLS record with the saved row, preferring MLS full fields
            const merged = { ...p, ...(full || {}) };
            return normalizeProperty(merged);
          } catch (err) {
            // On error, keep original minimal row
            console.error('CompareModal: failed to fetch full property for', listingKey, err);
            return normalizeProperty(p);
          }
        }));

        if (mounted) {
          setSelectedProps(enriched);
        }
      } catch (err) {
        console.error('CompareModal enrichment error:', err);
      }
    };

    enrich();

    return () => { mounted = false; };
  }, [open, properties]);

  useEffect(() => {
    if (!open) return;
    // lock scroll
    document.body.style.overflow = 'hidden';
    // focus close button
    setTimeout(() => closeBtnRef.current?.focus(), 80);
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // --- NEW helpers: accessPath + getField (tries multiple candidate keys/nested paths) ---
  const accessPath = (obj, path) => {
    if (!obj || !path) return undefined;
    // support dot notation 'Address.City' or simple key
    const parts = String(path).split('.');
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  };

  const getField = (p, candidates = []) => {
    if (!p) return undefined;
    for (const key of candidates) {
      // try direct lookup, then nested path
      const k = key;
      const v1 = p[k];
      if (v1 !== undefined && v1 !== null && v1 !== '') return v1;
      const v2 = accessPath(p, k);
      if (v2 !== undefined && v2 !== null && v2 !== '') return v2;
      // also check variations on lowercased keys
      const lower = Object.keys(p || {}).reduce((acc, cur) => {
        acc[cur.toLowerCase()] = p[cur];
        return acc;
      }, {});
      if (lower[k.toLowerCase()] !== undefined && lower[k.toLowerCase()] !== null && lower[k.toLowerCase()] !== '') {
        return lower[k.toLowerCase()];
      }
    }
    return undefined;
  };

  // defensive getters (expanded to map common trestle / MLS field names)
  const getId = (p) => getField(p, ['ListingKey','ListingId','listing_key','listing_id','property_id','id','mlsId','uuid','_id','id']);

  const getPrice = (p) => getField(p, ['ClosePrice','Close_Price','Close','ClosePrice','ListPrice','List_Price','list_price','price','amount']);

  const getBeds = (p) => getField(p, ['BedroomsTotal','Bedrooms','bedrooms','beds','BedRooms','BedCount','bed_count']);
  const getBaths = (p) => getField(p, ['BathroomsTotalInteger','BathroomsTotal','bathCount','bathrooms','baths','bath_count','Bathrooms']);
  const getSqft = (p) => getField(p, ['LivingAreaSqFt','LivingArea','LivingArea','livingspace','building_area','sqft','Building.LivingArea']);
  const getLot = (p) => getField(p, ['LotSizeSquareFeet','LotSizeArea','lot_size','lotArea','lot_sqft','LotSize']);
  const getYear = (p) => getField(p, ['YearBuilt','year_built','yearBuilt','year']);
  const getDom = (p) => getField(p, ['DaysOnMarket','days_on_market','dom','days_on_market_total','DOM']);

  const getAddress = (p) => {
    // Prefer UnparsedAddress or top-level full address fields
    const addr = getField(p, ['UnparsedAddress','Unparsed_Address','full_address','FullAddress','address','Address','address_line']);
    if (typeof addr === 'string' && addr.trim()) return addr;
    // Try nested address object
    const a = getField(p, ['address','Address','Property.Address','Location']);
    if (a && typeof a === 'object') {
      const parts = [
        accessPath(a,'Line') || accessPath(a,'line') || accessPath(a,'street') || accessPath(a,'StreetName') || accessPath(a,'StreetNumber'),
        accessPath(a,'City') || accessPath(a,'city'),
        accessPath(a,'StateOrProvince') || accessPath(a,'state') || accessPath(a,'region'),
        accessPath(a,'PostalCode') || accessPath(a,'postalCode') || accessPath(a,'zip')
      ].filter(Boolean);
      if (parts.length) return parts.join(', ');
    }
    // fallback combos
    const fallback = (getField(p, ['street','StreetName','title','address_line']) || '');
    return fallback || '—';
  };

  const getPhotos = (p) => {
    // Try several media/photo shapes produced by different providers (trestle/MLS, bespoke feeds)
    const attempts = [
      () => getField(p, ['mediaUrls','media_urls','media_array','mediaArray']),
      () => getField(p, ['media','Media','Media.MediaURL']),
      () => getField(p, ['Media','Property.Media','Gallery']),
      () => getField(p, ['photos','images','imageUrls','image_url','imageUrl']),
      () => getField(p, ['thumb','thumbnail','thumbnail_url'])
    ];

    for (const fn of attempts) {
      const result = fn();
      if (!result) continue;
      if (Array.isArray(result) && result.length) return result.filter(Boolean);
      if (typeof result === 'string' && result) return [result];
      // If result is array-like of objects with MediaURL
      if (Array.isArray(result)) {
        const mapped = result.map(r => r?.MediaURL || r?.url || r?.uri || r?.src || r).filter(Boolean);
        if (mapped.length) return mapped;
      }
    }
    // Also try Media array of objects
    if (Array.isArray(p.Media) && p.Media.length) {
      const mapped = p.Media.map(m => m.MediaURL || m.url || m.uri || m.src).filter(Boolean);
      if (mapped.length) return mapped;
    }
    // final fallback
    return ['/fallback-property.jpg'];
  };
  const format = (v) => (v === null || typeof v === 'undefined' || v === '' ? '—' : String(v));

  const exportJSON = () => {
    const payload = selectedProps;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'compare-properties.json');
    a.click();
  };

  const saveSnapshot = () => {
    const name = prompt('Snapshot name (optional):', `Compare snapshot ${new Date().toLocaleString()}`);
    if (name === null) return;
    const snaps = JSON.parse(localStorage.getItem('compare_snapshots') || '[]');
    snaps.unshift({ id: Date.now(), name, createdAt: new Date().toISOString(), properties: selectedProps });
    localStorage.setItem('compare_snapshots', JSON.stringify(snaps));
    alert('Snapshot saved locally.');
  };

  const shareLink = () => {
    const ids = selectedProps.map(getId).filter(Boolean).join(',');
    const url = new URL(window.location.href);
    url.searchParams.set('compare', ids);
    navigator.clipboard?.writeText(url.toString()).then(() => alert('Share link copied to clipboard.'));
  };

  const printView = () => {
    window.print();
  };

  // attributes to show in grid grouped into sections
  const SECTIONS = [
    { title: 'Basic', fields: [
      { key: 'address', label: 'Address', getter: getAddress },
      { key: 'price', label: 'Price', getter: getPrice },
      { key: 'beds', label: 'Beds', getter: getBeds },
      { key: 'baths', label: 'Baths', getter: getBaths },
      { key: 'sqft', label: 'Sq Ft', getter: getSqft },
    ]},
    { title: 'Details', fields: [
      { key: 'lot', label: 'Lot Size', getter: getLot },
      { key: 'year', label: 'Year Built', getter: getYear },
      { key: 'dom', label: 'Days on Market', getter: getDom },
      { key: 'type', label: 'Property Type', getter: (p) => p.property_type ?? p.type ?? '—' },
      { key: 'parking', label: 'Parking', getter: (p) => p.parking ?? '—' },
    ]},
    { title: 'Financial', fields: [
      { key: 'hoa', label: 'HOA', getter: (p) => p.hoa_fees ?? p.hoa ?? '—' },
      { key: 'taxes', label: 'Taxes', getter: (p) => p.taxes ?? p.tax_amount ?? '—' },
      { key: 'last_sold', label: 'Last Sold', getter: (p) => p.last_sold_date ?? '—' },
    ]},
    { title: 'Neighborhood', fields: [
      { key: 'agent', label: 'Agent', getter: (p) => p.agent_name ?? p.listing_agent ?? '—' },
      { key: 'amenities', label: 'Amenities', getter: (p) => (p.amenities ?? p.features ?? p.tags ?? []).slice?.(0,6).join?.(', ') ?? '—' },
    ]},
  ];

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="compare-modal-title" className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div ref={modalRef} className="relative w-full max-w-[1280px] max-h-[90vh] overflow-auto bg-white rounded-xl shadow-[0_6px_18px_rgba(0,0,0,0.08)] ring-1 ring-black/8">
        <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <h2 id="compare-modal-title" className="text-lg font-semibold text-gray-900">Compare properties</h2>
            <div className="text-sm text-gray-600">({selectedProps.length} selected)</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={saveSnapshot} className="px-2 py-1 rounded-md text-sm text-gray-700 hover:bg-gray-100">Save snapshot</button>
            <button onClick={shareLink} className="px-2 py-1 rounded-md text-sm text-gray-700 hover:bg-gray-100">Share</button>
            <button onClick={printView} className="px-2 py-1 rounded-md text-sm text-gray-700 hover:bg-gray-100">Print</button>
            <button ref={closeBtnRef} onClick={onClose} aria-label="Close compare modal" className="px-3 py-1 rounded-md text-sm bg-red-50 text-red-600">Close</button>
          </div>
        </header>

        {/* Summary carousel */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-800">Summary</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')} className="px-2 py-1 rounded-md bg-gray-100 text-sm">
                View: {viewMode === 'table' ? 'Table' : 'Cards'}
              </button>
              <button onClick={exportJSON} className="px-2 py-1 rounded-md bg-gray-100 text-sm">Export</button>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {selectedProps.map((p) => {
              const photos = getPhotos(p);
              return (
                <div key={getId(p)} className="w-56 min-w-[14rem] bg-white rounded-lg shadow-sm p-2 ring-1 ring-black/5">
                  <div className="h-32 rounded-md overflow-hidden mb-2 bg-gray-100">
                    {photos[0] ? <img src={photos[0]} loading="lazy" alt={`${getAddress(p)} - ${getPrice(p) || ''}`} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-gray-400">No image</div>}
                  </div>
                  <div className="text-sm font-semibold">{format(getPrice(p) ? `$${Number(getPrice(p)).toLocaleString()}` : '—')}</div>
                  <div className="text-xs text-gray-500">{format(getBeds(p))} bd • {format(getBaths(p))} ba • {format(getSqft(p))} ft²</div>
                  <div className="text-xs text-gray-400 truncate">{getAddress(p)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparison grid */}
        <div className="p-4">
          {SECTIONS.map((section) => (
            <section key={section.title} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{section.title}</h3>
              <div className="overflow-auto">
                <div className="min-w-full grid" style={{ gridTemplateColumns: `200px repeat(${selectedProps.length}, minmax(220px, 1fr))` }}>
                  {/* attribute column (sticky when scrolling horizontally) */}
                  <div className="bg-gray-50 p-3 border-r sticky left-0 z-10">
                    <div className="text-xs text-gray-500">Attribute</div>
                    {section.fields.map(f => <div key={f.key} className="py-3 text-sm text-gray-600 border-t">{f.label}</div>)}
                  </div>

                  {/* property columns */}
                  {selectedProps.map((p) => (
                    <div key={getId(p)} className="p-3 border-l">
                      <div className="text-xs text-gray-500 mb-2">Value</div>
                      {section.fields.map((f) => {
                        const raw = f.getter(p);
                        return (
                          <div key={f.key} className="py-3 text-sm text-gray-800 border-t">
                            {Array.isArray(raw) ? (raw.length ? raw.join(', ') : '—') : (raw === null || raw === undefined || raw === '' ? '—' : String(raw))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Footer with simple mortgage snippet */}
        <footer className="p-4 border-t bg-white sticky bottom-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600">Estimated monthly (sample)</div>
              <div className="text-lg font-semibold text-gray-900">$1,234/mo</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => alert('Request tour — open contact flow')} className="px-4 py-2 bg-teal-500 text-white rounded-md shadow-sm">Request tour</button>
              <button onClick={() => alert('Message agent — open message flow')} className="px-4 py-2 border rounded-md">Message agent</button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

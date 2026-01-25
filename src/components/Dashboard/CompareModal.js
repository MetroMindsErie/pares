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
    // Always fetch for saved properties since they only have minimal data (address, price, image)
    let mounted = true;
    const enrich = async () => {
      if (!properties || properties.length === 0) return;
      const toProcess = properties.slice(0, Math.min(MAX_COMPARE, properties.length));

      // Check if any property is from saved_properties table (has saved_at field) or missing essential MLS data
      const needsLookup = toProcess.some(p => (
        p.saved_at || // from saved_properties table - always needs enrichment
        !(p.BedroomsTotal || p.Bedrooms || p.LivingAreaSqFt || p.LivingArea || p.Media || p.mediaUrls)
      ));

      if (!needsLookup) return; // nothing to fetch

      try {
        const enriched = await Promise.all(toProcess.map(async (p) => {
          // Determine a listing key we can use to fetch full details
          const listingKey = p.ListingKey || p.listing_key || p.ListingId || p.listing_id || p.property_id || p.propertyId;
          if (!listingKey) {
            // No listing key; return normalized original row
            console.warn('CompareModal: property missing listing key', p);
            return normalizeProperty(p);
          }

          // Always fetch for saved properties (has saved_at) or properties missing essential data
          const isSavedProperty = !!p.saved_at;
          const hasMlsData = !!(p.BedroomsTotal || p.Bedrooms || p.LivingArea || p.Media);
          
          if (isSavedProperty || !hasMlsData) {
            try {
              console.log('CompareModal: Fetching full details for listing key:', listingKey);
              const full = await getPropertyDetails(String(listingKey));
              if (!full) {
                console.warn('CompareModal: getPropertyDetails returned null/undefined for', listingKey);
                return normalizeProperty(p);
              }
              // Merge full MLS record with the saved row, preferring MLS full fields
              const merged = { ...p, ...full };
              console.log('CompareModal: Successfully enriched property', listingKey, {
                beds: merged.BedroomsTotal,
                baths: merged.BathroomsTotalInteger,
                sqft: merged.LivingArea
              });
              return normalizeProperty(merged);
            } catch (err) {
              // On error, keep original minimal row
              console.error('CompareModal: failed to fetch full property for', listingKey, err);
              return normalizeProperty(p);
            }
          } else {
            // Already has MLS data, just normalize
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
    if (!open) return;
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setViewMode('cards');
    }
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
    let photos = [];
    
    // Try Media array of objects first (from Trestle API)
    if (Array.isArray(p.Media) && p.Media.length) {
      // Find preferred photo first
      const preferred = p.Media.find(m => m.PreferredPhotoYN === true || m.preferredphotoyn === true);
      const allPhotos = p.Media
        .map(m => m.MediaURL || m.url || m.uri || m.src)
        .filter(Boolean);
      
      // Put preferred photo first
      if (preferred?.MediaURL) {
        photos = [preferred.MediaURL, ...allPhotos.filter(url => url !== preferred.MediaURL)];
      } else {
        photos = allPhotos;
      }
      
      if (photos.length) return photos;
    }
    
    // Try several media/photo shapes produced by different providers
    const attempts = [
      () => getField(p, ['mediaUrls','media_urls','media_array','mediaArray']),
      () => getField(p, ['media','Media.MediaURL']),
      () => getField(p, ['Property.Media','Gallery']),
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

  // attributes to show in grid grouped into sections - matching active/pending/sold templates
  const SECTIONS = [
    { title: 'Basic Information', fields: [
      { key: 'address', label: 'Address', getter: getAddress },
      { key: 'price', label: 'List Price', getter: (p) => {
        const price = getPrice(p);
        return price ? `$${Number(price).toLocaleString()}` : '—';
      }},
      { key: 'beds', label: 'Bedrooms', getter: getBeds },
      { key: 'baths', label: 'Bathrooms', getter: getBaths },
      { key: 'sqft', label: 'Living Area', getter: (p) => {
        const sqft = getSqft(p);
        return sqft ? `${Number(sqft).toLocaleString()} sq ft` : '—';
      }},
      { key: 'status', label: 'Status', getter: (p) => getField(p, ['StandardStatus','status','Status']) },
    ]},
    { title: 'Property Details', fields: [
      { key: 'lot', label: 'Lot Size', getter: (p) => {
        const acres = getLot(p);
        if (acres) return `${acres} acres`;
        const sqft = getField(p, ['LotSizeSquareFeet','lot_sqft']);
        return sqft ? `${Number(sqft).toLocaleString()} sq ft` : '—';
      }},
      { key: 'year', label: 'Year Built', getter: getYear },
      { key: 'dom', label: 'Days on Market', getter: getDom },
      { key: 'type', label: 'Property Type', getter: (p) => getField(p, ['PropertyType','property_type','type']) },
      { key: 'stories', label: 'Stories', getter: (p) => getField(p, ['Stories','stories','StoriesTotal']) },
      { key: 'garage', label: 'Garage', getter: (p) => getField(p, ['GarageSpaces','garage','GarageYN']) },
      { key: 'parking', label: 'Parking Features', getter: (p) => getField(p, ['ParkingFeatures','parking','parkingFeatures']) },
    ]},
    { title: 'Interior Features', fields: [
      { key: 'flooring', label: 'Flooring', getter: (p) => getField(p, ['Flooring','flooring']) },
      { key: 'cooling', label: 'Cooling', getter: (p) => getField(p, ['Cooling','cooling']) },
      { key: 'heating', label: 'Heating', getter: (p) => getField(p, ['Heating','heating']) },
      { key: 'fireplace', label: 'Fireplace', getter: (p) => getField(p, ['FireplaceNumber','FireplaceYN','fireplace']) },
      { key: 'appliances', label: 'Appliances', getter: (p) => getField(p, ['Appliances','appliances']) },
      { key: 'interior', label: 'Interior Features', getter: (p) => getField(p, ['InteriorFeatures','interiorFeatures']) },
    ]},
    { title: 'Exterior Features', fields: [
      { key: 'exterior', label: 'Exterior Features', getter: (p) => getField(p, ['ExteriorFeatures','exteriorFeatures']) },
      { key: 'construction', label: 'Construction', getter: (p) => getField(p, ['ConstructionMaterials','construction']) },
      { key: 'roof', label: 'Roof', getter: (p) => getField(p, ['Roof','RoofMaterialType','roof']) },
      { key: 'foundation', label: 'Foundation', getter: (p) => getField(p, ['FoundationDetails','foundation']) },
      { key: 'pool', label: 'Pool', getter: (p) => getField(p, ['PoolPrivateYN','pool','Pool']) },
      { key: 'view', label: 'View', getter: (p) => getField(p, ['View','view']) },
    ]},
    { title: 'Financial & Utilities', fields: [
      { key: 'taxes', label: 'Annual Taxes', getter: (p) => {
        const tax = getField(p, ['TaxAnnualAmount','taxes','tax_amount']);
        return tax ? `$${Number(tax).toLocaleString()}` : '—';
      }},
      { key: 'hoa', label: 'HOA Fees', getter: (p) => {
        const hoa = getField(p, ['AssociationFee','hoa_fees','hoa']);
        return hoa ? `$${Number(hoa).toLocaleString()}` : '—';
      }},
      { key: 'water', label: 'Water Source', getter: (p) => getField(p, ['WaterSource','waterSource','water']) },
      { key: 'sewer', label: 'Sewer', getter: (p) => getField(p, ['Sewer','sewer']) },
      { key: 'utilities', label: 'Utilities', getter: (p) => getField(p, ['Utilities','utilities']) },
    ]},
    { title: 'Location & Schools', fields: [
      { key: 'city', label: 'City', getter: (p) => getField(p, ['City','city']) },
      { key: 'county', label: 'County', getter: (p) => getField(p, ['CountyOrParish','county','County']) },
      { key: 'zip', label: 'Zip Code', getter: (p) => getField(p, ['PostalCode','zip','postalCode']) },
      { key: 'subdivision', label: 'Subdivision', getter: (p) => getField(p, ['SubdivisionName','Subdivision','subdivision']) },
      { key: 'school_district', label: 'School District', getter: (p) => getField(p, ['SchoolDistrict','HighSchoolDistrict','schoolDistrict']) },
      { key: 'high_school', label: 'High School', getter: (p) => getField(p, ['HighSchool','highSchool']) },
      { key: 'middle_school', label: 'Middle School', getter: (p) => getField(p, ['MiddleOrJuniorSchool','middleschool','MiddleSchool']) },
      { key: 'elementary', label: 'Elementary School', getter: (p) => getField(p, ['ElementarySchool','elementary']) },
    ]},
    { title: 'Listing Information', fields: [
      { key: 'mls', label: 'MLS Number', getter: (p) => getField(p, ['ListingKey','mlsNumber','ListingId']) },
      { key: 'list_date', label: 'List Date', getter: (p) => {
        const date = getField(p, ['ListingContractDate','listDate','OnMarketDate']);
        return date ? new Date(date).toLocaleDateString() : '—';
      }},
      { key: 'agent', label: 'Listing Agent', getter: (p) => getField(p, ['ListAgentFullName','agent_name','listing_agent']) },
      { key: 'office', label: 'Listing Office', getter: (p) => getField(p, ['ListOfficeName','office','ListingOffice']) },
    ]},
  ];

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="compare-modal-title" className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div ref={modalRef} className="relative w-full max-w-[1280px] h-[95vh] sm:max-h-[90vh] overflow-auto bg-white rounded-xl shadow-[0_6px_18px_rgba(0,0,0,0.08)] ring-1 ring-black/8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <h2 id="compare-modal-title" className="text-lg font-semibold text-gray-900">Compare properties</h2>
            <div className="text-sm text-gray-600">({selectedProps.length} selected)</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={saveSnapshot} className="px-2 py-1 rounded-md text-sm text-gray-700 hover:bg-gray-100">Save snapshot</button>
            <button onClick={shareLink} className="px-2 py-1 rounded-md text-sm text-gray-700 hover:bg-gray-100">Share</button>
            <button onClick={printView} className="px-2 py-1 rounded-md text-sm text-gray-700 hover:bg-gray-100">Print</button>
            <button ref={closeBtnRef} onClick={onClose} aria-label="Close compare modal" className="px-3 py-1 rounded-md text-sm bg-red-50 text-red-600">Close</button>
          </div>
        </header>

        {/* Summary carousel */}
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div className="text-sm font-medium text-gray-800">Summary</div>
            <div className="flex flex-wrap items-center gap-2">
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
                <div key={getId(p)} className="w-48 min-w-[12rem] sm:w-56 sm:min-w-[14rem] bg-white rounded-lg shadow-sm p-2 ring-1 ring-black/5">
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
          {viewMode === 'cards' ? (
            <div className="space-y-6">
              {SECTIONS.map((section) => (
                <section key={section.title} className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">{section.title}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedProps.map((p) => (
                      <div key={`${section.title}-${getId(p)}`} className="border rounded-lg p-3 bg-white">
                        <div className="text-sm font-semibold text-gray-900 truncate">{getAddress(p)}</div>
                        <div className="text-xs text-gray-500 mb-2">
                          {format(getBeds(p))} bd • {format(getBaths(p))} ba • {format(getSqft(p))} ft²
                        </div>
                        <div className="space-y-2">
                          {section.fields.map((f) => {
                            const raw = f.getter(p);
                            const value = Array.isArray(raw)
                              ? (raw.length ? raw.join(', ') : '—')
                              : (raw === null || raw === undefined || raw === '' ? '—' : String(raw));
                            return (
                              <div key={f.key} className="flex items-start justify-between gap-3 text-sm">
                                <span className="text-gray-500">{f.label}</span>
                                <span className="text-gray-900 text-right">{value}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <>
              {SECTIONS.map((section) => (
                <section key={section.title} className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">{section.title}</h3>
                  <div className="overflow-auto">
                    <div className="min-w-full grid" style={{ gridTemplateColumns: `160px repeat(${selectedProps.length}, minmax(200px, 1fr))` }}>
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
            </>
          )}
        </div>

        {/* Footer with simple mortgage snippet */}
        <footer className="p-4 border-t bg-white sticky bottom-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600">Estimated monthly (sample)</div>
              <div className="text-lg font-semibold text-gray-900">$1,234/mo</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => alert('Request tour — open contact flow')} className="px-4 py-2 bg-teal-500 text-white rounded-md shadow-sm">Request tour</button>
              <button onClick={() => alert('Message agent — open message flow')} className="px-4 py-2 border rounded-md">Message agent</button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { getPropertyDetails } from '../../services/trestleServices';

export default function CompareModal({ open = false, onClose = () => {}, properties = [], allSelectedIds = [] }) {
  const MAX_COMPARE = 4;
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [selectedProps, setSelectedProps] = useState(properties.slice(0, Math.min(MAX_COMPARE, properties.length)));
  const [isEnriching, setIsEnriching] = useState(false);

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
    // First check if saved properties have full property_data field
    let mounted = true;
    const enrich = async () => {
      if (!properties || properties.length === 0) return;
      const toProcess = properties.slice(0, Math.min(MAX_COMPARE, properties.length));

      // Check if properties need enrichment
      // Skip if property has property_data field OR has full MLS fields already
      const needsLookup = toProcess.some(p => {
        // If saved property has full property_data, no need to enrich
        if (p.property_data && typeof p.property_data === 'object') {
          return false;
        }
        // If saved property without property_data
        if (p.saved_at) {
          return true;
        }
        // If missing essential MLS data
        return !(p.BedroomsTotal || p.Bedrooms || p.LivingAreaSqFt || p.LivingArea || p.Media || p.mediaUrls);
      });

      if (!needsLookup) {
        console.log('CompareModal: All properties have full data, skipping enrichment');
        // Use property_data if available
        const enriched = toProcess.map(p => {
          if (p.property_data && typeof p.property_data === 'object') {
            return normalizeProperty({
              ...p.property_data,
              saved_at: p.saved_at,
              id: p.id,
              user_id: p.user_id
            });
          }
          return normalizeProperty(p);
        });
        setSelectedProps(enriched);
        setIsEnriching(false);
        return;
      }

      setIsEnriching(true);
      try {
        console.log('CompareModal: Starting enrichment for', toProcess.length, 'properties');
        const enriched = await Promise.all(toProcess.map(async (p) => {
          // If property has full property_data stored, use it instead of API call
          if (p.property_data && typeof p.property_data === 'object') {
            console.log('CompareModal: Using stored property_data for', p.listing_key || p.property_id);
            return normalizeProperty({
              ...p.property_data,
              saved_at: p.saved_at,
              id: p.id,
              user_id: p.user_id
            });
          }

          // Determine a listing key we can use to fetch full details
          const listingKey = p.ListingKey || p.listing_key || p.ListingId || p.listing_id || p.property_id || p.propertyId;
          if (!listingKey) {
            // No listing key; return normalized original row
            console.warn('CompareModal: property missing listing key', p);
            return normalizeProperty(p);
          }

          // Fetch from API for saved properties without property_data or properties missing essential data
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
              // Merge with full MLS data taking precedence over saved property minimal data
              // But preserve saved_at and user-specific fields from saved property
              const merged = {
                ...p, // keep saved property fields as fallback
                ...full, // overlay MLS fields when present
                saved_at: p.saved_at,
                id: p.id,
                user_id: p.user_id
              };
              console.log('CompareModal: Successfully enriched property', listingKey, {
                beds: merged.BedroomsTotal,
                baths: merged.BathroomsTotalInteger,
                sqft: merged.LivingArea,
                address: merged.UnparsedAddress,
                totalFields: Object.keys(merged).length
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
          console.log('CompareModal: Setting enriched properties', {
            count: enriched.length,
            sample: enriched[0] ? {
              address: enriched[0].UnparsedAddress,
              beds: enriched[0].BedroomsTotal,
              baths: enriched[0].BathroomsTotalInteger,
              sqft: enriched[0].LivingArea,
              totalKeys: Object.keys(enriched[0]).length
            } : null
          });
          setSelectedProps(enriched);
          setIsEnriching(false);
        }
      } catch (err) {
        console.error('CompareModal enrichment error:', err);
        setIsEnriching(false);
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
    const addr = getField(p, ['UnparsedAddress','Unparsed_Address','full_address','FullAddress','address','Address','address_line','StreetAddress','street_address']);
    if (typeof addr === 'string' && addr.trim()) return addr;
    
    // Try building from individual components if available
    const streetNumber = getField(p, ['StreetNumber','street_number','StreetNumberNumeric']);
    const streetName = getField(p, ['StreetName','street_name','StreetDirPrefix','StreetDirSuffix']);
    const city = getField(p, ['City','city']);
    const state = getField(p, ['StateOrProvince','state','State']);
    const zip = getField(p, ['PostalCode','postal_code','zip','ZipCode']);
    
    if (streetNumber || streetName) {
      const parts = [
        streetNumber,
        streetName,
        city,
        state,
        zip
      ].filter(Boolean);
      if (parts.length) return parts.join(' ').trim().replace(/\s+/g, ' ');
    }
    
    // Try nested address object
    const a = getField(p, ['address','Address','Property.Address','Location']);
    if (a && typeof a === 'object') {
      const parts = [
        accessPath(a,'StreetNumber') || accessPath(a,'Line') || accessPath(a,'line') || accessPath(a,'street') || accessPath(a,'StreetName'),
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

  // Helper function to format array values
  const formatValue = (raw) => {
    if (raw === null || raw === undefined || raw === '') return '—';
    if (Array.isArray(raw)) {
      if (raw.length === 0) return '—';
      // Join array items, handling both strings and objects
      const items = raw.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          // Try common value fields for objects in arrays
          return item.value || item.name || item.description || JSON.stringify(item);
        }
        return String(item);
      }).filter(Boolean);
      return items.length > 0 ? items.join(', ') : '—';
    }
    if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
    return String(raw);
  };

  // Helper to format numbers
  const formatNumber = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '—';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
  };

  // Helper to format currency
  const formatCurrency = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  };

  // Helper to convert arrays
  const asList = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
    return String(raw).split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  };

  // attributes to show in grid grouped into sections - matching active/pending/sold templates with all fields from PropertyFactsAndFeatures
  const SECTIONS = [
    { title: 'Key Facts', fields: [
      { key: 'status', label: 'Status', getter: (p) => formatValue(getField(p, ['StandardStatus','MlsStatus','status','Status'])) },
      { key: 'price', label: 'Price', getter: (p) => {
        const price = getPrice(p);
        return price ? formatCurrency(price) : '—';
      }},
      { key: 'price_per_sqft', label: 'Price per sq ft', getter: (p) => {
        const price = getPrice(p);
        const sqft = getSqft(p);
        if (price && sqft) {
          const perSqft = Number(price) / Number(sqft);
          return formatCurrency(perSqft);
        }
        return '—';
      }},
      { key: 'beds', label: 'Bedrooms', getter: getBeds },
      { key: 'baths', label: 'Bathrooms', getter: getBaths },
      { key: 'sqft', label: 'Living Area', getter: (p) => {
        const sqft = getSqft(p);
        return sqft ? `${formatNumber(sqft)} sq ft` : '—';
      }},
      { key: 'lot', label: 'Lot Size', getter: (p) => {
        const acres = getField(p, ['LotSizeAcres','lot_acres']);
        if (acres) return `${formatNumber(acres)} acres`;
        const sqft = getField(p, ['LotSizeSquareFeet','LotSizeArea','lot_sqft']);
        return sqft ? `${formatNumber(sqft)} sq ft` : '—';
      }},
      { key: 'type', label: 'Property Type', getter: (p) => formatValue(getField(p, ['PropertyType','property_type','type'])) },
      { key: 'year', label: 'Year Built', getter: getYear },
      { key: 'dom', label: 'Days on Market', getter: getDom },
      { key: 'mls', label: 'MLS Number', getter: (p) => formatValue(getField(p, ['ListingKey','mlsNumber','ListingId','MLSListingID'])) },
      { key: 'listing_date', label: 'Listing Date', getter: (p) => {
        const date = getField(p, ['ListingContractDate','listDate','OnMarketDate','OriginalEntryTimestamp']);
        return date ? new Date(date).toLocaleDateString() : '—';
      }},
      { key: 'close_date', label: 'Close Date', getter: (p) => {
        const date = getField(p, ['CloseDate','close_date']);
        return date ? new Date(date).toLocaleDateString() : '—';
      }},
      { key: 'taxes', label: 'Annual Taxes', getter: (p) => {
        const tax = getField(p, ['TaxAnnualAmount','taxes','tax_amount','TaxAmount']);
        return tax ? `${formatCurrency(tax)}/yr` : '—';
      }},
      { key: 'hoa', label: 'HOA Fee', getter: (p) => {
        const hoa = getField(p, ['AssociationFee','AssociationFee2','AssociationFeeMonthly','hoa_fees','hoa']);
        if (!hoa) return '—';
        const freq = getField(p, ['AssociationFeeFrequency','hoa_frequency']);
        return `${formatCurrency(hoa)}${freq ? '/' + freq : '/mo'}`;
      }},
    ]},
    { title: 'Price & Listing Details', fields: [
      { key: 'original_price', label: 'Original List Price', getter: (p) => {
        const price = getField(p, ['OriginalListPrice','original_list_price']);
        return price ? formatCurrency(price) : '—';
      }},
      { key: 'current_price', label: 'Current List Price', getter: (p) => {
        const price = getField(p, ['ListPrice','List_Price','list_price']);
        return price ? formatCurrency(price) : '—';
      }},
      { key: 'sold_price', label: 'Sold Price', getter: (p) => {
        const price = getField(p, ['ClosePrice','Close_Price','sold_price']);
        return price ? formatCurrency(price) : '—';
      }},
      { key: 'address', label: 'Address', getter: getAddress },
      { key: 'agent_name', label: 'Listing Agent', getter: (p) => formatValue(getField(p, ['ListAgentFullName','agent_name','listing_agent','ListAgentKey'])) },
      { key: 'agent_phone', label: 'Agent Phone', getter: (p) => formatValue(getField(p, ['ListAgentPhone','agent_phone','ListAgentDirectPhone'])) },
      { key: 'agent_email', label: 'Agent Email', getter: (p) => formatValue(getField(p, ['ListAgentEmail','agent_email'])) },
      { key: 'office', label: 'Listing Office', getter: (p) => formatValue(getField(p, ['ListOfficeName','office','ListingOffice','ListOfficeKey'])) },
      { key: 'county', label: 'County', getter: (p) => formatValue(getField(p, ['CountyOrParish','county','County'])) },
      { key: 'subdivision', label: 'Subdivision', getter: (p) => formatValue(getField(p, ['SubdivisionName','Subdivision','subdivision','Neighborhood'])) },
      { key: 'school_district', label: 'School District', getter: (p) => formatValue(getField(p, ['SchoolDistrict','HighSchoolDistrict','schoolDistrict'])) },
      { key: 'zoning', label: 'Zoning', getter: (p) => formatValue(getField(p, ['ZoningDescription','zoning'])) },
      { key: 'parcel', label: 'Parcel Number', getter: (p) => formatValue(getField(p, ['ParcelNumber','TaxParcelId','parcel','parcel_number'])) },
    ]},
    { title: 'Interior Features', fields: [
      { key: 'rooms', label: 'Total Rooms', getter: (p) => formatValue(getField(p, ['RoomsTotal','rooms','Rooms'])) },
      { key: 'basement', label: 'Basement', getter: (p) => {
        const basement = getField(p, ['Basement','basement','HasBasement','BasementYN']);
        if (typeof basement === 'boolean') return basement ? 'Yes' : 'No';
        return formatValue(basement);
      }},
      { key: 'heating', label: 'Heating', getter: (p) => formatValue(getField(p, ['Heating','heating','HeatingYN','HeatingTypes'])) },
      { key: 'cooling', label: 'Cooling', getter: (p) => formatValue(getField(p, ['Cooling','cooling','CoolingYN','CoolingTypes'])) },
      { key: 'flooring', label: 'Flooring', getter: (p) => formatValue(getField(p, ['Flooring','flooring','FlooringTypes'])) },
      { key: 'fireplace_num', label: 'Fireplaces', getter: (p) => formatValue(getField(p, ['FireplaceNumber','fireplaces','FireplacesTotal'])) },
      { key: 'fireplace_features', label: 'Fireplace Features', getter: (p) => formatValue(getField(p, ['FireplaceFeatures','fireplacefeatures'])) },
      { key: 'appliances', label: 'Appliances', getter: (p) => {
        const appliances = asList(getField(p, ['Appliances','appliances','AppliancesIncluded']));
        return appliances.length > 0 ? appliances.join(', ') : '—';
      }},
      { key: 'interior_features', label: 'Interior Features', getter: (p) => {
        const features = asList(getField(p, ['InteriorFeatures','interiorFeatures','RoomFeatures']));
        return features.length > 0 ? features.join(', ') : '—';
      }},
    ]},
    { title: 'Exterior Features', fields: [
      { key: 'parking', label: 'Parking', getter: (p) => {
        const total = getField(p, ['ParkingTotal','parking_total']);
        if (total) return `${total} spaces`;
        return formatValue(getField(p, ['ParkingFeatures','parking','parkingFeatures']));
      }},
      { key: 'garage', label: 'Garage', getter: (p) => {
        const spaces = getField(p, ['GarageSpaces','garage','GarageYN','garage_spaces']);
        if (spaces) return `${spaces} spaces`;
        return formatValue(spaces);
      }},
      { key: 'pool', label: 'Pool', getter: (p) => {
        const poolYN = getField(p, ['PoolPrivateYN','pool','Pool','PoolYN']);
        const poolFeatures = getField(p, ['PoolFeatures','poolFeatures']);
        if (poolYN === true || poolYN === 'Yes' || poolYN === 'Y') {
          return poolFeatures ? `Yes - ${formatValue(poolFeatures)}` : 'Yes';
        }
        if (poolYN === false || poolYN === 'No' || poolYN === 'N') return 'No';
        if (poolFeatures) return formatValue(poolFeatures);
        return '—';
      }},
      { key: 'view', label: 'View', getter: (p) => formatValue(getField(p, ['View','view','ViewType'])) },
      { key: 'construction', label: 'Construction Materials', getter: (p) => formatValue(getField(p, ['ConstructionMaterials','construction','BuildingConstruction'])) },
      { key: 'roof', label: 'Roof', getter: (p) => formatValue(getField(p, ['Roof','RoofMaterialType','roof','RoofMaterials'])) },
      { key: 'architectural_style', label: 'Architectural Style', getter: (p) => formatValue(getField(p, ['ArchitecturalStyle','style','architectural_style'])) },
      { key: 'foundation', label: 'Foundation', getter: (p) => formatValue(getField(p, ['FoundationDetails','foundation','FoundationArea'])) },
      { key: 'exterior_features', label: 'Exterior Features', getter: (p) => {
        const features = asList(getField(p, ['ExteriorFeatures','exteriorFeatures','ExteriorsFeatures']));
        return features.length > 0 ? features.join(', ') : '—';
      }},
      { key: 'lot_features', label: 'Lot Features', getter: (p) => {
        const features = asList(getField(p, ['LotFeatures','lotFeatures']));
        return features.length > 0 ? features.join(', ') : '—';
      }},
      { key: 'patio', label: 'Patio/Deck', getter: (p) => formatValue(getField(p, ['PatioAndPorchFeatures','patio','deck'])) },
      { key: 'fence', label: 'Fencing', getter: (p) => formatValue(getField(p, ['Fencing','fence','FenceYN'])) },
    ]},
    { title: 'Utilities & Services', fields: [
      { key: 'utilities', label: 'Utilities', getter: (p) => formatValue(getField(p, ['Utilities','utilities','UtilitiesIncluded'])) },
      { key: 'water', label: 'Water Source', getter: (p) => formatValue(getField(p, ['WaterSource','waterSource','water','WaterSourceType'])) },
      { key: 'sewer', label: 'Sewer', getter: (p) => formatValue(getField(p, ['Sewer','sewer','SewerType'])) },
      { key: 'electric', label: 'Electric', getter: (p) => formatValue(getField(p, ['Electric','electric','ElectricSource'])) },
    ]},
    { title: 'Location & Community', fields: [
      { key: 'city', label: 'City', getter: (p) => formatValue(getField(p, ['City','city'])) },
      { key: 'state', label: 'State', getter: (p) => formatValue(getField(p, ['StateOrProvince','state','State'])) },
      { key: 'zip', label: 'Zip Code', getter: (p) => formatValue(getField(p, ['PostalCode','zip','postalCode','ZipCode'])) },
      { key: 'directions', label: 'Directions', getter: (p) => formatValue(getField(p, ['Directions','directions'])) },
      { key: 'lot_dimensions', label: 'Lot Dimensions', getter: (p) => formatValue(getField(p, ['LotSizeDimensions','lot_dimensions'])) },
      { key: 'topography', label: 'Topography', getter: (p) => formatValue(getField(p, ['Topography','topography'])) },
      { key: 'community_features', label: 'Community Features', getter: (p) => {
        const features = asList(getField(p, ['CommunityFeatures','communityFeatures']));
        return features.length > 0 ? features.join(', ') : '—';
      }},
      { key: 'amenities', label: 'Association Amenities', getter: (p) => {
        const amenities = asList(getField(p, ['AssociationAmenities','associationAmenities']));
        return amenities.length > 0 ? amenities.join(', ') : '—';
      }},
    ]},
    { title: 'Schools', fields: [
      { key: 'high_school', label: 'High School', getter: (p) => formatValue(getField(p, ['HighSchool','highSchool','HighSchoolName'])) },
      { key: 'high_school_district', label: 'High School District', getter: (p) => formatValue(getField(p, ['HighSchoolDistrict','high_school_district'])) },
      { key: 'middle_school', label: 'Middle School', getter: (p) => formatValue(getField(p, ['MiddleOrJuniorSchool','middleschool','MiddleSchool','MiddleSchoolName'])) },
      { key: 'middle_school_district', label: 'Middle School District', getter: (p) => formatValue(getField(p, ['MiddleOrJuniorSchoolDistrict','middle_school_district'])) },
      { key: 'elementary', label: 'Elementary School', getter: (p) => formatValue(getField(p, ['ElementarySchool','elementary','ElementarySchoolName'])) },
      { key: 'elementary_district', label: 'Elementary District', getter: (p) => formatValue(getField(p, ['ElementarySchoolDistrict','elementary_district'])) },
    ]},
    { title: 'HOA Information', fields: [
      { key: 'hoa_yn', label: 'Has HOA', getter: (p) => {
        const hasHOA = getField(p, ['AssociationYN','hoa_yn']);
        if (typeof hasHOA === 'boolean') return hasHOA ? 'Yes' : 'No';
        if (hasHOA === 'Y' || hasHOA === 'Yes') return 'Yes';
        if (hasHOA === 'N' || hasHOA === 'No') return 'No';
        return '—';
      }},
      { key: 'hoa_name', label: 'HOA Name', getter: (p) => formatValue(getField(p, ['AssociationName','hoa_name'])) },
      { key: 'hoa_phone', label: 'HOA Phone', getter: (p) => formatValue(getField(p, ['AssociationPhone','hoa_phone'])) },
      { key: 'hoa_fee_includes', label: 'HOA Fee Includes', getter: (p) => {
        const includes = asList(getField(p, ['AssociationFeeIncludes','hoa_fee_includes']));
        return includes.length > 0 ? includes.join(', ') : '—';
      }},
      { key: 'hoa_name2', label: 'HOA Name 2', getter: (p) => formatValue(getField(p, ['AssociationName2','hoa_name2'])) },
      { key: 'hoa_fee2', label: 'HOA Fee 2', getter: (p) => {
        const fee = getField(p, ['AssociationFee2','hoa_fee2']);
        return fee ? formatCurrency(fee) : '—';
      }},
    ]},
    { title: 'Additional Details', fields: [
      { key: 'stories', label: 'Stories', getter: (p) => formatValue(getField(p, ['Stories','stories','StoriesTotal'])) },
      { key: 'lot_size_units', label: 'Lot Size Units', getter: (p) => formatValue(getField(p, ['LotSizeUnits','lot_size_units'])) },
      { key: 'mls_area', label: 'MLS Area', getter: (p) => formatValue(getField(p, ['MLSAreaMajor','mls_area'])) },
      { key: 'modification_date', label: 'Last Modified', getter: (p) => {
        const date = getField(p, ['ModificationTimestamp','modified_date','UpdatedDate']);
        return date ? new Date(date).toLocaleDateString() : '—';
      }},
      { key: 'tax_year', label: 'Tax Year', getter: (p) => formatValue(getField(p, ['TaxYear','tax_year'])) },
      { key: 'remarks', label: 'Public Remarks', getter: (p) => {
        const remarks = getField(p, ['PublicRemarks','remarks','description','Description']);
        if (!remarks) return '—';
        const text = String(remarks);
        return text.length > 150 ? text.substring(0, 150) + '...' : text;
      }},
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
            {isEnriching && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                <span>Loading full details...</span>
              </div>
            )}
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
                            const value = f.getter(p);
                            // Getters now return pre-formatted values
                            const displayValue = (value === null || value === undefined || value === '') ? '—' : String(value);
                            return (
                              <div key={f.key} className="flex items-start justify-between gap-3 text-sm">
                                <span className="text-gray-500">{f.label}</span>
                                <span className="text-gray-900 text-right break-words">{displayValue}</span>
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
                            const value = f.getter(p);
                            // Getters now return pre-formatted values
                            const displayValue = (value === null || value === undefined || value === '') ? '—' : String(value);
                            return (
                              <div key={f.key} className="py-3 text-sm text-gray-800 border-t break-words">
                                {displayValue}
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

        <footer className="p-4 border-t bg-white sticky bottom-0">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button onClick={() => alert('Request tour — open contact flow')} className="px-4 py-2 bg-teal-500 text-white rounded-md shadow-sm">Request tour</button>
            <button onClick={() => alert('Message agent — open message flow')} className="px-4 py-2 border rounded-md">Message agent</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

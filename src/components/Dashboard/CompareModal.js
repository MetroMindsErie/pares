import React, { useEffect, useRef, useState } from 'react';

export default function CompareModal({ open = false, onClose = () => {}, properties = [], allSelectedIds = [] }) {
  const MAX_COMPARE = 4;
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [selectedProps, setSelectedProps] = useState(properties.slice(0, Math.min(MAX_COMPARE, properties.length)));

  useEffect(() => {
    // Sync when open or when properties change
    setSelectedProps(properties.slice(0, Math.min(MAX_COMPARE, properties.length)));
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

  // defensive getters
  const getId = (p) => p.id ?? p.mlsId ?? p.listing_id ?? p.uuid ?? p._id ?? (p.address ? String(p.address) : null);
  const getPrice = (p) => p.price ?? p.list_price ?? p.listingPrice ?? p.amount ?? null;
  const getBeds = (p) => p.beds ?? p.bedrooms ?? p.bed_count ?? null;
  const getBaths = (p) => p.baths ?? p.bathrooms ?? p.bath_count ?? null;
  const getSqft = (p) => p.sqft ?? p.livingspace ?? p.building_area ?? null;
  const getLot = (p) => p.lot_sqft ?? p.lot_size ?? p.lotArea ?? null;
  const getYear = (p) => p.year_built ?? p.yearBuilt ?? p.year ?? null;
  const getDom = (p) => p.days_on_market ?? p.dom ?? null;
  const getAddress = (p) => (p.address?.line ? p.address.line : p.full_address ?? p.address ?? `${p.street ?? ''}${p.city ? ', ' + p.city : ''}`).trim() || '—';
  const getPhotos = (p) => p.photos ?? p.images ?? (p.image ? [p.image] : []) ?? [];

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

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { extractDetails, printPropertyPdf } from '../../utils/pdfTemplate';
import { getPropertyDetails } from '../../services/trestleServices';

/** Small detail pill */
const DetailPill = ({ label, value }) => {
  if (value == null || value === '' || value === 'None') return null;
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-slate-500">{label}:</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
};

/* ---------------------------------------------------------------- */
/*  Single-property detail panel (inline, not modal)                 */
/* ---------------------------------------------------------------- */
const PropertyDetailPanel = ({ property, d, onClose, onPrint, onDelete, isDeleting, isEnriching }) => (
  <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white border rounded-xl shadow-xl ring-2 ring-[#2563EB]/15 overflow-hidden animate-[fadeIn_0.2s_ease-in]">
    {/* Top bar */}
    <div className="flex items-center justify-between bg-gradient-to-r from-[#2563EB]/5 to-transparent px-5 py-3 border-b border-gray-100">
      <h3 className="text-base font-semibold text-slate-800 truncate">{d.address}</h3>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onPrint(property)}
          disabled={isEnriching}
          className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition ${
            isEnriching
              ? 'bg-[#2563EB]/50 text-white cursor-wait'
              : 'bg-[#2563EB] text-white hover:bg-[#2563EB]/90'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {isEnriching ? 'Loading…' : 'Save PDF'}
        </button>
        <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-md border border-gray-200 text-slate-600 hover:bg-gray-50">
          Close
        </button>
      </div>
    </div>

    <div className="flex flex-col lg:flex-row">
      {/* Left – photo */}
      <div className="lg:w-2/5 shrink-0">
        <img
          src={d.imageUrl}
          alt={d.address}
          className="w-full h-64 lg:h-full object-cover"
          onError={(e) => { e.target.src = '/fallback-property.jpg'; }}
        />
      </div>

      {/* Right – details */}
      <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[520px]">
        {/* Price + highlights */}
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <span className="text-2xl font-bold text-teal-600">
            {d.price ? `$${Number(d.price).toLocaleString()}` : '—'}
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {d.beds != null && <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full">{d.beds} bd</span>}
            {d.baths != null && <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full">{d.baths} ba</span>}
            {d.sqft && <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full">{Number(d.sqft).toLocaleString()} sqft</span>}
            {d.yearBuilt && <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full">Built {d.yearBuilt}</span>}
          </div>
        </div>

        {d.city && (
          <p className="text-sm text-slate-500">{[d.address, d.city, d.state, d.zip].filter(Boolean).join(', ')}</p>
        )}
        {d.mls && <p className="text-xs text-slate-400">MLS# {d.mls}</p>}

        {/* Key facts grid */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Property Details</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
            <DetailPill label="Type" value={d.type} />
            <DetailPill label="Beds" value={d.beds} />
            <DetailPill label="Baths" value={d.baths} />
            <DetailPill label="Living Area" value={d.sqft ? `${Number(d.sqft).toLocaleString()} sqft` : null} />
            <DetailPill label="Lot Size" value={d.lotSize ? `${d.lotSize} ${d.lotUnits}` : null} />
            <DetailPill label="Year Built" value={d.yearBuilt} />
            <DetailPill label="Stories" value={d.stories} />
            <DetailPill label="Garage" value={d.garage ? `${d.garage} spaces` : null} />
            <DetailPill label="Basement" value={d.basement} />
          </div>
        </div>

        {/* Financial */}
        {(d.taxes || d.dom != null || d.hoa) && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Financial & Market</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
              <DetailPill label="Taxes" value={d.taxes ? `$${Number(d.taxes).toLocaleString()}/yr` : null} />
              <DetailPill label="Days on Market" value={d.dom != null ? `${d.dom} days` : null} />
              <DetailPill label="HOA" value={d.hoa ? `$${Number(d.hoa).toLocaleString()}${d.hoaFreq ? ' / ' + d.hoaFreq : ''}` : null} />
              {d.price && d.sqft && (
                <DetailPill label="Price/sqft" value={`$${Math.round(Number(d.price) / Number(d.sqft)).toLocaleString()}`} />
              )}
            </div>
          </div>
        )}

        {/* Location */}
        {(d.county || d.heating || d.cooling) && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Location & Climate</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
              <DetailPill label="County" value={d.county} />
              <DetailPill label="Heating" value={d.heating} />
              <DetailPill label="Cooling" value={d.cooling} />
            </div>
          </div>
        )}

        {/* Schools */}
        {(d.elemSchool || d.midSchool || d.hiSchool) && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Schools</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1.5">
              <DetailPill label="Elementary" value={d.elemSchool} />
              <DetailPill label="Middle" value={d.midSchool} />
              <DetailPill label="High" value={d.hiSchool} />
            </div>
          </div>
        )}

        {/* Description */}
        {d.remarks && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Description</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{d.remarks}</p>
          </div>
        )}

        {/* No full data warning — only show when enrichment yielded no useful fields */}
        {!d.beds && !d.baths && !d.sqft && !d.yearBuilt && !d.remarks && (
          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
            Limited details available. <Link href={`/property/${property.listing_key}`} className="underline font-medium">View full listing</Link> to see all information.
          </p>
        )}

        {/* Bottom actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          <Link
            href={`/property/${property.listing_key}`}
            className="text-sm px-4 py-2 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            View Full Listing
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(property.id)}
              disabled={isDeleting}
              className={`text-sm px-4 py-2 rounded-md border transition ${
                isDeleting
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
              }`}
            >
              {isDeleting ? 'Deleting…' : 'Remove from Saved'}
            </button>
          )}
          <span className="text-xs text-slate-400 self-center ml-auto">
            Saved {new Date(property.saved_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  </div>
);

/* ---------------------------------------------------------------- */
/*  Main component                                                    */
/* ---------------------------------------------------------------- */
const SavedProperties = ({ properties, isLoading, error, onDelete, deletingIds }) => {
  const [expandedId, setExpandedId] = useState(null);
  // Enriched versions of properties that were saved without full property_data
  const [enrichedMap, setEnrichedMap] = useState({});
  // IDs currently being enriched — used to show loading state on PDF button
  const [enrichingIds, setEnrichingIds] = useState(new Set());

  // When properties load, enrich any entries that are missing property_data by
  // fetching live MLS details — same pattern as CompareModal
  useEffect(() => {
    if (!properties || properties.length === 0) return;

    const toEnrich = properties.filter(
      (p) => !(p.property_data && typeof p.property_data === 'object')
    );
    if (toEnrich.length === 0) return;

    // Mark all pending IDs upfront so the PDF button can show a loading state
    setEnrichingIds(new Set(toEnrich.map((p) => p.id)));

    let mounted = true;
    Promise.all(
      toEnrich.map(async (p) => {
        const key = p.listing_key || p.property_id;
        if (!key) return [p.id, p];
        try {
          const full = await getPropertyDetails(String(key));
          if (!full) return [p.id, p];
          return [p.id, { ...p, ...full, saved_at: p.saved_at, id: p.id, user_id: p.user_id }];
        } catch {
          return [p.id, p];
        }
      })
    ).then((results) => {
      if (!mounted) return;
      setEnrichedMap((prev) => {
        const next = { ...prev };
        results.forEach(([id, enriched]) => { next[id] = enriched; });
        return next;
      });
      setEnrichingIds(new Set());
    });

    return () => { mounted = false; };
  }, [properties]);

  // Pre-extract details for all properties — uses enriched data when available
  const detailsMap = useMemo(() => {
    const map = {};
    (properties || []).forEach((p) => {
      const src = enrichedMap[p.id] || p;
      map[p.id] = extractDetails(src);
    });
    return map;
  }, [properties, enrichedMap]);

  const toggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handlePrint = useCallback((property) => {
    // Use enriched version so PDF has full MLS details
    const enriched = enrichedMap[property.id] || property;
    printPropertyPdf(enriched);
  }, [enrichedMap]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Saved Properties</h2>
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Saved Properties</h2>
        <p className="text-red-500">Error loading saved properties</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Saved Properties</h2>
      {properties.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No saved properties yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => {
            const isDeleting = deletingIds?.has(property.id);
            const isExpanded = expandedId === property.id;
            const isEnriching = enrichingIds.has(property.id);
            // Use enriched version when available
            const effectiveProp = enrichedMap[property.id] || property;
            const d = detailsMap[property.id] || extractDetails(effectiveProp);

            /* ---- expanded: full detail panel ---- */
            if (isExpanded) {
              return (
                <PropertyDetailPanel
                  key={property.id}
                  property={effectiveProp}
                  d={d}
                  onClose={() => setExpandedId(null)}
                  onPrint={handlePrint}
                  onDelete={onDelete}
                  isDeleting={isDeleting}
                  isEnriching={isEnriching}
                />
              );
            }

            /* ---- collapsed: card ---- */
            return (
              <div key={property.id} className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <Link href={`/property/${property.listing_key}`} className="block">
                  <div className="relative h-48 w-full">
                    <img
                      src={d.imageUrl}
                      alt={d.address}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/fallback-property.jpg'; }}
                    />
                    {/* Quick stat badges */}
                    {d.beds != null && (
                      <div className="absolute bottom-2 left-2 flex gap-1.5">
                        <span className="bg-black/70 text-white text-xs px-2 py-0.5 rounded">{d.beds} bd</span>
                        {d.baths != null && <span className="bg-black/70 text-white text-xs px-2 py-0.5 rounded">{d.baths} ba</span>}
                        {d.sqft && <span className="bg-black/70 text-white text-xs px-2 py-0.5 rounded">{Number(d.sqft).toLocaleString()} sqft</span>}
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-4 space-y-1">
                  <p className="font-medium text-lg text-teal-600">
                    {d.price ? `$${Number(d.price).toLocaleString()}` : '—'}
                  </p>
                  <p className="text-gray-600 text-sm truncate">{d.address}</p>
                  <p className="text-gray-400 text-xs">
                    Saved {new Date(property.saved_at).toLocaleDateString()}
                  </p>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-50">
                    <button
                      onClick={() => toggleExpand(property.id)}
                      className="text-sm px-3 py-1.5 rounded-md border border-gray-200 text-slate-700 hover:bg-gray-50 transition"
                    >
                      ▼ Details
                    </button>
                    <button
                      onClick={() => handlePrint(property)}
                      className="text-sm px-3 py-1.5 rounded-md border border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/5 transition flex items-center gap-1"
                      title="Save as PDF"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      PDF
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(property.id)}
                        disabled={isDeleting}
                        className={`text-sm px-3 py-1.5 rounded-md border transition ml-auto ${
                          isDeleting
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        {isDeleting ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedProperties;

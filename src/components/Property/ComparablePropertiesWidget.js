"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const formatPrice = (price) => {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(n);
};

const formatNumber = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return n.toLocaleString();
};

const buildAddress = (property) => {
  if (!property) return '';
  const unparsed = property.UnparsedAddress || property.address;
  if (unparsed) return String(unparsed).trim();

  const street = `${property.StreetNumber || ''} ${property.StreetName || ''}`.trim();
  const city = property.City || property.PostalCity || '';
  const state = property.StateOrProvince || property.State || 'PA';
  const zip = property.PostalCode || '';

  const parts = [street, city, state, zip].filter(Boolean);
  if (parts.length) return parts.join(', ').replace(/,\s+,/g, ', ');

  const fallback = [city, state, zip].filter(Boolean).join(' ');
  return fallback.trim();
};

export default function ComparablePropertiesWidget({ property, variant = 'scroll' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [comps, setComps] = useState([]);
  const [priceRange, setPriceRange] = useState(null);
  const [compStats, setCompStats] = useState(null);
  const [relaxationNotes, setRelaxationNotes] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const isSide = variant === 'side';

  const subjectId = useMemo(
    () => String(property?.ListingKey || property?.ListingId || property?.id || ''),
    [property?.ListingKey, property?.ListingId, property?.id]
  );

  const address = useMemo(() => buildAddress(property), [property]);
  const county = useMemo(() => String(property?.CountyOrParish || property?.County || ''), [property?.CountyOrParish, property?.County]);
  const zip = useMemo(() => String(property?.PostalCode || ''), [property?.PostalCode]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const run = async () => {
      if (!address) {
        setError('Address unavailable for comparable search.');
        setLoading(false);
        setComps([]);
        setPriceRange(null);
        setCompStats(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const countyTrim = String(county || '').trim();
        const zipTrim = String(zip || '').trim();
        const useSubjectId = !(countyTrim && zipTrim);

        const res = await fetch('/api/ai/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            address,
            county: county || undefined,
            zip: zip || undefined,
            subject_id: useSubjectId ? subjectId || undefined : undefined
          })
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          let parsed = null;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = null;
          }
          const message = parsed?.error || parsed?.answer || text || `Pricing failed (${res.status})`;
          throw new Error(String(message).slice(0, 300));
        }

        const data = await res.json();
        const rows = Array.isArray(data?.listings) ? data.listings : [];
        const filtered = rows.filter((row) => String(row?.id || '') !== subjectId);

        if (!active) return;
        setComps(filtered);
        setPriceRange(data?.price_range || null);
        setCompStats(data?.comp_stats || null);
        const notes = Array.isArray(data?.reasoning)
          ? data.reasoning.filter((r) => typeof r === 'string' && (r.startsWith('Relaxed pricing comps:') || r.startsWith('ZIP code looks inconsistent')))
          : [];
        setRelaxationNotes(notes);
      } catch (err) {
        if (!active) return;
        if (err?.name === 'AbortError') return;
        setError(err?.message || 'Failed to load comparable properties.');
        setComps([]);
        setPriceRange(null);
        setCompStats(null);
        setRelaxationNotes([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [address, county, zip, subjectId, refreshKey]);

  const hasRange = priceRange?.low && priceRange?.high;

  const containerClass = isSide
    ? 'bg-white rounded-lg shadow-md p-4 sm:p-5'
    : 'bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8';
  const maxCards = isSide ? 4 : 12;

  return (
    <section className={containerClass}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Comparable Properties Nearby</h3>
          <p className="text-sm text-gray-600">
            Closed sales used for CMA-style pricing near this listing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className={
            isSide
              ? 'self-start px-2.5 py-1 rounded-md text-xs border border-gray-200 text-gray-700 hover:bg-gray-50'
              : 'self-start px-3 py-1.5 rounded-md text-sm border border-gray-200 text-gray-700 hover:bg-gray-50'
          }
        >
          Refresh comps
        </button>
      </div>

      {hasRange && (
        <div className="mt-3 text-sm text-gray-700">
          Estimated range from comps: <span className="font-semibold">{formatPrice(priceRange.low)}–{formatPrice(priceRange.high)}</span>
          {compStats?.comps ? <span className="text-gray-500"> · {compStats.comps} comps</span> : null}
        </div>
      )}

      {!loading && !error && relaxationNotes.length > 0 && (
        <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="font-semibold mb-1">Search expanded</div>
          <ul className="list-disc pl-5 space-y-1">
            {relaxationNotes.slice(0, 3).map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {loading && (
        <div className={isSide ? 'mt-4 grid gap-3' : 'mt-4 flex gap-4 overflow-x-auto pb-2'}>
          {Array.from({ length: maxCards }).map((_, idx) => (
            <div
              key={idx}
              className={isSide ? 'h-24 rounded-lg bg-gray-100 animate-pulse' : 'w-56 shrink-0'}
            >
              <div className="h-32 rounded-lg bg-gray-100 animate-pulse" />
              <div className="mt-2 h-4 rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && comps.length === 0 && (
        <div className="mt-4 text-sm text-gray-600">No comparable properties found nearby.</div>
      )}

      {!loading && !error && comps.length > 0 && (
        <div className={isSide ? 'mt-4 grid gap-3' : 'mt-4 flex gap-4 overflow-x-auto pb-2'}>
          {comps.slice(0, maxCards).map((comp) => {
            const compId = String(comp?.id || '');
            const beds = comp?.beds ?? '—';
            const baths = comp?.baths ?? '—';
            const sqft = formatNumber(comp?.sqft);
            // Use image_url as primary (contains the preferred/primary photo), fallback to first media URL, then default
            const img = comp?.image_url || (comp?.media_urls?.[0]) || '/fallback-property.jpg';
            return (
              <div
                key={compId || comp?.address}
                className={
                  isSide
                    ? 'border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow'
                    : 'w-64 shrink-0 border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-sm transition-shadow'
                }
              >
                <div className={isSide ? 'hidden' : 'h-36 bg-gray-100'}>
                  <img
                    src={img}
                    alt={comp?.address || 'Comparable property'}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className={isSide ? '' : 'p-3'}>
                  <div className="text-sm font-semibold text-gray-900 truncate">{comp?.address || 'Address unavailable'}</div>
                  <div className="text-xs text-gray-500">{comp?.city || ''}{comp?.zip ? `, ${comp.zip}` : ''}</div>
                  <div className="mt-2 text-sm font-semibold text-teal-700">{formatPrice(comp?.price)}</div>
                  <div className="text-xs text-gray-600">{beds} bd • {baths} ba • {sqft} sq ft</div>
                  <div className="text-xs text-gray-500">Status: {comp?.status || '—'}</div>
                  {compId ? (
                    <Link
                      href={`/property/${compId}`}
                      className="inline-flex items-center mt-2 text-xs text-teal-600 hover:text-teal-700"
                    >
                      View details
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

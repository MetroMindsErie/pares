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

export default function ActiveNearbyPropertiesWidget({ property }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listings, setListings] = useState([]);

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
        setError('Address unavailable for nearby search.');
        setLoading(false);
        setListings([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/ai/active-nearby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            address,
            county: county || undefined,
            zip: zip || undefined,
            subject_id: subjectId || undefined,
            price: property?.ListPrice || undefined,
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
          const message = parsed?.error || text || `Nearby search failed (${res.status})`;
          throw new Error(String(message).slice(0, 300));
        }

        const data = await res.json();
        const rows = Array.isArray(data?.listings) ? data.listings : [];
        const filtered = rows.filter((row) => String(row?.id || '') !== subjectId);

        if (!active) return;
        setListings(filtered);
      } catch (err) {
        if (!active) return;
        if (err?.name === 'AbortError') return;
        setError(err?.message || 'Failed to load nearby active properties.');
        setListings([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [address, county, zip, subjectId, property?.ListPrice]);

  return (
    <section className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Active properties nearby</h3>
          <p className="text-sm text-gray-600">Similar listings currently for sale in your area.</p>
        </div>
      </div>

      {loading && (
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="w-56 shrink-0">
              <div className="h-32 rounded-lg bg-gray-100 animate-pulse" />
              <div className="mt-2 h-4 rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && listings.length === 0 && (
        <div className="mt-4 text-sm text-gray-600">No similar active properties found nearby.</div>
      )}

      {!loading && !error && listings.length > 0 && (
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
          {listings.slice(0, 12).map((item) => {
            const itemId = String(item?.id || '');
            const beds = item?.beds ?? '—';
            const baths = item?.baths ?? '—';
            const sqft = formatNumber(item?.sqft);
            // Use image_url as primary (contains the preferred/primary photo), fallback to first media URL, then default
            const img = item?.image_url || (item?.media_urls?.[0]) || '/fallback-property.jpg';

            return (
              <div
                key={itemId || item?.address}
                className="w-64 shrink-0 border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-sm transition-shadow"
              >
                <div className="h-36 bg-gray-100">
                  <img
                    src={img}
                    alt={item?.address || 'Nearby property'}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold text-gray-900 truncate">{item?.address || 'Address unavailable'}</div>
                  <div className="text-xs text-gray-500">{item?.city || ''}{item?.zip ? `, ${item.zip}` : ''}</div>
                  <div className="mt-2 text-sm font-semibold text-blue-700">{formatPrice(item?.price)}</div>
                  <div className="text-xs text-gray-600">{beds} bd • {baths} ba • {sqft} sq ft</div>
                  <div className="text-xs text-gray-500">Status: {item?.status || 'Active'}</div>
                  {itemId ? (
                    <Link
                      href={`/property/${itemId}`}
                      className="inline-flex items-center mt-2 text-xs text-blue-600 hover:text-blue-700"
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
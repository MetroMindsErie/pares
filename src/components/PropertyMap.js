'use client';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [41.8, -79.5]; // Erie, PA area

function isValidLatLng(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  if (Math.abs(la) < 0.001 && Math.abs(lo) < 0.001) return false;
  if (la < -90 || la > 90) return false;
  if (lo < -180 || lo > 180) return false;
  return true;
}

/** Try to extract coords directly from listing fields */
function getDirectCoords(l) {
  const lat = Number(l?.Latitude ?? l?.latitude ?? l?.lat);
  const lng = Number(l?.Longitude ?? l?.longitude ?? l?.lng);
  if (isValidLatLng(lat, lng)) return { lat, lng };
  return null;
}

/** Build a geocodable address string from a listing */
function buildGeoQuery(l) {
  const parts = [
    l?.UnparsedAddress || l?.address || [l?.StreetNumber, l?.StreetName].filter(Boolean).join(' '),
    l?.City || l?.PostalCity,
    l?.StateOrProvince || l?.state,
    l?.PostalCode || l?.zip,
  ].filter(Boolean);
  return parts.join(', ').trim();
}

function getListingKey(l) {
  return l?.ListingKey || l?.ListingId || l?.listingKey || l?.id;
}

const getDisplayAddress = (l) =>
  l?.UnparsedAddress || l?.address ||
  [l?.StreetNumber, l?.StreetName, l?.PostalCity, l?.StateOrProvince].filter(Boolean).join(' ') ||
  'Property';

function getPhoto(l) {
  if (l?.media && l.media !== '/fallback-property.jpg') return l.media;
  if (l?.Media?.[0]?.MediaURL) return l.Media[0].MediaURL;
  if (Array.isArray(l?.mediaArray) && l.mediaArray[0]) return l.mediaArray[0];
  if (l?.primary_photo_url) return l.primary_photo_url;
  return null;
}

/** Fit the map to all resolved points */
function FitBounds({ points }) {
  const map = useMap();
  const lastCountRef = useRef(0);

  useEffect(() => {
    if (!map || !points || points.length === 0) return;
    // Only re-fit when new points appear
    if (points.length === lastCountRef.current) return;
    lastCountRef.current = points.length;

    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
    } else {
      map.fitBounds(points, { padding: [30, 30], maxZoom: 15, animate: true });
    }
  }, [map, points]);
  return null;
}

/** Local storage cache for geocode results (instant on revisit even before API call) */
const LOCAL_CACHE_KEY = 'pares:geocode:v2';
const LOCAL_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

function loadLocalCache() {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed._ts && Date.now() - parsed._ts > LOCAL_CACHE_TTL) {
      localStorage.removeItem(LOCAL_CACHE_KEY);
      return {};
    }
    return parsed.data || {};
  } catch { return {}; }
}

function saveLocalCache(data) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({ _ts: Date.now(), data }));
  } catch { /* storage full */ }
}

const PropertyMap = ({ listings, onLocationSelect }) => {
  const [coordsMap, setCoordsMap] = useState({});   // key -> {lat,lng}
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ cached: 0, total: 0 });
  const abortRef = useRef(null);

  // Batch geocode via server API
  const geocodeBatch = useCallback(async (items) => {
    if (!items.length) { setLoading(false); return; }

    // Step 1: Check local cache first
    const localCache = loadLocalCache();
    const resolved = {};
    const uncached = [];

    for (const item of items) {
      const direct = getDirectCoords(item.listing);
      if (direct) {
        resolved[item.key] = direct;
        continue;
      }
      if (localCache[item.key] && isValidLatLng(localCache[item.key].lat, localCache[item.key].lng)) {
        resolved[item.key] = localCache[item.key];
        continue;
      }
      uncached.push({ key: item.key, query: item.query });
    }

    // Show locally cached results immediately
    if (Object.keys(resolved).length > 0) {
      setCoordsMap(resolved);
      setProgress({ cached: Object.keys(resolved).length, total: items.length });
    }

    if (uncached.length === 0) {
      setLoading(false);
      return;
    }

    // Step 2: Call server batch API for the rest
    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: uncached }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('Geocode API error');
      const data = await res.json();

      const newResults = { ...resolved };
      for (const [key, coords] of Object.entries(data.results || {})) {
        if (coords && isValidLatLng(coords.lat, coords.lng)) {
          newResults[key] = coords;
        }
      }

      setCoordsMap(newResults);

      // Merge into local cache
      const updatedCache = { ...localCache, ...newResults };
      saveLocalCache(updatedCache);
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Geocode batch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Build items and trigger geocoding when listings change
  useEffect(() => {
    if (!Array.isArray(listings) || listings.length === 0) {
      setLoading(false);
      return;
    }

    const items = listings.map((l) => ({
      key: getListingKey(l) || buildGeoQuery(l),
      query: buildGeoQuery(l),
      listing: l,
    }));

    setProgress({ cached: 0, total: items.length });
    geocodeBatch(items);

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [listings, geocodeBatch]);

  // Build resolved listing+coords pairs
  const markable = useMemo(() => {
    if (!Array.isArray(listings)) return [];
    return listings
      .map((l) => {
        const key = getListingKey(l) || buildGeoQuery(l);
        const direct = getDirectCoords(l);
        const cached = coordsMap[key];
        const coords = direct || cached;
        if (!coords || !isValidLatLng(coords.lat, coords.lng)) return null;
        return { listing: l, coords: [coords.lat, coords.lng] };
      })
      .filter(Boolean);
  }, [listings, coordsMap]);

  const allPoints = markable.map((m) => m.coords);

  const center = allPoints.length > 0
    ? [
        allPoints.reduce((s, c) => s + c[0], 0) / allPoints.length,
        allPoints.reduce((s, c) => s + c[1], 0) / allPoints.length,
      ]
    : DEFAULT_CENTER;

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden shadow-lg border border-gray-200 relative">
      {loading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="bg-white/95 rounded-full px-4 py-2 shadow-md flex items-center gap-2 text-sm text-gray-700">
            <svg className="animate-spin h-4 w-4 text-teal-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Locating properties{markable.length > 0 ? ` (${markable.length} found)` : '…'}
          </div>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={markable.length > 0 ? 11 : 9}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitBounds points={allPoints} />
        {markable.map(({ listing, coords }) => {
          const key = getListingKey(listing);
          const photo = getPhoto(listing);
          const price = listing.ListPrice ?? listing.Price;
          const address = getDisplayAddress(listing);

          return (
            <CircleMarker
              key={key || `${coords[0]}-${coords[1]}`}
              center={coords}
              radius={8}
              pathOptions={{ color: '#0d9488', fillColor: '#14b8a6', fillOpacity: 0.85, weight: 2 }}
            >
              <Popup minWidth={220} maxWidth={280}>
                <div className="text-sm">
                  {photo && (
                    <div className="mb-2 -mx-1 -mt-1">
                      <img
                        src={photo}
                        alt={address}
                        className="w-full h-28 object-cover rounded-t"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <p className="font-semibold text-gray-900 leading-tight">{address}</p>
                  {price != null && (
                    <p className="text-teal-700 font-bold mt-1">${Number(price).toLocaleString()}</p>
                  )}
                  <div className="flex items-center gap-2 text-gray-600 text-xs mt-1">
                    {listing.BedroomsTotal != null && <span>{listing.BedroomsTotal} bd</span>}
                    {listing.BathroomsTotalInteger != null && <span>{listing.BathroomsTotalInteger} ba</span>}
                    {listing.LivingArea != null && <span>{Math.round(listing.LivingArea).toLocaleString()} sqft</span>}
                  </div>
                  {key && (
                    <Link
                      href={`/property/${encodeURIComponent(String(key))}`}
                      className="inline-block mt-2 text-teal-600 hover:text-teal-800 font-medium text-xs hover:underline"
                    >
                      View Property →
                    </Link>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        {markable.length === 0 && !loading && (
          <div className="leaflet-control" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
            <div className="bg-white/90 rounded-lg px-4 py-3 shadow-md text-center">
              <p className="text-gray-600 text-sm">No location data available for these properties</p>
            </div>
          </div>
        )}
      </MapContainer>
    </div>
  );
};

export default PropertyMap;
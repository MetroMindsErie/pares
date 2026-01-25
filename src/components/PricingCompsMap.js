import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { cacheGet, cacheSet } from '../utils/clientCache';

function isValidLatLng(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  if (Math.abs(la) < 0.000001 && Math.abs(lo) < 0.000001) return false; // common "missing" default
  if (la < -90 || la > 90) return false;
  if (lo < -180 || lo > 180) return false;
  return true;
}

function normalizeAddressKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function geocodeAddress(address, { signal } = {}) {
  const query = String(address || '').trim();
  if (!query) return null;

  const cacheKey = `cma:geocode:v1:${normalizeAddressKey(query)}`;

  const GEOCODE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  const cached = cacheGet(cacheKey, { ttlMs: GEOCODE_TTL_MS });
  if (cached && isValidLatLng(cached?.lat, cached?.lng)) {
    return { lat: Number(cached.lat), lng: Number(cached.lng) };
  }

  // Nominatim (OpenStreetMap) geocoding. Client-side only.
  // Note: keep requests rate-limited.
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const first = Array.isArray(json) ? json[0] : null;
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  if (!isValidLatLng(lat, lng)) return null;

  cacheSet(cacheKey, { lat, lng }, { ttlMs: GEOCODE_TTL_MS });

  return { lat, lng };
}

function pinSvg({ fill, stroke }) {
  return `
    <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22s7-5.3 7-12A7 7 0 1 0 5 10c0 6.7 7 12 7 12z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
      <circle cx="12" cy="10" r="3" fill="${stroke}"/>
    </svg>
  `.trim();
}

function makePinIcon({ fill, stroke }) {
  return L.divIcon({
    className: '',
    html: pinSvg({ fill, stroke }),
    iconSize: [28, 28],
    iconAnchor: [14, 26],
    popupAnchor: [0, -24],
  });
}

function FitBounds({ points, enabled, fittingRef }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (!enabled) return;
    if (!Array.isArray(points) || points.length === 0) return;

    if (points.length === 1) {
      if (fittingRef) fittingRef.current = true;
      map.setView(points[0], 15, { animate: false });
      if (fittingRef) setTimeout(() => { fittingRef.current = false; }, 0);
      return;
    }

    // Leaflet accepts an array of LatLng tuples as a bounds expression.
    if (fittingRef) fittingRef.current = true;
    map.fitBounds(points, { padding: [24, 24], maxZoom: 16, animate: false });
    if (fittingRef) setTimeout(() => { fittingRef.current = false; }, 0);
  }, [map, points, enabled, fittingRef]);

  return null;
}

function UserInteractionWatcher({ onUserInteraction, fittingRef }) {
  useMapEvents({
    mousedown: () => {
      if (fittingRef?.current) return;
      onUserInteraction();
    },
    touchstart: () => {
      if (fittingRef?.current) return;
      onUserInteraction();
    },
    dragstart: () => {
      if (fittingRef?.current) return;
      onUserInteraction();
    },
    zoomstart: () => {
      if (fittingRef?.current) return;
      onUserInteraction();
    },
  });
  return null;
}

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '';
  return `$${Math.round(v).toLocaleString()}`;
}

function FitOnceAcker({ subjectPoint, onAck }) {
  useEffect(() => {
    if (!subjectPoint) return;
    const t = setTimeout(() => {
      onAck();
    }, 0);
    return () => clearTimeout(t);
  }, [subjectPoint, onAck]);
  return null;
}

export default function PricingCompsMap({ subject, comps }) {
  const [geoSubject, setGeoSubject] = useState(null);
  const [geoComps, setGeoComps] = useState(() => new Map());
  const geocodeQueueRef = useRef(Promise.resolve());
  const geocodeEnqueuedRef = useRef(new Set());
  const mountedRef = useRef(true);
  const fittingRef = useRef(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [didFitWithSubject, setDidFitWithSubject] = useState(false);
  const [forceFitOnce, setForceFitOnce] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const subjectPoint = useMemo(() => {
    if (isValidLatLng(subject?.lat, subject?.lng)) return [Number(subject.lat), Number(subject.lng)];
    if (isValidLatLng(geoSubject?.lat, geoSubject?.lng)) return [Number(geoSubject.lat), Number(geoSubject.lng)];
    return null;
  }, [subject?.lat, subject?.lng, geoSubject?.lat, geoSubject?.lng]);

  const compPoints = useMemo(() => {
    if (!Array.isArray(comps)) return [];
    return comps
      .map((c) => {
        const directLat = Number(c?.lat);
        const directLng = Number(c?.lng);
        if (isValidLatLng(directLat, directLng)) return [directLat, directLng];
        const cached = geoComps.get(String(c?.id || ''));
        if (isValidLatLng(cached?.lat, cached?.lng)) return [Number(cached.lat), Number(cached.lng)];
        return null;
      })
      .filter(Boolean);
  }, [comps, geoComps]);

  const allPoints = useMemo(() => {
    const pts = [];
    if (subjectPoint) pts.push(subjectPoint);
    for (const p of compPoints) pts.push(p);
    return pts;
  }, [subjectPoint, compPoints]);

  // If the user interacts before the subject geocode resolves, auto-fit may be disabled.
  // Force exactly one fit when the subject point becomes available so the "Your home" pin is visible.
  useEffect(() => {
    if (!subjectPoint) return;
    if (didFitWithSubject) return;
    setForceFitOnce(true);
  }, [subjectPoint, didFitWithSubject]);

  // Default to PA-ish center while we geocode missing coordinates.
  const center = subjectPoint || compPoints[0] || [40.9, -77.85];
  const initialZoom = allPoints.length > 0 ? 13 : 7;

  // Visual emphasize: subject (user-entered home) stands out vs comp pins.
  const subjectIcon = useMemo(() => makePinIcon({ fill: '#2563eb', stroke: '#1e40af' }), []);
  const compIcon = useMemo(() => makePinIcon({ fill: '#ffffff', stroke: '#111827' }), []);

  // Geocode subject if missing coords.
  useEffect(() => {
    if (!subject || subjectPoint) return () => {};

    const q = [subject?.address, subject?.city, subject?.county, subject?.state, subject?.zip]
      .filter(Boolean)
      .join(', ');
    if (!q) return () => {};

    // Important: don't put the subject behind the comps queue.
    // Otherwise, if there are many comps to geocode, the user's home pin may never appear.
    const controller = new AbortController();
    (async () => {
      try {
        const pt = await geocodeAddress(q, { signal: controller.signal });
        if (!mountedRef.current) return;
        if (pt) setGeoSubject(pt);
      } catch {
        // ignore
      }
    })();

    return () => {
      controller.abort();
    };
  }, [subject?.address, subjectPoint, subject]);

  // Geocode comps missing coords (rate-limited, cached in localStorage).
  useEffect(() => {
    if (!Array.isArray(comps) || comps.length === 0) return () => {};

    // Run sequentially (Nominatim is rate-limited). Do NOT cancel queued jobs on re-render.
    for (const c of comps) {
      if (isValidLatLng(c?.lat, c?.lng)) continue;

      const q = [c?.address, c?.city, c?.state, c?.zip].filter(Boolean).join(', ');
      if (!q) continue;

      const id = String(c?.id || '').trim();
      const key = id || `addr:${normalizeAddressKey(q)}`;

      const cached = geoComps.get(key);
      if (isValidLatLng(cached?.lat, cached?.lng)) continue;
      if (geocodeEnqueuedRef.current.has(key)) continue;

      geocodeEnqueuedRef.current.add(key);

      geocodeQueueRef.current = geocodeQueueRef.current
        .then(() => new Promise((r) => setTimeout(r, 1100)))
        .then(() => geocodeAddress(q))
        .then((pt) => {
          if (!mountedRef.current) return;
          if (!pt) return;
          setGeoComps((prev) => {
            const next = new Map(prev);
            next.set(key, pt);
            return next;
          });
        })
        .catch(() => {});
    }

    return () => {};
  }, [comps, geoComps]);

  return (
    <div className="mt-4">
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Map</div>
      <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <MapContainer 
          center={center} 
          zoom={initialZoom} 
          style={{ height: 360, width: '100%' }} 
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <UserInteractionWatcher
            fittingRef={fittingRef}
            onUserInteraction={() => setUserInteracted(true)}
          />

          <FitBounds
            points={allPoints}
            enabled={!userInteracted || forceFitOnce}
            fittingRef={fittingRef}
          />

          {forceFitOnce ? (
            <FitOnceAcker
              subjectPoint={subjectPoint}
              onAck={() => {
                if (subjectPoint) setDidFitWithSubject(true);
                setForceFitOnce(false);
              }}
            />
          ) : null}

          {Array.isArray(comps)
            ? comps.map((c) => {
                const directLat = Number(c?.lat);
                const directLng = Number(c?.lng);
                const q = [c?.address, c?.city, c?.state, c?.zip].filter(Boolean).join(', ');
                const key = String(c?.id || '').trim() || (q ? `addr:${normalizeAddressKey(q)}` : '');
                const cached = key ? geoComps.get(key) : null;
                const lat = isValidLatLng(directLat, directLng) ? directLat : Number(cached?.lat);
                const lng = isValidLatLng(directLat, directLng) ? directLng : Number(cached?.lng);
                if (!isValidLatLng(lat, lng)) return null;

                return (
                  <Marker
                    key={c.id || `${lat}:${lng}`}
                    position={[lat, lng]}
                    icon={compIcon}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">Comp</div>
                        <div>{c?.address}{c?.city ? `, ${c.city}` : ''}</div>
                        <div className="text-xs text-gray-700">
                          {formatMoney(c?.price)}
                          {c?.beds ? ` • ${c.beds} bd` : ''}
                          {c?.baths ? ` • ${c.baths} ba` : ''}
                          {c?.sqft ? ` • ${Math.round(c.sqft).toLocaleString()} sqft` : ''}
                        </div>
                        {c?.id ? (
                          <div className="mt-2">
                            <a
                              href={`/property/${encodeURIComponent(String(c.id))}`}
                              className="text-indigo-600 hover:underline"
                            >
                              View property
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </Popup>
                  </Marker>
                );
              })
            : null}

          {/* Render subject last so it stays visually on top of overlapping comp markers. */}
          {subjectPoint ? (
            <Marker position={subjectPoint} icon={subjectIcon} zIndexOffset={1000} riseOnHover>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">Your home</div>
                  <div>{subject?.address}</div>
                  <div className="text-xs text-gray-700">
                    {subject?.beds ? `${subject.beds} bd` : ''}{subject?.baths ? ` • ${subject.baths} ba` : ''}{subject?.sqft ? ` • ${Math.round(subject.sqft).toLocaleString()} sqft` : ''}
                  </div>
                </div>
              </Popup>
            </Marker>
          ) : null}
        </MapContainer>
      </div>

      {!subjectPoint ? (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          Mapping uses listing lat/lng when available; otherwise it geocodes addresses. Pins may appear over a few seconds.
        </div>
      ) : null}
    </div>
  );
}

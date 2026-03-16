/**
 * /api/geocode — Batch geocode addresses with Supabase caching.
 *
 * POST { addresses: [{ key, query }] }
 * Returns { results: { [key]: { lat, lng } | null } }
 *
 * Flow:
 *  1. Batch-fetch cached coords from Supabase geocode_cache
 *  2. Geocode missing addresses via Nominatim (server-side, 1 req/sec)
 *  3. Store new results in Supabase for next time
 *  4. Return all coords
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

function normalizeKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidLatLng(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  if (Math.abs(la) < 0.001 && Math.abs(lo) < 0.001) return false;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return false;
  return true;
}

async function geocodeViaNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ParesHomes/1.0 (property map)' },
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const first = Array.isArray(json) ? json[0] : null;
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  if (!isValidLatLng(lat, lng)) return null;
  return { lat, lng };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const addresses = body?.addresses;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({ results: {} });
    }

    // Limit batch size
    const batch = addresses.slice(0, 200);
    const results = {};

    // Normalize all keys
    const keyMap = new Map(); // normalizedKey -> { originalKey, query }
    for (const item of batch) {
      const nk = normalizeKey(item.query || item.key);
      if (!nk) continue;
      keyMap.set(nk, { originalKey: item.key, query: item.query });
    }

    const normalizedKeys = [...keyMap.keys()];

    // Phase 1: Batch-fetch from Supabase geocode_cache
    const sb = getSupabaseAdminClient();
    const cachedMap = new Map();

    if (sb && normalizedKeys.length > 0) {
      try {
        // Fetch in chunks of 100 (Supabase .in() limit)
        for (let i = 0; i < normalizedKeys.length; i += 100) {
          const chunk = normalizedKeys.slice(i, i + 100);
          const { data, error } = await sb
            .from('geocode_cache')
            .select('address_key, lat, lng')
            .in('address_key', chunk);

          if (!error && data) {
            for (const row of data) {
              if (isValidLatLng(row.lat, row.lng)) {
                cachedMap.set(row.address_key, {
                  lat: Number(row.lat),
                  lng: Number(row.lng),
                });
              }
            }
          }
        }
      } catch {
        // geocode_cache table might not exist — proceed without cache
      }
    }

    // Populate cached results and identify missing ones
    const toGeocode = [];
    for (const [nk, { originalKey }] of keyMap) {
      const cached = cachedMap.get(nk);
      if (cached) {
        results[originalKey] = cached;
      } else {
        toGeocode.push(nk);
      }
    }

    // Phase 2: Geocode missing addresses (Nominatim, 1 req/sec)
    const newResults = [];
    for (let i = 0; i < toGeocode.length; i++) {
      const nk = toGeocode[i];
      const { originalKey, query } = keyMap.get(nk);

      if (i > 0) await sleep(1050); // Nominatim rate limit

      const coords = await geocodeViaNominatim(query);
      if (coords) {
        results[originalKey] = coords;
        newResults.push({ address_key: nk, ...coords, raw_address: query });
      } else {
        results[originalKey] = null;
      }
    }

    // Phase 3: Store new results in Supabase (fire-and-forget)
    if (sb && newResults.length > 0) {
      try {
        await sb
          .from('geocode_cache')
          .upsert(
            newResults.map((r) => ({
              address_key: r.address_key,
              lat: r.lat,
              lng: r.lng,
              raw_address: r.raw_address,
            })),
            { onConflict: 'address_key' }
          );
      } catch {
        // Table might not exist yet — that's fine
      }
    }

    return NextResponse.json({ results, cached: cachedMap.size, geocoded: newResults.length });
  } catch (err) {
    console.error('Geocode batch error:', err);
    return NextResponse.json({ error: 'Geocode failed' }, { status: 500 });
  }
}

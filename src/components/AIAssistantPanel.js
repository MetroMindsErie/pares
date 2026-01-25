"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import supabase from '../lib/supabase-setup';
import { useAuth } from '../context/auth-context';
import { clearUserActivity, pushUserActivity } from '../utils/activityStorage';
import { cacheGetEntry, cacheRemove, cacheSet } from '../utils/clientCache';

const PricingCompsMap = dynamic(() => import('./PricingCompsMap'), { ssr: false });

function isValidLatLng(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  if (Math.abs(la) < 0.000001 && Math.abs(lo) < 0.000001) return false;
  if (la < -90 || la > 90) return false;
  if (lo < -180 || lo > 180) return false;
  return true;
}

function storageKeyForUser(userId) {
  return userId ? `aiAssistant:lastSearch:v1:${userId}` : null;
}

function pricingStorageKeyForUser(userId) {
  return userId ? `aiAssistant:lastPricing:v1:${userId}` : null;
}

const ASSISTANT_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const ROLE_OPTIONS = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'seller', label: 'Seller' },
  { value: 'investor', label: 'Investor' },
  { value: 'realtor', label: 'Realtor' },
];

function LoadingRow({ label }) {
  return (
    <div className="mt-3 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
      <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-indigo-600 animate-spin" />
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '120ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '240ms' }} />
        </span>
      </div>
    </div>
  );
}

export function AIAssistantPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState('search');
  const [input, setInput] = useState('');
  const [role, setRole] = useState('buyer');
  const [searchLoading, setSearchLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);
  const [restoredAt, setRestoredAt] = useState(null);

  // Pricing inputs (PA only)
  const [pricingStreet, setPricingStreet] = useState('');
  const [pricingCounty, setPricingCounty] = useState('');
  const [pricingZip, setPricingZip] = useState('');

  const anyLoading = searchLoading || pricingLoading;

  const relaxationNotes = useMemo(() => {
    if (!Array.isArray(lastResponse?.reasoning)) return [];
    return lastResponse.reasoning
      .filter((r) => typeof r === 'string' && r.startsWith('Relaxed search:'))
      .slice(0, 3);
  }, [lastResponse?.reasoning]);

  const pricingMapData = useMemo(() => {
    const subject = lastResponse?.subject;
    const listings = lastResponse?.listings;
    if (!subject || !Array.isArray(listings) || listings.length === 0) return null;

    const hasSubjectCoords = isValidLatLng(subject?.lat, subject?.lng);
    const hasAnyCompCoords = listings.some((l) => isValidLatLng(l?.lat, l?.lng));
    const hasSubjectAddress = typeof subject?.address === 'string' && subject.address.trim().length > 0;
    const hasAnyCompAddress = listings.some((l) => typeof l?.address === 'string' && l.address.trim().length > 0);

    // Show map if we have at least one way to locate points: coords OR addresses (geocoding fallback).
    if (!hasSubjectCoords && !hasAnyCompCoords && !hasSubjectAddress && !hasAnyCompAddress) return null;

    return { subject, comps: listings };
  }, [lastResponse?.subject, lastResponse?.listings]);

  useEffect(() => {
    if (!user?.id) return;

    const key = storageKeyForUser(user.id);
    const pricingKey = pricingStorageKeyForUser(user.id);
    if (!key || !pricingKey) return;

    const searchEntry = cacheGetEntry(key, { ttlMs: ASSISTANT_CACHE_TTL_MS });
    const pricingEntry = cacheGetEntry(pricingKey, { ttlMs: ASSISTANT_CACHE_TTL_MS });

    const candidates = [
      searchEntry?.data ? { kind: 'search', savedAt: searchEntry.savedAt, payload: searchEntry.data } : null,
      pricingEntry?.data ? { kind: 'pricing', savedAt: pricingEntry.savedAt, payload: pricingEntry.data } : null,
    ].filter(Boolean);

    if (candidates.length === 0) {
      cacheRemove(key);
      cacheRemove(pricingKey);
      return;
    }

    candidates.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    const winner = candidates[0];

    setTab(winner.kind);
    setLastResponse(winner.payload?.response || null);
    setRestoredAt(winner.savedAt ? new Date(winner.savedAt).toISOString() : null);

    if (winner.kind === 'search') {
      if (typeof winner.payload?.role === 'string' && winner.payload.role) setRole(winner.payload.role);
      if (typeof winner.payload?.query === 'string' && winner.payload.query) setInput(winner.payload.query);
    }

    if (winner.kind === 'pricing') {
      if (typeof winner.payload?.pricingStreet === 'string') setPricingStreet(winner.payload.pricingStreet);
      if (typeof winner.payload?.pricingCounty === 'string') setPricingCounty(winner.payload.pricingCounty);
      if (typeof winner.payload?.pricingZip === 'string') setPricingZip(winner.payload.pricingZip);
    }
  }, [user?.id]);

  const clearAssistantState = () => {
    if (!user?.id) return;
    const key = storageKeyForUser(user.id);
    const pricingKey = pricingStorageKeyForUser(user.id);
    if (key) cacheRemove(key);
    if (pricingKey) cacheRemove(pricingKey);
    clearUserActivity(user.id);
    setRestoredAt(null);
    setLastResponse(null);
    setError(null);
  };

  const canSearch = useMemo(
    () => input.trim().length > 0 && !anyLoading,
    [input, anyLoading]
  );

  const onSearch = async () => {
    if (!canSearch) return;
    setError(null);
    setSearchLoading(true);
    setLastResponse(null);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || null;

      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ query: input.trim(), role })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
        const msg = parsed?.error || parsed?.answer || text;
        throw new Error(`AI search failed (${res.status}): ${String(msg).slice(0, 300)}`);
      }

      const json = await res.json();
      setLastResponse(json);

      if (user?.id) {
        const key = storageKeyForUser(user.id);
        if (key) {
          cacheSet(
            key,
            {
              query: input.trim(),
              role,
              response: json,
            },
            { ttlMs: ASSISTANT_CACHE_TTL_MS }
          );
          setRestoredAt(new Date().toISOString());
        }

        pushUserActivity(user.id, {
          type: 'ai_search',
          title: `AI search: ${input.trim().slice(0, 80)}${input.trim().length > 80 ? '…' : ''}`,
        });
      }
    } catch (e) {
      setError(e?.message || 'AI search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const onPricing = async () => {
    if (!pricingStreet.trim() || !pricingCounty.trim() || !pricingZip.trim() || anyLoading) return;
    setError(null);
    setPricingLoading(true);
    setLastResponse(null);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || null;

      const address = `${pricingStreet.trim()}, ${pricingCounty.trim()} County, PA ${pricingZip.trim()}`;

      const res = await fetch('/api/ai/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          address,
          county: pricingCounty.trim(),
          zip: pricingZip.trim(),
        })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }

        // If the API returned a structured payload (answer/reasoning/debug), show it.
        if (parsed && (parsed.answer || parsed.reasoning || parsed.debug)) {
          setLastResponse(parsed);
          return;
        }

        const msg = parsed?.error || parsed?.answer || text;
        throw new Error(`Pricing failed (${res.status}): ${String(msg).slice(0, 300)}`);
      }

      const json = await res.json();
      setLastResponse(json);

      if (user?.id) {
        const pricingKey = pricingStorageKeyForUser(user.id);
        if (pricingKey) {
          cacheSet(
            pricingKey,
            {
              pricingStreet: pricingStreet.trim(),
              pricingCounty: pricingCounty.trim(),
              pricingZip: pricingZip.trim(),
              response: json,
            },
            { ttlMs: ASSISTANT_CACHE_TTL_MS }
          );
          setRestoredAt(new Date().toISOString());
        }

        pushUserActivity(user.id, {
          type: 'cma_pricing',
          title: `CMA pricing: ${pricingStreet.trim().slice(0, 60)}${pricingStreet.trim().length > 60 ? '…' : ''}`,
          meta: {
            county: pricingCounty.trim(),
            zip: pricingZip.trim(),
          },
        });
      }
    } catch (e) {
      setError(e?.message || 'Pricing failed');
    } finally {
      setPricingLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">AI Search</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Search using Trestle-backed retrieval + Easters AI reasoning.
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('search')}
          className={
            tab === 'search'
              ? 'px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm'
              : 'px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm'
          }
        >
          Search
        </button>
        <button
          onClick={() => setTab('pricing')}
          className={
            tab === 'pricing'
              ? 'px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm'
              : 'px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm'
          }
        >
          Pricing (CMA)
        </button>
      </div>

      {!user?.id ? (
        <div className="text-sm text-gray-700 dark:text-gray-300">Log in to use the assistant.</div>
      ) : (
        <>
          {tab === 'search' ? (
            <>
              <div className="mt-3">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={anyLoading}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSearch();
                  }}
                  placeholder="Try: under $250k in Erie with 3 beds"
                  className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm"
                />
                <button
                  onClick={onSearch}
                  disabled={!canSearch}
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm disabled:opacity-60"
                >
                  {searchLoading ? 'Searching…' : 'Search'}
                </button>
              </div>

              {searchLoading ? <LoadingRow label="Thinking" /> : null}
            </>
          ) : (
            <>
              <div className="mt-3">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Street address</label>
                <input
                  value={pricingStreet}
                  onChange={(e) => setPricingStreet(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onPricing();
                  }}
                  placeholder="818 Clifton Dr"
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">County</label>
                  <input
                    value={pricingCounty}
                    onChange={(e) => setPricingCounty(e.target.value)}
                    placeholder="Erie"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">ZIP</label>
                  <input
                    value={pricingZip}
                    onChange={(e) => setPricingZip(e.target.value)}
                    placeholder="16503"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">State</label>
                  <input
                    value="PA"
                    disabled
                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm"
                  />
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                Pricing uses real closed comps and internal CMA guidance.
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={onPricing}
                  disabled={!pricingStreet.trim() || !pricingCounty.trim() || !pricingZip.trim() || anyLoading}
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm disabled:opacity-60"
                >
                  {pricingLoading ? 'Analyzing…' : 'Get pricing'}
                </button>
              </div>

              {pricingLoading ? <LoadingRow label="Building your CMA" /> : null}
            </>
          )}

          {error ? (
            <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : null}

          {restoredAt && !anyLoading ? (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Showing last saved results ({new Date(restoredAt).toLocaleString()})
            </div>
          ) : null}

          {!anyLoading && (lastResponse || restoredAt) ? (
            <div className="mt-2">
              <button
                onClick={clearAssistantState}
                className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                type="button"
              >
                Clear saved assistant state
              </button>
            </div>
          ) : null}

          {lastResponse?.answer ? (
            <div className="mt-4 text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {lastResponse.answer}
            </div>
          ) : null}

          {Array.isArray(lastResponse?.reasoning) && lastResponse.reasoning.length > 0 ? (
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Reasoning</div>
              <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {lastResponse.reasoning.slice(0, 8).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>

              {lastResponse?.debug ? (
                <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="font-semibold mb-1">Debug</div>
                  <pre className="whitespace-pre-wrap break-words">{JSON.stringify(lastResponse.debug, null, 2)}</pre>
                </div>
              ) : null}
            </div>
          ) : null}

          {Array.isArray(lastResponse?.listings) && lastResponse.listings.length > 0 ? (
            <div className="mt-4">
              {relaxationNotes.length > 0 ? (
                <div className="mb-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="font-semibold">Search expanded</div>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {relaxationNotes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {tab === 'pricing' && pricingMapData ? (
                <PricingCompsMap subject={pricingMapData.subject} comps={pricingMapData.comps} />
              ) : null}

              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Listings</div>
              <div className="space-y-2">
                {lastResponse.listings.map((l) => (
                  <Link
                    key={l.id}
                    href={`/property/${encodeURIComponent(l.id)}`}
                    className="flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                        {l.address}{l.city ? ` • ${l.city}` : ''}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {l.property_type ? l.property_type : ''}
                        {typeof l.price === 'number' ? ` • $${Number(l.price).toLocaleString()}` : ''}
                        {typeof l.beds === 'number' ? ` • ${l.beds} bd` : ''}
                        {typeof l.baths === 'number' ? ` • ${l.baths} ba` : ''}
                        {l.status ? ` • ${l.status}` : ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-indigo-600 dark:text-indigo-400">View</div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

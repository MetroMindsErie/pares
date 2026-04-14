"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import supabase from '../lib/supabase-setup';
import { useAuth } from '../context/auth-context';
import CompareModal from './Dashboard/CompareModal';
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

function formatUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `$${Math.round(n).toLocaleString()}`;
}

function formatUsdCompact(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

function storageKeyForUser(userId) {
  return userId ? `aiAssistant:lastSearch:v1:${userId}` : null;
}

function pricingStorageKeyForUser(userId) {
  return userId ? `aiAssistant:lastPricing:v1:${userId}` : null;
}

function pricingHistoryKeyForUser(userId) {
  return userId ? `aiAssistant:pricingHistory:v1:${userId}` : null;
}

const ASSISTANT_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const ROLE_OPTIONS = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'seller', label: 'Seller' },
  { value: 'investor', label: 'Investor' },
  { value: 'realtor', label: 'Realtor' },
];

function buildZipRange(start, end) {
  const out = [];
  for (let i = start; i <= end; i += 1) {
    out.push(String(i));
  }
  return out;
}

const COUNTY_OPTIONS = [
  { value: 'Erie', label: 'Erie' },
  { value: 'Crawford', label: 'Crawford' },
  { value: 'Warren', label: 'Warren' },
];

const MARKET_TYPE_OPTIONS = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'retail', label: 'Retail' },
  { value: 'land', label: 'Land' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'multifamily', label: 'Multifamily' },
];

const COUNTY_ZIP_OPTIONS = {
  // Erie County, PA - All zip codes
  Erie: [
    ...buildZipRange(16501, 16515), // Erie City
    '16411', // Albion
    '16421', // Corry
    '16423', // Cranesville
    '16426', // East Springfield
    '16427', // Edinboro
    '16428', // Elgin
    '16430', // Fairview
    '16434', // Girard
    '16438', // Harborcreek
    '16440', // Lake City
    '16441', // Lawrence Park
    '16442', // McKean
    '16444', // Mill Village
    '16475', // Waterford
  ],
  // Crawford County, PA - All zip codes
  Crawford: [
    '16101', '16111', '16137', '16142', '16150', // Western area
    '16311', '16314', '16316', '16319', '16327', // Northern area
    '16331', '16335', '16341', '16342', '16353', // Central area
    '16360', '16364', '16373', '16374', '16388', // Eastern area
    '16401', '16403', '16404', '16407', '16410', // Southern area
    '16412', '16415', '16417', '16424', '16433', // Meadville area
    '16435', '16438', '16440', // Lake Erie border area
  ],
  // Warren County, PA - All zip codes
  Warren: [
    '16301', // Warren city (main)
    '16313', // Bear Lake
    '16329', // Clarendon
    '16340', // Grand Valley
    '16345', // Irvine
    '16347', // Pittsfield
    '16350', // Russell
    '16351', // Sheffield
    '16352', // Spring Creek
    '16365', // Tidioute
    '16371', // Warren (west)
  ],
};

function LoadingRow({ label }) {
  return (
    <div className="mt-3 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
      <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-teal-600 animate-spin" />
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: '120ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: '240ms' }} />
        </span>
      </div>
    </div>
  );
}

export function AIAssistantPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState('search');
  const [input, setInput] = useState('');
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [pricingHistory, setPricingHistory] = useState([]);
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
  const [pricingMarketType, setPricingMarketType] = useState('residential');
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareProps, setCompareProps] = useState([]);
  const [selectedComps, setSelectedComps] = useState([]);
  const [includeSubjectInCompare, setIncludeSubjectInCompare] = useState(true);

  const anyLoading = searchLoading || pricingLoading;
  const isSearchComingSoon = true;

  const relaxationNotes = useMemo(() => {
    if (!Array.isArray(lastResponse?.reasoning)) return [];
    return lastResponse.reasoning
      .filter((r) => typeof r === 'string' && r.startsWith('Relaxed search:'))
      .slice(0, 3);
  }, [lastResponse?.reasoning]);

  const pricingZipOptions = useMemo(() => {
    const key = COUNTY_OPTIONS.find((c) => c.value === pricingCounty)?.value || '';
    return COUNTY_ZIP_OPTIONS[key] || [];
  }, [pricingCounty]);

  const handleCompareComp = (comp) => {
    if (!comp?.id) return;
    setSelectedComps((prev) => {
      const id = String(comp.id);
      const exists = prev.some((c) => String(c?.id) === id);
      if (exists) return prev.filter((c) => String(c?.id) !== id);
      return [...prev, comp];
    });
  };

  const handleCompareSelected = () => {
    const subject = pricingMapData?.subject || null;
    const subjectComparable = Boolean(subject?.id);
    if (includeSubjectInCompare && subjectComparable) {
      if (!subject?.address || !String(subject.address).trim()) {
        setError('Compare needs a subject address. Please try a different address.');
        return;
      }
    }

    const comps = Array.isArray(selectedComps) ? selectedComps : [];
    if (comps.length < (includeSubjectInCompare && subjectComparable ? 1 : 2)) {
      setError('Select at least two comps, or include the subject plus one comp.');
      return;
    }

    const subjectPayload = subjectComparable ? {
      ListingKey: String(subject.id || ''),
      UnparsedAddress: subject.address,
      City: subject.city,
      StateOrProvince: subject.state,
      PostalCode: subject.zip,
      ListPrice: subject.price,
      BedroomsTotal: subject.beds,
      BathroomsTotalInteger: subject.baths,
      LivingArea: subject.sqft,
      mediaUrls: subject.media_urls || [],
      force_enrich: true,
    } : null;

    const compPayloads = comps
      .filter((c) => c?.id)
      .map((c) => ({
        ListingKey: String(c.id || ''),
        UnparsedAddress: c.address,
        City: c.city,
        StateOrProvince: c.state,
        PostalCode: c.zip,
        ListPrice: c.price,
        BedroomsTotal: c.beds,
        BathroomsTotalInteger: c.baths,
        LivingArea: c.sqft,
        mediaUrls: c.media_urls || [],
        force_enrich: true,
      }));

    const toCompare = [
      ...(includeSubjectInCompare && subjectPayload ? [subjectPayload] : []),
      ...compPayloads,
    ];

    if (toCompare.length < 2) {
      setError('Compare needs at least two valid properties.');
      return;
    }

    setCompareProps(toCompare);
    setIsCompareOpen(true);
  };

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

  const pricingHero = useMemo(() => {
    if (tab !== 'pricing') return null;
    const low = Number(lastResponse?.price_range?.low);
    const high = Number(lastResponse?.price_range?.high);
    const midRaw = Number(lastResponse?.price_range?.mid);
    const mid = Number.isFinite(midRaw) && midRaw > 0
      ? midRaw
      : (Number.isFinite(low) && Number.isFinite(high) ? Math.round((low + high) / 2) : null);
    if (!Number.isFinite(mid) || mid <= 0) return null;
    const listings = Array.isArray(lastResponse?.listings) ? lastResponse.listings : [];
    const comps = listings.length;
    return {
      low: Number.isFinite(low) && low > 0 ? low : null,
      mid,
      high: Number.isFinite(high) && high > 0 ? high : null,
      comps,
      marketType: String(lastResponse?.market_type || 'residential'),
    };
  }, [tab, lastResponse?.price_range, lastResponse?.listings, lastResponse?.market_type]);

  useEffect(() => {
    setSelectedComps([]);
  }, [lastResponse?.listings]);

  useEffect(() => {
    if (!user?.id) return;

    const key = storageKeyForUser(user.id);
    const pricingKey = pricingStorageKeyForUser(user.id);
    const pricingHistoryKey = pricingHistoryKeyForUser(user.id);
    if (!key || !pricingKey) return;

    const searchEntry = cacheGetEntry(key, { ttlMs: ASSISTANT_CACHE_TTL_MS });
    const pricingEntry = cacheGetEntry(pricingKey, { ttlMs: ASSISTANT_CACHE_TTL_MS });
    const pricingHistoryEntry = pricingHistoryKey
      ? cacheGetEntry(pricingHistoryKey, { ttlMs: ASSISTANT_CACHE_TTL_MS })
      : null;

    const candidates = [
      searchEntry?.data ? { kind: 'search', savedAt: searchEntry.savedAt, payload: searchEntry.data } : null,
      pricingEntry?.data ? { kind: 'pricing', savedAt: pricingEntry.savedAt, payload: pricingEntry.data } : null,
    ].filter(Boolean);

    if (candidates.length === 0) {
      cacheRemove(key);
      cacheRemove(pricingKey);
      return;
    }

    if (pricingHistoryEntry?.data && Array.isArray(pricingHistoryEntry.data)) {
      setPricingHistory(pricingHistoryEntry.data.slice(0, 3));
    }

    candidates.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    const winner = candidates[0];

    setTab(winner.kind);
    setLastResponse(winner.payload?.response || null);
    setRestoredAt(winner.savedAt ? new Date(winner.savedAt).toISOString() : null);

    if (winner.kind === 'search') {
      if (typeof winner.payload?.role === 'string' && winner.payload.role) setRole(winner.payload.role);
      if (typeof winner.payload?.query === 'string' && winner.payload.query) {
        setLastSearchQuery(winner.payload.query);
        setInput('');
      }
    }

    if (winner.kind === 'pricing') {
      setPricingStreet('');
      setPricingCounty('');
      setPricingZip('');
      const savedMarketType = String(winner.payload?.pricingMarketType || '').trim();
      const isKnownMarket = MARKET_TYPE_OPTIONS.some((opt) => opt.value === savedMarketType);
      setPricingMarketType(isKnownMarket ? savedMarketType : 'residential');
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
    () => input.trim().length > 0 && !anyLoading && !isSearchComingSoon,
    [input, anyLoading, isSearchComingSoon]
  );

  const onSearch = async () => {
    if (isSearchComingSoon) return;
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
      setLastSearchQuery(input.trim());
      setInput('');
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

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || null;

      const address = `${pricingStreet.trim()}, ${pricingCounty.trim()} County, PA ${pricingZip.trim()}`;

      const payload = {
        address,
        county: pricingCounty.trim(),
        zip: pricingZip.trim(),
        market_type: pricingMarketType,
      };

      const retryableStatuses = new Set([408, 429, 500, 502, 503, 504]);
      const attemptTimeouts = [30000, 45000];
      let res = null;
      let lastErr = null;

      for (let i = 0; i < attemptTimeouts.length; i += 1) {
        const timeoutMs = attemptTimeouts[i];
        const isLastAttempt = i === attemptTimeouts.length - 1;
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), timeoutMs);
        let hardTimer = null;

        try {
          const attemptRes = await Promise.race([
            fetch('/api/ai/pricing', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              },
              body: JSON.stringify(payload),
              signal: ac.signal,
            }),
            new Promise((_, reject) => {
              hardTimer = setTimeout(() => {
                ac.abort();
                reject(new Error(`Pricing request timed out after ${Math.round(timeoutMs / 1000)}s`));
              }, timeoutMs + 2000);
            }),
          ]);

          if (!attemptRes.ok && retryableStatuses.has(attemptRes.status) && !isLastAttempt) {
            continue;
          }

          res = attemptRes;
          break;
        } catch (err) {
          lastErr = err;
          const msg = String(err?.message || '');
          const isNetworkish = err?.name === 'AbortError' || /Failed to fetch|NetworkError|fetch|timed out/i.test(msg);
          if (!isNetworkish || isLastAttempt) throw err;
        } finally {
          clearTimeout(timer);
          if (hardTimer) clearTimeout(hardTimer);
        }
      }

      if (!res) {
        throw lastErr || new Error('Pricing request failed before receiving a response.');
      }

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
      const newPricingItem = {
        street: pricingStreet.trim(),
        county: pricingCounty.trim(),
        zip: pricingZip.trim(),
        marketType: pricingMarketType,
        savedAt: new Date().toISOString(),
      };
      setPricingHistory((prev) => {
        const next = [newPricingItem, ...(Array.isArray(prev) ? prev : [])]
          .filter((item, idx, arr) =>
            arr.findIndex((i) =>
              i.street === item.street && i.county === item.county && i.zip === item.zip && (i.marketType || 'residential') === (item.marketType || 'residential')
            ) === idx
          )
          .slice(0, 3);
        if (user?.id) {
          const pricingHistoryKey = pricingHistoryKeyForUser(user.id);
          if (pricingHistoryKey) {
            cacheSet(pricingHistoryKey, next, { ttlMs: ASSISTANT_CACHE_TTL_MS });
          }
        }
        return next;
      });
      setPricingStreet('');
      setPricingCounty('');
      setPricingZip('');
      if (user?.id) {
        const pricingKey = pricingStorageKeyForUser(user.id);
        if (pricingKey) {
          cacheSet(
            pricingKey,
            {
              pricingStreet: pricingStreet.trim(),
              pricingCounty: pricingCounty.trim(),
              pricingZip: pricingZip.trim(),
              pricingMarketType,
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
            market_type: pricingMarketType,
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
              ? 'px-3 py-1.5 rounded-md bg-teal-600 text-white text-sm'
              : 'px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm'
          }
        >
          Search
        </button>
        <button
          onClick={() => setTab('pricing')}
          className={
            tab === 'pricing'
              ? 'px-3 py-1.5 rounded-md bg-teal-600 text-white text-sm'
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
              <div className="mt-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                AI Assisted Search is coming soon. Pricing (CMA) is available now.
              </div>
              <div className="mt-3">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={anyLoading || isSearchComingSoon}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {lastSearchQuery ? (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span>Last search:</span>
                  <button
                    type="button"
                    onClick={() => setInput(lastSearchQuery)}
                    className="px-2 py-1 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    {lastSearchQuery}
                  </button>
                </div>
              ) : null}

              <div className="mt-3 flex gap-2">
                <div className="relative flex-1">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSearch();
                    }}
                    placeholder="AI Assisted Search coming soon"
                    disabled={isSearchComingSoon}
                    className="w-full pr-9 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm"
                  />
                  {input.trim() ? (
                    <button
                      type="button"
                      onClick={() => setInput('')}
                      className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
                      aria-label="Clear search input"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ) : null}
                </div>
                <button
                  onClick={onSearch}
                  disabled={!canSearch}
                  className="px-4 py-2 rounded-md bg-teal-600 text-white text-sm disabled:opacity-60"
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
                {pricingHistory.length > 0 ? (
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>Recent CMA:</span>
                    {pricingHistory.map((item, index) => (
                      <button
                        key={`${item.street}-${item.county}-${item.zip}-${index}`}
                        type="button"
                        onClick={() => {
                          setPricingStreet(item.street || '');
                          setPricingCounty(item.county || '');
                          setPricingZip(item.zip || '');
                          setPricingMarketType(item.marketType || 'residential');
                        }}
                        className="px-2 py-1 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900"
                      >
                        {(item.street || 'Address')}
                        {item.county ? ` • ${item.county}` : ''}
                        {item.zip ? ` ${item.zip}` : ''}
                        {item.marketType ? ` • ${item.marketType}` : ''}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="relative">
                  <input
                    value={pricingStreet}
                    onChange={(e) => setPricingStreet(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onPricing();
                    }}
                    placeholder=""
                    className="w-full pr-9 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm"
                  />
                  {pricingStreet.trim() ? (
                    <button
                      type="button"
                      onClick={() => setPricingStreet('')}
                      className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
                      aria-label="Clear street"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">County</label>
                  <select
                    value={pricingCounty}
                    onChange={(e) => {
                      const nextCounty = e.target.value;
                      setPricingCounty(nextCounty);
                      if (!nextCounty) {
                        setPricingZip('');
                        return;
                      }
                      const allowed = COUNTY_ZIP_OPTIONS[nextCounty] || [];
                      if (pricingZip && !allowed.includes(pricingZip)) {
                        setPricingZip('');
                      }
                    }}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="">Select county</option>
                    {COUNTY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">ZIP</label>
                  <select
                    value={pricingZip}
                    onChange={(e) => setPricingZip(e.target.value)}
                    disabled={!pricingCounty}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-60"
                  >
                    <option value="">{pricingCounty ? 'Select zip' : 'Select county first'}</option>
                    {pricingZipOptions.map((zip) => (
                      <option key={zip} value={zip}>{zip}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Market type</label>
                  <select
                    value={pricingMarketType}
                    onChange={(e) => setPricingMarketType(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    {MARKET_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-teal-600 text-white text-sm disabled:opacity-60"
                >
                  {pricingLoading ? (
                    <>
                      <span
                        className="h-3.5 w-3.5 rounded-full border-2 border-white/35 border-t-white animate-spin"
                        aria-hidden="true"
                      />
                      <span>Analyzing</span>
                    </>
                  ) : (
                    'Get pricing'
                  )}
                </button>
              </div>
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

          {pricingHero ? (
            <div className="mt-4 rounded-2xl border border-slate-200 dark:border-gray-700 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-5 sm:p-6 text-white shadow-[0_30px_60px_-35px_rgba(3,7,18,0.9)]">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-200">Estimated Market Value</div>
                  <div className="mt-2 text-5xl sm:text-6xl lg:text-7xl font-semibold leading-none">
                    {formatUsdCompact(pricingHero.mid)}
                  </div>
                  <div className="mt-2 text-sm text-slate-200">
                    {pricingHero.low && pricingHero.high
                      ? `${formatUsd(pricingHero.low)} to ${formatUsd(pricingHero.high)} suggested range`
                      : 'Range unavailable'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 min-w-[220px]">
                  <div className="rounded-xl bg-white/10 border border-white/20 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-slate-200">Comps</div>
                    <div className="text-xl font-semibold">{pricingHero.comps || '—'}</div>
                  </div>
                  <div className="rounded-xl bg-white/10 border border-white/20 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-slate-200">Market Type</div>
                    <div className="text-xl font-semibold capitalize">{pricingHero.marketType}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {lastResponse?.answer ? (
            <div className="mt-4 text-sm text-slate-800 dark:text-gray-100 bg-gradient-to-r from-slate-50 to-cyan-50/60 dark:from-gray-800/60 dark:to-gray-800/40 border border-slate-200 dark:border-gray-700 rounded-xl p-4">
              {lastResponse.answer}
            </div>
          ) : null}

          {Array.isArray(lastResponse?.reasoning) && lastResponse.reasoning.length > 0 ? (
            <div className="mt-4 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4">
              <div className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-2">How This Price Was Built</div>
              <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-gray-300 space-y-1">
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
            <div className="mt-4 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-3 sm:p-4">
              {relaxationNotes.length > 0 ? (
                <div className="mb-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                  <div className="font-semibold">Search expanded</div>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {relaxationNotes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {tab === 'pricing' && pricingMapData ? (
                <div className="mt-2 grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-4 items-start">
                  <PricingCompsMap
                    subject={pricingMapData.subject}
                    comps={pricingMapData.comps}
                    onToggleComp={handleCompareComp}
                    selectedCompIds={new Set(selectedComps.map((c) => String(c?.id || '')))}
                  />

                  <div className="rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50 p-3 sm:p-4 xl:sticky xl:top-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-gray-100">Comparable Listings</div>
                        <div className="text-xs text-slate-600 dark:text-gray-400">Ranked by closest price and proximity, then recency.</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCompareSelected}
                        disabled={selectedComps.length === 0}
                        className="text-xs px-3 py-1.5 rounded-lg bg-cyan-700 text-white disabled:opacity-60"
                      >
                        Compare selected ({selectedComps.length})
                      </button>
                    </div>

                    {pricingMapData?.subject?.id ? (
                      <label className="mb-3 flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={includeSubjectInCompare}
                          onChange={(e) => setIncludeSubjectInCompare(e.target.checked)}
                        />
                        Include subject in comparison
                      </label>
                    ) : (
                      <div className="mb-3 text-xs text-slate-500 dark:text-gray-400">
                        Subject is not in MLS; comparing comps only.
                      </div>
                    )}

                    <div className="space-y-2 max-h-[560px] overflow-auto pr-1">
                      {lastResponse.listings.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-start justify-between gap-3 border border-slate-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-900"
                        >
                          <label className="flex items-start gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={selectedComps.some((c) => String(c?.id) === String(l?.id))}
                              onChange={() => handleCompareComp(l)}
                              className="mt-1"
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-900 dark:text-gray-100 truncate">
                                {l.address}{l.city ? ` • ${l.city}` : ''}
                              </div>
                              <div className="mt-1 text-xs text-slate-600 dark:text-gray-400">
                                {l.property_type ? l.property_type : 'Residential'}
                                {typeof l.beds === 'number' ? ` • ${l.beds} bd` : ''}
                                {typeof l.baths === 'number' ? ` • ${l.baths} ba` : ''}
                                {typeof l.sqft === 'number' ? ` • ${Number(l.sqft).toLocaleString()} sf` : ''}
                              </div>
                              <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                                {l.close_date ? `Sold ${l.close_date}` : 'Sold date unavailable'}
                                {l.distance_miles != null ? ` • ${l.distance_miles} mi away` : ''}
                              </div>
                            </div>
                          </label>

                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <div className="text-sm font-semibold text-slate-900 dark:text-gray-100">
                              {typeof l.price === 'number' ? `$${Number(l.price).toLocaleString()}` : '—'}
                            </div>
                            <Link
                              href={`/property/${encodeURIComponent(l.id)}`}
                              className="text-xs text-cyan-700 dark:text-cyan-400 font-medium"
                            >
                              View listing
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <CompareModal
            open={isCompareOpen}
            onClose={() => setIsCompareOpen(false)}
            properties={compareProps}
            allSelectedIds={compareProps.map((p) => String(p?.ListingKey || p?.listing_key || p?.id || '')).filter(Boolean)}
          />
        </>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import supabase from '../lib/supabase-setup';
import { useAuth } from '../context/auth-context';

function storageKeyForUser(userId) {
  return userId ? `aiSearch:lastResponse:${userId}` : null;
}

export function AIAssistantPanel() {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);
  const [restoredAt, setRestoredAt] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    const key = storageKeyForUser(user.id);
    if (!key) return;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.response) {
        setLastResponse(parsed.response);
        setRestoredAt(parsed?.savedAt || null);
      }
    } catch {
      // ignore storage errors
    }
  }, [user?.id]);

  const canSearch = useMemo(
    () => input.trim().length > 0 && !loading,
    [input, loading]
  );

  const onSearch = async () => {
    if (!canSearch) return;
    setError(null);
    setLoading(true);
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
        body: JSON.stringify({ query: input.trim() })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`AI search failed (${res.status}): ${text.slice(0, 200)}`);
      }

      const json = await res.json();
      setLastResponse(json);

      // Persist the last successful result so it can be viewed later
      if (user?.id) {
        const key = storageKeyForUser(user.id);
        if (key) {
          try {
            window.localStorage.setItem(
              key,
              JSON.stringify({
                savedAt: new Date().toISOString(),
                query: input.trim(),
                response: json
              })
            );
            setRestoredAt(new Date().toISOString());
          } catch {
            // ignore storage errors
          }
        }
      }
    } catch (e) {
      setError(e?.message || 'AI search failed');
    } finally {
      setLoading(false);
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

      {!user?.id ? (
        <div className="text-sm text-gray-700 dark:text-gray-300">Log in to use the assistant.</div>
      ) : (
        <>
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
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>

          {error ? (
            <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : null}

          {restoredAt && !loading ? (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Showing last saved results ({new Date(restoredAt).toLocaleString()})
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
            </div>
          ) : null}

          {Array.isArray(lastResponse?.listings) && lastResponse.listings.length > 0 ? (
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Top Listings</div>
              <div className="space-y-2">
                {lastResponse.listings.slice(0, 5).map((l) => (
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

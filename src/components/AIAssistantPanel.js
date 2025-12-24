"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/auth-context';
import { sendChatMessage, fetchSavedSuggestions } from '../services/aiChatService';

export function AIAssistantPanel() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [botType, setBotType] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastResults, setLastResults] = useState([]);
  const [savedSuggestions, setSavedSuggestions] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState(null);

  const sessionStorageKey = useMemo(() => (user?.id ? `ai-session-${user.id}` : null), [user?.id]);

  useEffect(() => {
    if (!sessionStorageKey) return;
    const stored = window.localStorage.getItem(sessionStorageKey);
    if (stored) {
      setSessionId(stored);
    }
  }, [sessionStorageKey]);

  useEffect(() => {
    if (!sessionId || !sessionStorageKey) return;
    window.localStorage.setItem(sessionStorageKey, sessionId);
  }, [sessionId, sessionStorageKey]);

  const loadSaved = async (sid) => {
    const id = sid || sessionId;
    if (!id) return;
    setSavedLoading(true);
    setSavedError(null);
    try {
      const data = await fetchSavedSuggestions(id);
      const items = Array.isArray(data?.suggestions) ? data.suggestions : [];
      setSavedSuggestions(items);
    } catch (e) {
      setSavedError(e?.message || 'Failed to load saved suggestions');
    } finally {
      setSavedLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      loadSaved(sessionId);
    } else {
      setSavedSuggestions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const canSend = useMemo(() => !!user?.id && input.trim().length > 0 && !loading, [user?.id, input, loading]);

  const onSend = async () => {
    if (!canSend) return;
    setError(null);

    const nextMessages = [...messages, { role: 'user', content: input.trim() }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const data = await sendChatMessage({
        userId: user.id,
        sessionId,
        botType,
        messages: nextMessages
      });

      if (data?.session_id && !sessionId) setSessionId(data.session_id);
      if (data?.assistant_message) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.assistant_message }]);
      }
      setLastResults(Array.isArray(data?.results) ? data.results : []);
      if (data?.session_id || sessionId) {
        await loadSaved(data?.session_id || sessionId);
      }
    } catch (e) {
      setError(e?.message || 'Failed to chat');
    } finally {
      setLoading(false);
    }
  };

  const toDisplay = (item) => {
    const payload = item?.payload || item;
    return {
      id: payload?.listing_id || payload?.listingId,
      address: payload?.address,
      city: payload?.city,
      price: payload?.price,
      property_type: payload?.property_type,
    };
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">AI Assistant</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ask in plain English and I’ll help translate it into MLS searches and suggestions.
        </p>
        <div className="mt-3 flex gap-2 items-center text-sm">
          <span className="text-gray-700 dark:text-gray-300">Mode:</span>
          <select
            value={botType}
            onChange={(e) => setBotType(e.target.value)}
            className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="general">General search</option>
            <option value="investment">Investment</option>
          </select>
        </div>
      </div>

      {!user?.id ? (
        <div className="text-sm text-gray-700 dark:text-gray-300">Log in to use the assistant.</div>
      ) : (
        <>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 h-56 overflow-auto bg-gray-50 dark:bg-gray-800/40">
            {messages.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Try: “I’m looking for commercial properties for a marina in Erie County.”
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m, idx) => (
                  <div key={idx} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                    <div
                      className={
                        'inline-block max-w-[90%] px-3 py-2 rounded-lg text-sm ' +
                        (m.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100')
                      }
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSend();
              }}
              placeholder="Type your request…"
              className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm"
            />
            <button
              onClick={onSend}
              disabled={!canSend}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send'}
            </button>
          </div>

          {error ? (
            <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : null}

          {Array.isArray(lastResults) && lastResults.length > 0 ? (
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Matches</div>
              <div className="space-y-2">
                {lastResults.slice(0, 10).map((r) => {
                  const d = toDisplay(r);
                  if (!d.id) return null;
                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-white dark:bg-gray-900"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {d.address ? d.address : 'Listing'}{d.city ? ` • ${d.city}` : ''}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {d.property_type ? d.property_type : ''}{d.price ? ` • $${Number(d.price).toLocaleString()}` : ''}
                        </div>
                      </div>
                      <Link
                        href={`/property/${d.id}`}
                        className="text-xs px-3 py-1.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      >
                        View
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {sessionId ? (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Saved this session</div>
                <button
                  onClick={() => loadSaved(sessionId)}
                  className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 disabled:opacity-60"
                  disabled={savedLoading}
                >
                  {savedLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
              {savedError ? (
                <div className="text-xs text-red-600 dark:text-red-400 mb-2">{savedError}</div>
              ) : null}
              {Array.isArray(savedSuggestions) && savedSuggestions.length > 0 ? (
                <div className="space-y-2">
                  {savedSuggestions.slice(0, 20).map((item) => {
                    const d = toDisplay(item);
                    if (!d.id) return null;
                    return (
                      <div
                        key={d.id}
                        className="flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-white dark:bg-gray-900"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                            {d.address ? d.address : 'Listing'}{d.city ? ` • ${d.city}` : ''}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {d.property_type ? d.property_type : ''}{d.price ? ` • $${Number(d.price).toLocaleString()}` : ''}
                          </div>
                        </div>
                        <Link
                          href={`/property/${d.id}`}
                          className="text-xs px-3 py-1.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        >
                          View
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-600 dark:text-gray-400">No saved matches yet.</div>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

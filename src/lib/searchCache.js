/**
 * Utilities for caching and retrieving search results
 */

const CACHE_KEY = 'pares_search_cache';
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes
const SUGGESTIONS_KEY_PREFIX = 'pares_suggestions_';
const SUGGESTIONS_EXPIRY = 6 * 60 * 60 * 1000; // 6h

/**
 * Save search results to cache
 */
export const cacheSearchResults = (results) => {
  if (!results) return;
  
  try {
    const cacheData = {
      results,
      timestamp: Date.now()
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching search results:', error);
  }
};

/**
 * Get cached search results if they exist and haven't expired
 */
export const getCachedSearchResults = () => {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (!cachedData) return null;
    
    const { results, timestamp } = JSON.parse(cachedData);
    
    // Check if cache has expired
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return results;
  } catch (error) {
    console.error('Error retrieving cached search results:', error);
    return null;
  }
};

/**
 * Clear cached search results
 */
export const clearCachedSearchResults = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing cached search results:', error);
  }
};

/**
 * Check if cached search results exist and are valid
 */
export const hasCachedSearchResults = () => {
  return getCachedSearchResults() !== null;
};

/**
 * Cache AI suggestions
 */
export function cacheSuggestions(userId, payload) {
  if (!userId || !payload) return;
  try {
    localStorage.setItem(
      `${SUGGESTIONS_KEY_PREFIX}${userId}`,
      JSON.stringify({ data: payload, ts: Date.now() })
    );
  } catch (e) { console.warn('cacheSuggestions failed', e.message); }
}

/**
 * Get cached AI suggestions
 */
export function getCachedSuggestions(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${SUGGESTIONS_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > SUGGESTIONS_EXPIRY) {
      localStorage.removeItem(`${SUGGESTIONS_KEY_PREFIX}${userId}`);
      return null;
    }
    return data;
  } catch (e) { return null; }
}

/**
 * Clear cached AI suggestions
 */
export function clearCachedSuggestions(userId) {
  if (!userId) return;
  try { localStorage.removeItem(`${SUGGESTIONS_KEY_PREFIX}${userId}`); } catch {}
}

import supabase from '../lib/supabase-setup';

export async function fetchLatestSuggestions(userId, useCacheFirst = true) {
  if (!userId) return null;
  if (useCacheFirst) {
    const cached = getCachedSuggestions(userId);
    if (cached) return cached;
  }
  try {
    const { data, error } = await supabase
      .from('user_ai_suggestions')
      .select('id, suggestions, generated_at')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1);
    if (error || !data?.length) return null;
    const payload = data[0].suggestions;
    cacheSuggestions(userId, payload);
    return payload;
  } catch (e) {
    console.warn('fetchLatestSuggestions failed', e.message);
    return null;
  }
}

export async function markSuggestionsConsumed(userId) {
  if (!userId) return;
  try {
    await supabase
      .from('user_ai_suggestions')
      .update({ consumed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('consumed_at', null);
  } catch (e) {
    console.warn('markSuggestionsConsumed failed', e.message);
  }
}

/**
 * Salvage JSON from a raw string
 * - Detects and extracts braces
 * - Fixes trailing commas
 * - Coerces match_score to a number between 0 and 1
 */
export function salvageJson(raw) {
  if (!raw || typeof raw !== 'string') return null;
  // Find first '{' and last '}' to extract probable JSON
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  let slice = raw.slice(start, end + 1);

  // Remove leading instructions/backticks
  slice = slice.replace(/^[\s`]+|[\s`]+$/g, '');

  // Remove code fences if present
  slice = slice.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Fix common issues: trailing commas before } or ]
  slice = slice.replace(/,\s*([}\]])/g, '$1');

  // Ensure match_score numbers
  try {
    const obj = JSON.parse(slice);
    if (obj && Array.isArray(obj.suggestions)) {
      obj.suggestions = obj.suggestions.map(s => {
        if (s.match_score !== undefined) {
          const ms = parseFloat(s.match_score);
          s.match_score = isNaN(ms) ? 0 : Math.min(Math.max(ms, 0), 1);
        }
        return s;
      });
    }
    return obj;
  } catch {
    return null;
  }
}
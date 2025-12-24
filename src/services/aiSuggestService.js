import supabase from '../lib/supabase-setup';
import { cacheSuggestions, getCachedSuggestions } from '../lib/searchCache';
import { salvageJson } from '../lib/searchCache';

const AI_BASE = process.env.NEXT_PUBLIC_AI_SUGGEST_BASE_URL || 'http://localhost:8000';
const MAX_SUGGESTIONS = 5;
const RETRY_JSON_INSTRUCTION = 'Return ONLY valid minified JSON matching schema: {"buyer_id": "...","suggestions":[{"listing_id":"...","reason":"...","match_score":0.0}],"explanation":"..."}';

function mapCandidates(properties = []) {
  return properties.slice(0, 25).map(p => ({
    listing_id: p.ListingKey,
    city: p.City,
    neighborhood: p.SubdivisionName || p.Subdivision || p.Neighborhood || null,
    price: p.ListPrice || p.ClosePrice || null,
    bedrooms: p.BedroomsTotal || null,
    bathrooms: p.BathroomsTotalInteger || null,
    property_type: (p.PropertyType || '').toLowerCase(),
    highlights: [
      p.HasBasement ? 'basement' : null,
      p.HasFireplace ? 'fireplace' : null,
      p.HasGarage ? 'garage' : null,
      p.HasPool ? 'pool' : null
    ].filter(Boolean)
  }));
}

async function fetchSavedListingIds(userId) {
  if (!userId) return [];
  try {
    const { data } = await supabase
      .from('saved_properties')
      .select('listing_key')
      .eq('user_id', userId)
      .limit(50);
    return (data || []).map(r => r.listing_key).filter(Boolean);
  } catch { return []; }
}

async function fetchViewedListingIds(userId) {
  if (!userId) return [];
  try {
    const { data } = await supabase
      .from('user_property_views')
      .select('listing_key')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(50);
    return (data || []).map(r => r.listing_key).filter(Boolean);
  } catch { return []; }
}

async function fetchBehaviorProfile(userId) {
  if (!userId) return null;
  try {
    const { data } = await supabase
      .from('user_behavior_profile')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data || null;
  } catch { return null; }
}

function buildUserPrefs(userId, searchParams, profile) {
  return {
    buyer_id: userId,
    budget_min: profile?.inferred_budget_min || parseInt(searchParams?.minPrice || '') || null,
    budget_max: profile?.inferred_budget_max || parseInt(searchParams?.maxPrice || '') || null,
    preferred_cities: profile?.top_cities?.length ? profile.top_cities : (searchParams?.location ? [searchParams.location] : []),
    preferred_neighborhoods: [],
    bedrooms_min: profile?.inferred_beds_min || parseInt(searchParams?.beds || '') || null,
    bedrooms_max: profile?.inferred_beds_max || parseInt(searchParams?.beds || '') || null,
    bathrooms_min: profile?.inferred_baths_min || parseInt(searchParams?.baths || '') || null,
    property_types: profile?.top_property_types?.length ? profile.top_property_types : (searchParams?.propertyType ? [searchParams.propertyType] : []),
    must_haves: [],
    nice_to_haves: [],
    move_in_timeline_months: null,
    risk_tolerance: 'balanced'
  };
}

function normalizeSuggestions(payload, userId) {
  if (!payload || typeof payload !== 'object') return null;
  // Accept root object or direct array
  if (Array.isArray(payload)) {
    return {
      buyer_id: userId,
      suggestions: payload,
      explanation: null
    };
  }
  if (!Array.isArray(payload.suggestions)) {
    payload.suggestions = [];
  }
  payload.suggestions = payload.suggestions
    .filter(s => s && s.listing_id)
    .slice(0, MAX_SUGGESTIONS)
    .map(s => ({
      listing_id: String(s.listing_id),
      reason: s.reason || '',
      match_score: typeof s.match_score === 'number'
        ? Math.min(Math.max(s.match_score, 0), 1)
        : 0
    }));
  return payload;
}

async function parseAIResponse(res, userId) {
  // If content-type is JSON rely on res.json()
  const ct = res.headers.get('content-type') || '';
  let rawText = '';
  try {
    if (ct.includes('application/json')) {
      const j = await res.json();
      return normalizeSuggestions(j, userId);
    }
    rawText = await res.text();
  } catch (e) {
    console.warn('parseAIResponse body read failed', e.message);
    return null;
  }

  // Attempt direct JSON parse
  try {
    const direct = JSON.parse(rawText);
    return normalizeSuggestions(direct, userId);
  } catch {
    // salvage
    const salvaged = salvageJson(rawText);
    if (salvaged) return normalizeSuggestions(salvaged, userId);
  }

  console.warn('AI output not valid JSON, raw (truncated):', rawText.slice(0, 300));
  return null;
}

export async function generatePropertySuggestions(userId, searchParams, properties) {
  if (!userId) return null;
  const cached = getCachedSuggestions(userId);
  if (cached) return cached;

  try {
    const [savedIds, viewedIds, profile] = await Promise.all([
      fetchSavedListingIds(userId),
      fetchViewedListingIds(userId),
      fetchBehaviorProfile(userId)
    ]);

    const payload = {
      user_prefs: buildUserPrefs(userId, searchParams, profile),
      user_context: {
        recent_saved_listing_ids: savedIds,
        recent_viewed_listing_ids: viewedIds,
        notes_from_agent: null,
        market_summary_text: profile?.summary_text || null
      },
      candidates: mapCandidates(properties),
      max_suggestions: MAX_SUGGESTIONS
    };

    // Initial attempt
    let res = await fetch(`${AI_BASE}/suggest-properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let parsed = await parseAIResponse(res, userId);

    // Retry with stricter instruction if failed
    if (!parsed) {
      console.warn('First AI parse failed, retrying with enforce_json instruction');
      const retryPayload = { ...payload, enforce_json: true, instruction: RETRY_JSON_INSTRUCTION };
      res = await fetch(`${AI_BASE}/suggest-properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(retryPayload)
      });
      parsed = await parseAIResponse(res, userId);
    }

    if (!parsed) {
      console.warn('AI suggestions unavailable after salvage attempts');
      return null;
    }

    // Persist
    try {
      await supabase
        .from('user_ai_suggestions')
        .insert({
          user_id: userId,
          suggestions: parsed,
          source_query: searchParams || {},
          candidates: payload.candidates,
          model_name: parsed.model_name || null
        });
    } catch (e) {
      console.warn('Persist suggestions failed', e.message);
    }

    cacheSuggestions(userId, parsed);
    return parsed;
  } catch (e) {
    console.warn('generatePropertySuggestions error', e.message);
    return null;
  }
}

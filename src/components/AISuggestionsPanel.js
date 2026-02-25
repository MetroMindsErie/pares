"use client";
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchLatestSuggestions, markSuggestionsConsumed, clearCachedSuggestions } from '../lib/searchCache';
import { generatePropertySuggestions } from '../services/aiSuggestService';
import { useAuth } from '../context/auth-context';
import { getPropertyDetails } from '../services/trestleServices';
import { getPrimaryPhotoUrl } from '../utils/mediaHelpers';

export const AISuggestionsPanel = ({ recentSearchParams, recentProperties }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suggestionsPayload, setSuggestionsPayload] = useState(null);
  const [error, setError] = useState(null);
  const [markedRead, setMarkedRead] = useState(false);

  // carousel state
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [imagesLoading, setImagesLoading] = useState(false);

  const loadSuggestions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLatestSuggestions(user.id, true); // latest by generated_at
      setSuggestionsPayload(data);
    } catch (e) {
      setError('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  // Optional trigger to generate new suggestions if none exist yet and we have recent search context
  const regenerate = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      clearCachedSuggestions(user.id);
      const gen = await generatePropertySuggestions(user.id, recentSearchParams || {}, recentProperties || []);
      setSuggestionsPayload(gen);
    } catch (e) {
      setError('Failed to regenerate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const markRead = async () => {
    if (!user?.id) return;
    await markSuggestionsConsumed(user.id);
    setMarkedRead(true);
  };

  // Normalize shapes from payload
  const suggestionsArray = (() => {
    if (!suggestionsPayload) return [];
    if (Array.isArray(suggestionsPayload.suggestions)) return suggestionsPayload.suggestions;
    if (Array.isArray(suggestionsPayload)) return suggestionsPayload;
    return [];
  })();
  const explanation = suggestionsPayload?.explanation || suggestionsPayload?.meta_explanation || null;

  // Simplified: enrich suggestions with primary image from property details
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!suggestionsArray.length) {
        setSlides([]);
        return;
      }
      setImagesLoading(true);
      try {
        const top = suggestionsArray.slice(0, 10);
        const results = await Promise.allSettled(
          top.map(async (s) => {
            try {
              
              // Use getPropertyDetails which includes Media expansion
              const propertyData = await getPropertyDetails(s.listing_id);
              
              // Extract image URL from property data using shared helper
              let imageUrl = '/fallback-property.jpg';
              
              if (propertyData?.Media && Array.isArray(propertyData.Media)) {
                imageUrl = getPrimaryPhotoUrl(propertyData.Media);
              } else if (propertyData?.mediaArray && propertyData.mediaArray.length > 0) {
                imageUrl = propertyData.mediaArray[0];
              } else if (propertyData?.media) {
                imageUrl = propertyData.media;
              }
              
              
              return { ...s, imageUrl };
            } catch (err) {
              console.warn('Error fetching property details for', s.listing_id, err?.message || err);
              return { ...s, imageUrl: '/fallback-property.jpg' };
            }
          })
        );
        
        const enriched = results.map((r, i) => 
          r.status === 'fulfilled' ? r.value : { ...top[i], imageUrl: '/fallback-property.jpg' }
        );
        
        
        if (!cancelled) {
          setSlides(enriched);
          setCurrent(0);
        }
      } finally {
        if (!cancelled) setImagesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [suggestionsArray]);

  const nextSlide = () => setCurrent((prev) => (slides.length ? (prev + 1) % slides.length : 0));
  const prevSlide = () => setCurrent((prev) => (slides.length ? (prev - 1 + slides.length) % slides.length : 0));

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">AI Property Suggestions</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Personalized picks based on your searches, views, and saved properties.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSuggestions} disabled={loading} className="text-xs px-3 py-1.5 rounded-md bg-teal-600 text-white disabled:opacity-60">
            Refresh
          </button>
          <button onClick={regenerate} disabled={loading} className="text-xs px-3 py-1.5 rounded-md bg-teal-600 text-white disabled:opacity-60">
            Regenerate
          </button>
          <button onClick={markRead} disabled={markedRead || loading} className="text-xs px-3 py-1.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 disabled:opacity-50">
            {markedRead ? 'Marked' : 'Mark Read'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-6 text-center text-sm text-gray-600 dark:text-gray-400">Loading suggestions...</div>
      )}
      {error && (
        <div className="py-4 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {!loading && !error && suggestionsArray.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No suggestions yet. Perform a property search to generate personalized results.
          </p>
          {recentProperties?.length ? (
            <button onClick={regenerate} className="mt-4 px-4 py-2 text-sm bg-teal-600 text-white rounded-md">
              Generate From Recent Search
            </button>
          ) : null}
        </div>
      )}

      {/* Carousel view */}
      {!loading && !error && slides.length > 0 && (
        <>
          {explanation && (
            <div className="mb-5 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md">
              {explanation}
            </div>
          )}

          <div className="relative w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <div
              className="flex transition-transform duration-500"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {slides.map((s, idx) => {
                return (
                  <div
                    key={s.listing_id || idx}
                    className="flex-shrink-0 w-full h-64 sm:h-80 relative bg-gray-100 dark:bg-gray-800"
                  >
                    <Link href={`/property/${s.listing_id}`} className="block w-full h-full relative">
                      <img
                        src={s.imageUrl || '/fallback-property.jpg'}
                        alt={s.listing_id}
                        className="w-full h-full object-cover"
                        onError={(e) => { 
                          console.error('Image failed to load:', s.imageUrl);
                          e.target.src = '/fallback-property.jpg'; 
                        }}
                      />
                      {/* Overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold truncate">
                            {s.reason ? s.reason : 'Suggested property'}
                          </div>
                          {typeof s.match_score === 'number' && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/90 text-gray-900">
                              {(s.match_score * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 hover:bg-white rounded-full p-2 shadow"
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 hover:bg-white rounded-full p-2 shadow"
              aria-label="Next"
            >
              ›
            </button>

            {/* Dots */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2.5 w-2.5 rounded-full ${i === current ? 'bg-teal-600' : 'bg-white/80 dark:bg-gray-600'}`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>

            {/* Loading overlay while enriching images */}
            {imagesLoading && (
              <div className="absolute inset-0 bg-white/40 dark:bg-black/30 backdrop-blur-sm flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-teal-600 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          {/* CTA under carousel */}
          <div className="mt-4 text-right">
            <Link
              href={`/property/${slides[current]?.listing_id}`}
              className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm"
            >
              View Property
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default AISuggestionsPanel;

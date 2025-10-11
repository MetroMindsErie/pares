import { useState, useEffect } from 'react';

const SEARCH_RESULTS_KEY = 'pares_search_results';
const SEARCH_PARAMS_KEY = 'pares_search_params';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Custom hook for managing search state with caching
 */
export default function useSearchCache() {
  const [searchResults, setSearchResults] = useState([]);
  const [searchParams, setSearchParams] = useState({});
  const [loading, setLoading] = useState(false);
  const [cacheTime, setCacheTime] = useState(null);

  // Load cache on mount
  useEffect(() => {
    try {
      const cachedResultsStr = localStorage.getItem(SEARCH_RESULTS_KEY);
      const cachedParamsStr = localStorage.getItem(SEARCH_PARAMS_KEY);
      
      if (cachedResultsStr && cachedParamsStr) {
        const cachedData = JSON.parse(cachedResultsStr);
        const cachedParams = JSON.parse(cachedParamsStr);
        
        // Check if cache is still valid (within 30 minutes)
        const timestamp = cachedData.timestamp || 0;
        const now = Date.now();
        
        if (now - timestamp < CACHE_DURATION) {
          setSearchResults(cachedData.results || []);
          setSearchParams(cachedParams);
          setCacheTime(timestamp);
        } else {
          // Clear expired cache
          clearCache();
        }
      }
    } catch (error) {
      console.error("Error loading search cache:", error);
      clearCache();
    }
  }, []);

  // Update cache with new search results
  const cacheResults = (results, params) => {
    if (!results || !params) return;
    
    try {
      const timestamp = Date.now();
      const cacheData = {
        results,
        timestamp
      };
      
      localStorage.setItem(SEARCH_RESULTS_KEY, JSON.stringify(cacheData));
      localStorage.setItem(SEARCH_PARAMS_KEY, JSON.stringify(params));
      
      setSearchResults(results);
      setSearchParams(params);
      setCacheTime(timestamp);
    } catch (error) {
      console.error("Error caching search results:", error);
    }
  };

  // Clear search cache
  const clearCache = () => {
    localStorage.removeItem(SEARCH_RESULTS_KEY);
    localStorage.removeItem(SEARCH_PARAMS_KEY);
    setSearchResults([]);
    setSearchParams({});
    setCacheTime(null);
  };

  // Check if we have valid cached results
  const hasCachedResults = () => {
    return searchResults.length > 0 && cacheTime && (Date.now() - cacheTime < CACHE_DURATION);
  };

  return {
    searchResults,
    searchParams,
    loading,
    setLoading,
    cacheResults,
    clearCache,
    hasCachedResults
  };
}
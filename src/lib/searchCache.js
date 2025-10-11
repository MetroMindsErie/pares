/**
 * Utilities for caching and retrieving search results
 */

const CACHE_KEY = 'pares_search_cache';
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

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
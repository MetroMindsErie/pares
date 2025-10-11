import React from 'react';
import { useRouter } from 'next/router';
import { hasCachedSearchResults } from '../lib/searchCache';

/**
 * Button that returns to search results, preserving previous search state
 */
export default function BackToSearchButton({ className = "" }) {
  const router = useRouter();

  const handleBackToSearch = () => {
    // Check for cached results or stored search state
    const searchState = sessionStorage.getItem('propertySearchState');
    const searchFilters = sessionStorage.getItem('propertySearchFilters');
    
    if (hasCachedSearchResults() || searchState || searchFilters) {
      // Build URL with preserved search parameters
      const parsedFilters = searchFilters ? JSON.parse(searchFilters) : {};
      const searchQueryParams = new URLSearchParams();
      
      // Add all non-empty search params to the URL
      Object.entries(parsedFilters).forEach(([key, value]) => {
        if (value) {
          searchQueryParams.set(key, value);
        }
      });
      
      const queryString = searchQueryParams.toString();
      const searchUrl = queryString ? `/search?${queryString}` : '/search';
      
      router.push(searchUrl);
    } else {
      // Fallback to basic search if no cache
      router.push('/search');
    }
  };

  return (
    <button
      onClick={handleBackToSearch}
      className={`flex items-center px-4 py-2 text-white bg-slate-700 hover:bg-slate-800 rounded-md transition ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
      </svg>
      Back to {hasCachedSearchResults() ? 'Search Results' : 'Search'}
    </button>
  );
}
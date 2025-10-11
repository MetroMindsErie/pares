import React from 'react';
import { useRouter } from 'next/router';
import { hasCachedSearchResults, getCachedSearchResults } from '../lib/searchCache';

/**
 * Button that navigates back to the homepage with cached search results
 */
const BackToListingsButton = ({ className = "" }) => {
  const router = useRouter();

  const handleClick = () => {
    // Check if we have cached search results
    if (hasCachedSearchResults()) {
      // If we have cached results, check if we came from search page
      const searchState = sessionStorage.getItem('propertySearchState');
      const searchFilters = sessionStorage.getItem('propertySearchFilters');
      
      if (searchState || searchFilters) {
        // Navigate back to search with preserved state
        const parsedFilters = searchFilters ? JSON.parse(searchFilters) : {};
        const queryParams = new URLSearchParams();
        
        Object.entries(parsedFilters).forEach(([key, value]) => {
          if (value) queryParams.set(key, value);
        });
        
        const queryString = queryParams.toString();
        const searchUrl = queryString ? `/search?${queryString}` : '/search';
        router.push(searchUrl);
      } else {
        // Navigate to homepage and let it handle cached results
        router.push('/');
      }
    } else {
      // No cache, navigate back to homepage
      router.push('/');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-md transition ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
      </svg>
      Back to {hasCachedSearchResults() ? 'Search Results' : 'Listings'}
    </button>
  );
};

export default BackToListingsButton;
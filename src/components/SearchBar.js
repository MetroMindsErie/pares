"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchProperties } from '../services/trestleServices';

const SearchBar = ({ onSearchResults }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useState({
    location: '',
    status: '', // Remove default 'Active' - let users choose explicitly
    minPrice: '',
    maxPrice: '',
    beds: '',
    baths: '',
    propertyType: '',
    minSqFt: '',
    maxSqFt: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Filter out empty values to create a clean query object
      const query = Object.entries(searchParams)
        .filter(([_, value]) => value !== '')
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
      
      // Check if user wants swiper experience (you can add this as a toggle)
      const useSwiper = localStorage.getItem('preferSwiper') === 'true';
      
      if (useSwiper && searchParams.location) {
        // Navigate to swiper page
        router.push({
          pathname: '/swipe',
          query: { q: searchParams.location }
        });
        return;
      }
      
      const { properties, nextLink } = await searchProperties(query);
      
      // Pass the search results to the parent component
      if (onSearchResults) {
        onSearchResults(properties, nextLink);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
      {/* Tech-inspired decorative elements */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-blue-400 to-indigo-500 opacity-20 rounded-full blur-2xl"></div>
      <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-gradient-to-tr from-cyan-400 to-blue-500 opacity-20 rounded-full blur-2xl"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
      
      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        {/* Location Search */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg blur opacity-30 group-hover:opacity-40 transition duration-300"></div>
          <input
            type="text"
            id="location"
            name="location"
            value={searchParams.location}
            onChange={handleChange}
            placeholder="Enter County, ZIP Code, or Address"
            className="w-full px-4 py-3.5 rounded-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 dark:text-gray-200 shadow-sm relative transition-all duration-300"
          />
          <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 pl-2">
            Try searching for "Erie", "Warren", "Crawford" counties or enter a ZIP code
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Status Filter */}
          <div className="relative">
            <select
              id="status"
              name="status"
              value={searchParams.status}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 text-sm appearance-none transition-all duration-300"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="ActiveUnderContract">Under Contract</option>
              <option value="Pending">Pending</option>
              <option value="Closed">Sold</option>
              <option value="ComingSoon">Coming Soon</option>
              <option value="Hold">Hold</option>
              <option value="Withdrawn">Withdrawn</option>
              <option value="Canceled">Canceled</option>
              <option value="Expired">Expired</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-500">
              <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>

          {/* Price Range - Min */}
          <div className="relative">
            <select
              id="minPrice"
              name="minPrice"
              value={searchParams.minPrice}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 text-sm appearance-none transition-all duration-300"
            >
              <option value="">Min</option>
              <option value="100000">$100k</option>
              <option value="200000">$200k</option>
              <option value="300000">$300k</option>
              <option value="400000">$400k</option>
              <option value="500000">$500k</option>
              <option value="750000">$750k</option>
              <option value="1000000">$1M</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-500">
              <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
          
          {/* Price Range - Max */}
          <div className="relative">
            <select
              id="maxPrice"
              name="maxPrice"
              value={searchParams.maxPrice}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 text-sm appearance-none transition-all duration-300"
            >
              <option value="">Max</option>
              <option value="300000">$300k</option>
              <option value="500000">$500k</option>
              <option value="750000">$750k</option>
              <option value="1000000">$1M</option>
              <option value="1500000">$1.5M</option>
              <option value="2000000">$2M+</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-500">
              <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
          
          {/* Beds */}
          <div className="relative">
            <select
              id="beds"
              name="beds"
              value={searchParams.beds}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 text-sm appearance-none transition-all duration-300"
            >
              <option value="">Beds</option>
              <option value="1">1+ beds</option>
              <option value="2">2+ beds</option>
              <option value="3">3+ beds</option>
              <option value="4">4+ beds</option>
              <option value="5">5+ beds</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-500">
              <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
          
          {/* Baths */}
          <div className="relative">
            <select
              id="baths"
              name="baths"
              value={searchParams.baths}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 text-sm appearance-none transition-all duration-300"
            >
              <option value="">Baths</option>
              <option value="1">1+ baths</option>
              <option value="2">2+ baths</option>
              <option value="3">3+ baths</option>
              <option value="4">4+ baths</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-500">
              <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 mt-2">
          {/* Search Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-all duration-300 shadow-sm hover:shadow-lg disabled:opacity-70 flex items-center justify-center group border border-transparent hover:border-blue-400"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Searching</span>
                <span className="dots-loading ml-1">
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                </span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2 transform group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                Search
              </>
            )}
          </button>
          
          {/* Swipe Mode Button */}
          {/* <button
            type="button"
            onClick={() => {
              if (searchParams.location) {
                router.push({
                  pathname: '/swipe',
                  query: { q: searchParams.location }
                });
              }
            }}
            disabled={!searchParams.location}
            className="px-4 py-2 border border-blue-200 dark:border-blue-800 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-600 dark:text-blue-400 rounded-md transition-all duration-300 text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <svg className="w-4 h-4 mr-1.5 transform transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
            Swipe
          </button> */}
        </div>
        
        {error && (
          <div className="mt-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-md flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            {error}
          </div>
        )}
      </form>
      
      {/* Add style for dots loading animation */}
      <style jsx>{`
        .dots-loading .dot {
          animation: dotLoading 1.5s infinite;
          display: inline-block;
          opacity: 0;
        }
        .dots-loading .dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .dots-loading .dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes dotLoading {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default SearchBar;

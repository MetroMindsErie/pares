"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchProperties } from '../services/trestleServices';
import { useAuth } from '../context/auth-context';
import { logSearchQuery } from '../services/userActivityService';
import { generatePropertySuggestions } from '../services/aiSuggestService';
import { fetchLatestSuggestions } from '../lib/searchCache';

const SearchBar = ({ onSearchResults }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useState({
    location: '',
    status: '',
    minPrice: '',
    maxPrice: '',
    beds: '',
    baths: '',
    propertyType: '',
    minSqFt: '',
    maxSqFt: '',
    soldWithin: '', // Add new state for sold timeline
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
      logSearchQuery(user?.id, searchParams, properties?.length || 0);
      // Store last search params for dashboard regeneration
      try { localStorage.setItem('lastSearchParams', JSON.stringify(searchParams)); } catch {}
      if (user?.id && properties?.length) {
        generatePropertySuggestions(user.id, searchParams, properties)
          .then(s => console.log('AI suggestions parsed:', s))
          .catch(()=>{});
      }
      
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
    <div className="w-full backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800 rounded-xl p-3 sm:p-4 md:p-6 shadow-xl relative overflow-hidden">
      {/* Tech-inspired decorative elements */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-blue-400 to-indigo-500 opacity-20 rounded-full blur-2xl"></div>
      <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-gradient-to-tr from-cyan-400 to-blue-500 opacity-20 rounded-full blur-2xl"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
      
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-5 relative z-10">
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
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 md:py-3.5 rounded-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 dark:text-gray-200 shadow-sm relative transition-all duration-300 text-sm sm:text-base"
          />
          <div className="mt-1 sm:mt-1.5 text-xs text-gray-500 dark:text-gray-400 pl-1 sm:pl-2">
            Try searching for "Erie", "Warren", "Crawford" counties or enter a ZIP code
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {/* Status Filter */}
          <div className="relative col-span-2 sm:col-span-1">
            <select
              id="status"
              name="status"
              value={searchParams.status}
              onChange={handleChange}
              className="w-full px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 text-xs sm:text-sm appearance-none transition-all duration-300"
            >
              <option value="">Status</option>
              <option value="Active">Active</option>
              <option value="ActiveUnderContract">Under Contract</option>
              <option value="Pending">Pending</option>
              <option value="Closed">Sold</option>
              <option value="ComingSoon">Coming Soon</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-2 text-blue-500">
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>

          {/* Property Type Filter */}
          <div className="relative col-span-2 sm:col-span-1">
            <select
              id="propertyType"
              name="propertyType"
              value={searchParams.propertyType}
              onChange={handleChange}
              className="w-full px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 text-xs sm:text-sm appearance-none transition-all duration-300"
            >
              <option value="">Property Type</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Land">Land</option>
              <option value="Multi-Family">Multi-Family</option>
              <option value="Farm">Farm</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-2 text-blue-500">
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
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
              className="w-full px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 text-xs sm:text-sm appearance-none transition-all duration-300"
            >
              <option value="">Min Price</option>
              <option value="100000">$100k</option>
              <option value="200000">$200k</option>
              <option value="300000">$300k</option>
              <option value="400000">$400k</option>
              <option value="500000">$500k</option>
              <option value="750000">$750k</option>
              <option value="1000000">$1M</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-2 text-blue-500">
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
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
              className="w-full px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 text-xs sm:text-sm appearance-none transition-all duration-300"
            >
              <option value="">Max Price</option>
              <option value="300000">$300k</option>
              <option value="500000">$500k</option>
              <option value="750000">$750k</option>
              <option value="1000000">$1M</option>
              <option value="1500000">$1.5M</option>
              <option value="2000000">$2M+</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-2 text-blue-500">
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
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
              className="w-full px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 text-xs sm:text-sm appearance-none transition-all duration-300"
            >
              <option value="">Bedrooms</option>
              <option value="1">1+ beds</option>
              <option value="2">2+ beds</option>
              <option value="3">3+ beds</option>
              <option value="4">4+ beds</option>
              <option value="5">5+ beds</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-2 text-blue-500">
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
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
              className="w-full px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 rounded-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 text-xs sm:text-sm appearance-none transition-all duration-300"
            >
              <option value="">Bathrooms</option>
              <option value="1">1+ baths</option>
              <option value="2">2+ baths</option>
              <option value="3">3+ baths</option>
              <option value="4">4+ baths</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-2 text-blue-500">
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>
        
        {/* Conditional Sold Timeline Filter - Now more prominent */}
        {searchParams.status === 'Closed' && (
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter Sold Properties
              </span>
            </div>
            
            {/* Timeline Filter */}
            <div className="relative mb-4">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5 ml-1">
                Sold Timeline
              </label>
              <select
                id="soldWithin"
                name="soldWithin"
                value={searchParams.soldWithin}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 text-base font-medium appearance-none transition-all duration-300"
              >
                <option value="">Show sold properties from...</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 3 months</option>
                <option value="180">Last 6 months</option>
                <option value="365">Last 12 months</option>
                <option value="730">Last 24 months</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-blue-500" style={{ top: '24px' }}>
                <svg className="h-5 w-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>

            {/* Square Footage Filters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5 ml-1">
                  Min Sq Ft
                </label>
                <select
                  id="minSqFt"
                  name="minSqFt"
                  value={searchParams.minSqFt}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 text-sm appearance-none transition-all duration-300"
                >
                  <option value="">No Min</option>
                  <option value="500">500 sqft</option>
                  <option value="750">750 sqft</option>
                  <option value="1000">1,000 sqft</option>
                  <option value="1250">1,250 sqft</option>
                  <option value="1500">1,500 sqft</option>
                  <option value="2000">2,000 sqft</option>
                  <option value="2500">2,500 sqft</option>
                  <option value="3000">3,000 sqft</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-500" style={{ top: '24px' }}>
                  <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5 ml-1">
                  Max Sq Ft
                </label>
                <select
                  id="maxSqFt"
                  name="maxSqFt"
                  value={searchParams.maxSqFt}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 text-sm appearance-none transition-all duration-300"
                >
                  <option value="">No Max</option>
                  <option value="1000">1,000 sqft</option>
                  <option value="1500">1,500 sqft</option>
                  <option value="2000">2,000 sqft</option>
                  <option value="2500">2,500 sqft</option>
                  <option value="3000">3,000 sqft</option>
                  <option value="4000">4,000 sqft</option>
                  <option value="5000">5,000 sqft</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-500" style={{ top: '24px' }}>
                  <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Filter sold properties by closing date and square footage
            </p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-4">
          {/* Search Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 sm:py-3 px-3 sm:px-4 rounded-md transition-all duration-300 shadow-sm hover:shadow-lg disabled:opacity-70 flex items-center justify-center group border border-transparent hover:border-blue-400 text-sm sm:text-base min-h-[44px]"
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
        </div>
        
        {error && (
          <div className="mt-2 text-red-600 dark:text-red-400 text-xs sm:text-sm bg-red-50 dark:bg-red-900/30 px-2 sm:px-3 py-2 rounded-md flex items-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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

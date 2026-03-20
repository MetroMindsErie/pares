"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchProperties } from '../services/trestleServices';
import { useAuth } from '../context/auth-context';
import { logSearchQuery } from '../services/userActivityService';
import { generatePropertySuggestions } from '../services/aiSuggestService';
import { fetchLatestSuggestions } from '../lib/searchCache';

// Suggestion type icons
const TypeIcon = ({ type }) => {
  switch (type) {
    case 'address':
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'city':
      return (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case 'county':
      return (
        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      );
    case 'zip':
      return (
        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

const typeLabel = (type) => {
  switch (type) {
    case 'address': return 'Address';
    case 'city': return 'City';
    case 'county': return 'County';
    case 'zip': return 'ZIP';
    case 'recent': return 'Recent';
    default: return '';
  }
};

// Small helper component for active filter pills
const FilterPill = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-300 text-xs font-semibold" style={{fontFamily:'var(--font-poppins, Poppins), sans-serif'}}>
    {label}
    <button type="button" onClick={onRemove} className="ml-0.5 text-teal-400 hover:text-teal-600 dark:hover:text-teal-300 transition-colors">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </span>
);

// Dropdown filter button — shows a popover menu anchored to the button
const FilterDropdown = ({ label, value, displayValue, isOpen, onToggle, children }) => (
  <div className="relative">
    <button type="button" onClick={onToggle}
      style={{fontFamily:'var(--font-poppins, Poppins), sans-serif'}}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-[0.8rem] font-semibold tracking-[0.02em] transition-all duration-150 whitespace-nowrap ${
        value
          ? 'border-teal-400 bg-teal-50 text-teal-700 dark:border-teal-600 dark:bg-teal-900/40 dark:text-teal-300'
          : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-teal-900/20 dark:hover:border-teal-600'
      }`}>
      {value && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />}
      <span>{displayValue || label}</span>
      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {isOpen && (
      <div className="absolute top-full left-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 w-[min(220px,90vw)] py-1 animate-in fade-in slide-in-from-top-1 duration-150">
        {children}
      </div>
    )}
  </div>
);

// Option row inside a FilterDropdown
const FilterOption = ({ selected, onClick, children }) => (
  <button type="button" onClick={onClick}
    style={{fontFamily:'var(--font-poppins, Poppins), sans-serif'}}
    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
      selected
        ? 'bg-teal-50 text-teal-700 font-semibold dark:bg-teal-900/40 dark:text-teal-300'
        : 'text-slate-600 hover:bg-teal-50 hover:text-teal-700 dark:text-slate-300 dark:hover:bg-teal-900/20'
    }`}>
    <span>{children}</span>
    {selected && (
      <svg className="w-4 h-4 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    )}
  </button>
);

const SearchBar = ({
  onSearchResults,
  onSearchStart,
  requireSpecialCondition = false,
  initialParams = {},
  submitLabel = 'Search'
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);

  // Filters toggle
  const [showFilters, setShowFilters] = useState(false);
  // Which dropdown is currently open (only one at a time)
  const [openDropdown, setOpenDropdown] = useState(null);
  const filterBarRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (name) => setOpenDropdown(prev => prev === name ? null : name);

  const [searchParams, setSearchParams] = useState({
    location: '',
    status: '',
    specialListingConditions: '',
    minPrice: '',
    maxPrice: '',
    beds: '',
    baths: '',
    propertyType: '',
    minSqFt: '',
    maxSqFt: '',
    soldWithin: '',
    mlsAreaMajor: '',
    mlsAreaMinor: '',
    sort: '',
    ...initialParams,
  });

  // Recent searches
  const [recentSearches, setRecentSearches] = useState([]);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('pares_recent_searches') || '[]');
      setRecentSearches(stored.slice(0, 5));
    } catch { /* ignore */ }
  }, []);

  const saveRecentSearch = (term) => {
    if (!term?.trim()) return;
    try {
      const stored = JSON.parse(localStorage.getItem('pares_recent_searches') || '[]');
      const updated = [term, ...stored.filter(s => s !== term)].slice(0, 10);
      localStorage.setItem('pares_recent_searches', JSON.stringify(updated));
      setRecentSearches(updated.slice(0, 5));
    } catch { /* ignore */ }
  };

  const mlsAreaMajorOptions = [
    { value: 'Crawford Northeast', label: 'Crawford Northeast' },
    { value: 'Crawford Northwest', label: 'Crawford Northwest' },
    { value: 'Crawford Southeast', label: 'Crawford Southeast' },
    { value: 'Crawford Southwest', label: 'Crawford Southwest' },
    { value: 'Erie Northeast', label: 'Erie Northeast' },
    { value: 'Erie Northwest', label: 'Erie Northwest' },
    { value: 'Erie Southeast', label: 'Erie Southeast' },
    { value: 'Erie Southwest', label: 'Erie Southwest' },
    { value: 'Warren Northeast', label: 'Warren Northeast' },
    { value: 'Warren Northwest', label: 'Warren Northwest' },
    { value: 'Warren Southeast', label: 'Warren Southeast' },
    { value: 'Warren Southwest', label: 'Warren Southwest' },
  ];

  // Fetch autocomplete suggestions from server
  const fetchAutocompleteSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    setFetchingSuggestions(true);
    try {
      const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.warn('Autocomplete fetch failed:', err);
    } finally {
      setFetchingSuggestions(false);
    }
  }, []);

  // Handle location input with debounced autocomplete
  const handleLocationChange = (e) => {
    const value = e.target.value;
    setSearchParams(prev => ({ ...prev, location: value }));
    setActiveSuggestion(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length >= 2) {
      setShowSuggestions(true);
      debounceRef.current = setTimeout(() => fetchAutocompleteSuggestions(value), 250);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Suggestion selection
  const selectSuggestion = (suggestion) => {
    setSearchParams(prev => ({ ...prev, location: suggestion.searchValue || suggestion.value }));
    setShowSuggestions(false);
    setSuggestions([]);
    setActiveSuggestion(-1);
    saveRecentSearch(suggestion.label);
    inputRef.current?.focus();
  };

  // Combine API suggestions with recent searches
  const allSuggestions = searchParams.location.length >= 2
    ? suggestions
    : recentSearches.map(s => ({ type: 'recent', label: s, value: s, searchValue: s }));

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || !allSuggestions.length) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestion(prev => prev < allSuggestions.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestion(prev => prev > 0 ? prev - 1 : allSuggestions.length - 1);
        break;
      case 'Enter':
        if (activeSuggestion >= 0 && activeSuggestion < allSuggestions.length) {
          e.preventDefault();
          selectSuggestion(allSuggestions[activeSuggestion]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        break;
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputFocus = () => {
    if (searchParams.location.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    } else if (searchParams.location.length < 2 && recentSearches.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };

  // Count active filters
  const activeFilterCount = [
    searchParams.status, searchParams.specialListingConditions,
    searchParams.minPrice, searchParams.maxPrice,
    searchParams.beds, searchParams.baths,
    searchParams.propertyType, searchParams.minSqFt,
    searchParams.maxSqFt, searchParams.mlsAreaMajor, searchParams.sort,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchParams(prev => ({
      ...prev,
      status: '', specialListingConditions: '',
      minPrice: '', maxPrice: '', beds: '', baths: '',
      propertyType: '', minSqFt: '', maxSqFt: '',
      soldWithin: '', mlsAreaMajor: '', mlsAreaMinor: '', sort: '',
    }));
  };

  // Reusable select component
  const SelectField = ({ id, name, value, options, placeholder }) => (
    <div className="relative">
      <select id={id} name={name} value={value} onChange={handleChange}
        className="w-full px-3 py-2.5 pr-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-300 dark:focus:ring-gray-500 dark:focus:border-gray-500 text-gray-700 dark:text-gray-200 text-sm appearance-none transition-all duration-200">
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400">
        <svg className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    if (onSearchStart) onSearchStart();

    try {
      const query = Object.entries(searchParams)
        .filter(([_, value]) => value !== '')
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

      saveRecentSearch(searchParams.location);

      const useSwiper = localStorage.getItem('preferSwiper') === 'true';
      if (useSwiper && searchParams.location) {
        router.push({ pathname: '/swipe', query: { q: searchParams.location } });
        return;
      }

      const { properties, nextLink } = await searchProperties(query);

      logSearchQuery(user?.id, searchParams, properties?.length || 0);
      try { localStorage.setItem('lastSearchParams', JSON.stringify(searchParams)); } catch {}
      if (user?.id && properties?.length) {
        generatePropertySuggestions(user.id, searchParams, properties).catch(() => {});
      }

      if (onSearchResults) onSearchResults(properties, nextLink);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-3 relative">
        {/* Main Search Bar - Zillow-style */}
        <div className="relative">
          <div className="flex items-stretch rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-visible focus-within:ring-2 focus-within:ring-teal-400 focus-within:border-teal-400 dark:focus-within:ring-teal-500 dark:focus-within:border-teal-500 transition-all duration-200">
            {/* Search icon */}
            <div className="flex items-center pl-4 pr-2">
              {fetchingSuggestions ? (
                <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>

            {/* Location input */}
            <input
              ref={inputRef}
              type="text"
              id="location"
              name="location"
              value={searchParams.location}
              onChange={handleLocationChange}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              placeholder="Search address, city, county, or ZIP..."
              autoComplete="off"
              style={{fontFamily:'var(--font-poppins, Poppins), sans-serif'}}
              className="flex-1 min-w-0 px-2 py-3.5 sm:py-4 text-sm sm:text-base bg-transparent border-0 focus:ring-0 focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />

            {/* Clear */}
            {searchParams.location && (
              <button type="button" onClick={() => { setSearchParams(prev => ({ ...prev, location: '' })); setSuggestions([]); setShowSuggestions(false); inputRef.current?.focus(); }}
                className="px-2 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}

            {/* Search button */}
            <button type="submit" disabled={loading}
              style={{fontFamily:'var(--font-poppins, Poppins), sans-serif'}}
              className="flex items-center gap-2 px-5 sm:px-7 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold text-[0.72rem] sm:text-[0.8rem] tracking-[0.1em] uppercase transition-all duration-200 disabled:opacity-60 min-h-[48px] rounded-r-xl shadow-sm">
              {loading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <span className="hidden sm:inline">{submitLabel}</span>
                </>
              )}
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && allSuggestions.length > 0 && (
            <div ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 max-h-[min(400px,60vh)] overflow-y-auto">
              {searchParams.location.length < 2 && recentSearches.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent Searches</span>
                  <button type="button" onClick={() => { localStorage.removeItem('pares_recent_searches'); setRecentSearches([]); setShowSuggestions(false); }}
                    className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors">Clear</button>
                </div>
              )}
              {(() => {
                let lastType = '';
                return allSuggestions.map((suggestion, index) => {
                  const showHeader = suggestion.type !== lastType && searchParams.location.length >= 2;
                  lastType = suggestion.type;
                  return (
                    <React.Fragment key={`${suggestion.type}-${suggestion.label}-${index}`}>
                      {showHeader && (
                        <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {suggestion.type === 'address' ? 'Addresses' : suggestion.type === 'city' ? 'Cities' : suggestion.type === 'county' ? 'Counties' : suggestion.type === 'zip' ? 'ZIP Codes' : ''}
                          </span>
                        </div>
                      )}
                      <button type="button" onClick={() => selectSuggestion(suggestion)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${index === activeSuggestion ? 'bg-teal-50 dark:bg-teal-900/30' : 'hover:bg-teal-50/60 dark:hover:bg-teal-900/20'}`}>
                        <TypeIcon type={suggestion.type} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-900 dark:text-gray-100 truncate block">{suggestion.label}</span>
                          {suggestion.type === 'address' && suggestion.county && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">{suggestion.county} County</span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          suggestion.type === 'address' ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200' :
                          suggestion.type === 'city' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                          suggestion.type === 'county' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                          suggestion.type === 'zip' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>{typeLabel(suggestion.type)}</span>
                      </button>
                    </React.Fragment>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Quick Filter Bar — always visible, Zillow-style horizontal dropdowns */}
        <div ref={filterBarRef} className="flex items-center gap-2 flex-wrap">
          {/* For Sale / Status dropdown */}
          <FilterDropdown label="For Sale" value={searchParams.status}
            displayValue={searchParams.status ? (searchParams.status === 'Closed' ? 'Sold' : searchParams.status === 'ActiveUnderContract' ? 'Under Contract' : searchParams.status) : 'For Sale'}
            isOpen={openDropdown === 'status'} onToggle={() => toggleDropdown('status')}>
            <FilterOption selected={!searchParams.status} onClick={() => { setSearchParams(prev => ({ ...prev, status: '' })); setOpenDropdown(null); }}>Any Status</FilterOption>
            <FilterOption selected={searchParams.status === 'Active'} onClick={() => { setSearchParams(prev => ({ ...prev, status: 'Active' })); setOpenDropdown(null); }}>Active</FilterOption>
            <FilterOption selected={searchParams.status === 'ActiveUnderContract'} onClick={() => { setSearchParams(prev => ({ ...prev, status: 'ActiveUnderContract' })); setOpenDropdown(null); }}>Under Contract</FilterOption>
            <FilterOption selected={searchParams.status === 'Pending'} onClick={() => { setSearchParams(prev => ({ ...prev, status: 'Pending' })); setOpenDropdown(null); }}>Pending</FilterOption>
            <FilterOption selected={searchParams.status === 'Closed'} onClick={() => { setSearchParams(prev => ({ ...prev, status: 'Closed' })); setOpenDropdown(null); }}>Sold</FilterOption>
            <FilterOption selected={searchParams.status === 'ComingSoon'} onClick={() => { setSearchParams(prev => ({ ...prev, status: 'ComingSoon' })); setOpenDropdown(null); }}>Coming Soon</FilterOption>
          </FilterDropdown>

          {/* Price dropdown */}
          <FilterDropdown label="Price"
            value={searchParams.minPrice || searchParams.maxPrice}
            displayValue={
              searchParams.minPrice && searchParams.maxPrice
                ? `$${(Number(searchParams.minPrice)/1000)}k – $${(Number(searchParams.maxPrice)/1000)}k`
                : searchParams.minPrice ? `$${(Number(searchParams.minPrice)/1000)}k+`
                : searchParams.maxPrice ? `Up to $${(Number(searchParams.maxPrice)/1000)}k`
                : 'Price'
            }
            isOpen={openDropdown === 'price'} onToggle={() => toggleDropdown('price')}>
            <div className="px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price Range</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Minimum</label>
                  <select name="minPrice" value={searchParams.minPrice} onChange={handleChange}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200">
                    <option value="">No Min</option>
                    <option value="0">$0</option>
                    <option value="50000">$50k</option>
                    <option value="100000">$100k</option>
                    <option value="150000">$150k</option>
                    <option value="200000">$200k</option>
                    <option value="300000">$300k</option>
                    <option value="500000">$500k</option>
                    <option value="750000">$750k</option>
                    <option value="1000000">$1M</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Maximum</label>
                  <select name="maxPrice" value={searchParams.maxPrice} onChange={handleChange}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200">
                    <option value="">No Max</option>
                    <option value="100000">$100k</option>
                    <option value="200000">$200k</option>
                    <option value="300000">$300k</option>
                    <option value="500000">$500k</option>
                    <option value="750000">$750k</option>
                    <option value="1000000">$1M</option>
                    <option value="1500000">$1.5M</option>
                    <option value="2000000">$2M</option>
                    <option value="5000000">$5M+</option>
                  </select>
                </div>
              </div>
              <button type="button" onClick={() => setOpenDropdown(null)}
                style={{fontFamily:'var(--font-poppins, Poppins), sans-serif'}}
              className="w-full mt-1 px-3 py-1.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-xs font-semibold uppercase tracking-[0.08em] rounded-lg transition-colors">
                Apply
              </button>
            </div>
          </FilterDropdown>

          {/* Beds & Baths dropdown */}
          <FilterDropdown label="Beds & Baths"
            value={searchParams.beds || searchParams.baths}
            displayValue={
              searchParams.beds && searchParams.baths ? `${searchParams.beds}+ bd, ${searchParams.baths}+ ba`
              : searchParams.beds ? `${searchParams.beds}+ Beds`
              : searchParams.baths ? `${searchParams.baths}+ Baths`
              : 'Beds & Baths'
            }
            isOpen={openDropdown === 'bedsbaths'} onToggle={() => toggleDropdown('bedsbaths')}>
            <div className="px-4 py-3 space-y-3 w-[min(260px,90vw)]">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Bedrooms</p>
                <div className="flex gap-1">
                  {['', '1', '2', '3', '4', '5'].map(val => (
                    <button key={`bed-${val}`} type="button"
                      onClick={() => setSearchParams(prev => ({ ...prev, beds: val }))}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-lg border transition-colors ${
                        searchParams.beds === val
                          ? 'bg-teal-600 text-white border-teal-600 dark:bg-teal-500 dark:border-teal-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-teal-900/20'
                      }`}>
                      {val ? `${val}+` : 'Any'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Bathrooms</p>
                <div className="flex gap-1">
                  {['', '1', '2', '3', '4'].map(val => (
                    <button key={`bath-${val}`} type="button"
                      onClick={() => setSearchParams(prev => ({ ...prev, baths: val }))}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-lg border transition-colors ${
                        searchParams.baths === val
                          ? 'bg-teal-600 text-white border-teal-600 dark:bg-teal-500 dark:border-teal-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-teal-900/20'
                      }`}>
                      {val ? `${val}+` : 'Any'}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => setOpenDropdown(null)}
                style={{fontFamily:'var(--font-poppins, Poppins), sans-serif'}}
              className="w-full mt-1 px-3 py-1.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-xs font-semibold uppercase tracking-[0.08em] rounded-lg transition-colors">
                Apply
              </button>
            </div>
          </FilterDropdown>

          {/* Home Type dropdown */}
          <FilterDropdown label="Home Type" value={searchParams.propertyType}
            displayValue={searchParams.propertyType || 'Home Type'}
            isOpen={openDropdown === 'type'} onToggle={() => toggleDropdown('type')}>
            <FilterOption selected={!searchParams.propertyType} onClick={() => { setSearchParams(prev => ({ ...prev, propertyType: '' })); setOpenDropdown(null); }}>Any Type</FilterOption>
            <FilterOption selected={searchParams.propertyType === 'Residential'} onClick={() => { setSearchParams(prev => ({ ...prev, propertyType: 'Residential' })); setOpenDropdown(null); }}>Residential</FilterOption>
            <FilterOption selected={searchParams.propertyType === 'Commercial'} onClick={() => { setSearchParams(prev => ({ ...prev, propertyType: 'Commercial' })); setOpenDropdown(null); }}>Commercial</FilterOption>
            <FilterOption selected={searchParams.propertyType === 'Land'} onClick={() => { setSearchParams(prev => ({ ...prev, propertyType: 'Land' })); setOpenDropdown(null); }}>Land</FilterOption>
            <FilterOption selected={searchParams.propertyType === 'Multi-Family'} onClick={() => { setSearchParams(prev => ({ ...prev, propertyType: 'Multi-Family' })); setOpenDropdown(null); }}>Multi-Family</FilterOption>
            <FilterOption selected={searchParams.propertyType === 'Farm'} onClick={() => { setSearchParams(prev => ({ ...prev, propertyType: 'Farm' })); setOpenDropdown(null); }}>Farm</FilterOption>
          </FilterDropdown>

          {/* More Filters toggle */}
          <button type="button" onClick={() => { setShowFilters(!showFilters); setOpenDropdown(null); }}
            style={{fontFamily:'var(--font-poppins, Poppins), sans-serif'}}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-[0.8rem] font-semibold tracking-[0.02em] transition-all duration-150 whitespace-nowrap ${
              showFilters
                ? 'border-teal-400 bg-teal-50 text-teal-700 dark:border-teal-600 dark:bg-teal-900/40 dark:text-teal-300'
                : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-teal-900/20'
            }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            More
            {(searchParams.mlsAreaMajor || searchParams.specialListingConditions || searchParams.minSqFt || searchParams.maxSqFt || searchParams.sort) && (
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-teal-500 dark:bg-teal-400 dark:text-white rounded-full">
                {[searchParams.mlsAreaMajor, searchParams.specialListingConditions, searchParams.minSqFt, searchParams.maxSqFt, searchParams.sort].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Sort shortcut (always visible) */}
          <div className="ml-auto hidden sm:block">
            <FilterDropdown label="Sort" value={searchParams.sort}
              displayValue={
                searchParams.sort === 'price-asc' ? 'Price ↑' :
                searchParams.sort === 'price-desc' ? 'Price ↓' :
                searchParams.sort === 'newest' ? 'Newest' :
                searchParams.sort === 'sqft-desc' ? 'Largest' : 'Sort'
              }
              isOpen={openDropdown === 'sort'} onToggle={() => toggleDropdown('sort')}>
              <FilterOption selected={!searchParams.sort} onClick={() => { setSearchParams(prev => ({ ...prev, sort: '' })); setOpenDropdown(null); }}>Default</FilterOption>
              <FilterOption selected={searchParams.sort === 'price-asc'} onClick={() => { setSearchParams(prev => ({ ...prev, sort: 'price-asc' })); setOpenDropdown(null); }}>Price: Low to High</FilterOption>
              <FilterOption selected={searchParams.sort === 'price-desc'} onClick={() => { setSearchParams(prev => ({ ...prev, sort: 'price-desc' })); setOpenDropdown(null); }}>Price: High to Low</FilterOption>
              <FilterOption selected={searchParams.sort === 'newest'} onClick={() => { setSearchParams(prev => ({ ...prev, sort: 'newest' })); setOpenDropdown(null); }}>Newest First</FilterOption>
              <FilterOption selected={searchParams.sort === 'sqft-desc'} onClick={() => { setSearchParams(prev => ({ ...prev, sort: 'sqft-desc' })); setOpenDropdown(null); }}>Largest First</FilterOption>
            </FilterDropdown>
          </div>
        </div>

        {/* Quick location chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400">Quick:</span>
          {['Erie', 'Crawford', 'Warren', 'Meadville', 'Corry', 'North East'].map(term => (
            <button key={term} type="button"
              onClick={() => { setSearchParams(prev => ({ ...prev, location: term })); inputRef.current?.focus(); }}
              style={{fontFamily:'var(--font-poppins, Poppins), sans-serif'}}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                searchParams.location === term
                  ? 'border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-400 dark:border-teal-400 dark:bg-teal-900/40 dark:text-teal-300'
                  : 'border-teal-200 bg-white text-teal-700 hover:bg-teal-50 hover:border-teal-400 dark:border-teal-700 dark:bg-slate-800 dark:text-teal-400 dark:hover:bg-teal-900/30'
              }`}>
              {term}
            </button>
          ))}
        </div>

        {/* Expandable "More Filters" Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">More Filters</h3>
              {activeFilterCount > 0 && (
                <button type="button" onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 font-medium transition-colors">Clear all</button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">MLS Area</label>
                <SelectField id="mlsAreaMajor" name="mlsAreaMajor" value={searchParams.mlsAreaMajor} placeholder="Any Area"
                  options={mlsAreaMajorOptions} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Special Conditions</label>
                <SelectField id="specialListingConditions" name="specialListingConditions" value={searchParams.specialListingConditions} placeholder="Any"
                  options={[{value:'Short Sale',label:'Short Sale'},{value:'In Foreclosure',label:'Foreclosure'},{value:'Real Estate Owned',label:'REO / Bank Owned'},{value:'Auction',label:'Auction'},{value:'Probate Listing',label:'Probate'},{value:'Bankruptcy Property',label:'Bankruptcy'},{value:'HUD Owned',label:'HUD Owned'},{value:'Notice Of Default',label:'Notice Of Default'}]} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Sort (mobile)</label>
                <SelectField id="sort" name="sort" value={searchParams.sort} placeholder="Sort By"
                  options={[{value:'price-asc',label:'Price: Low to High'},{value:'price-desc',label:'Price: High to Low'},{value:'newest',label:'Newest First'},{value:'sqft-desc',label:'Largest First'}]} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Min Sq Ft</label>
                <SelectField id="minSqFt" name="minSqFt" value={searchParams.minSqFt} placeholder="No Min"
                  options={[{value:'500',label:'500'},{value:'750',label:'750'},{value:'1000',label:'1,000'},{value:'1250',label:'1,250'},{value:'1500',label:'1,500'},{value:'2000',label:'2,000'},{value:'2500',label:'2,500'},{value:'3000',label:'3,000'}]} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Max Sq Ft</label>
                <SelectField id="maxSqFt" name="maxSqFt" value={searchParams.maxSqFt} placeholder="No Max"
                  options={[{value:'1000',label:'1,000'},{value:'1500',label:'1,500'},{value:'2000',label:'2,000'},{value:'2500',label:'2,500'},{value:'3000',label:'3,000'},{value:'4000',label:'4,000'},{value:'5000',label:'5,000'}]} />
              </div>
              {searchParams.status === 'Closed' && (
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Sold Within</label>
                  <SelectField id="soldWithin" name="soldWithin" value={searchParams.soldWithin} placeholder="Any time"
                    options={[{value:'7',label:'Last 7 days'},{value:'30',label:'Last 30 days'},{value:'90',label:'Last 3 months'},{value:'180',label:'Last 6 months'},{value:'365',label:'Last 12 months'},{value:'730',label:'Last 24 months'}]} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active filter pills — always visible below filters */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400">Filters:</span>
            {searchParams.status && <FilterPill label={searchParams.status === 'Closed' ? 'Sold' : searchParams.status === 'ActiveUnderContract' ? 'Under Contract' : searchParams.status} onRemove={() => setSearchParams(prev => ({ ...prev, status: '', soldWithin: '' }))} />}
            {searchParams.propertyType && <FilterPill label={searchParams.propertyType} onRemove={() => setSearchParams(prev => ({ ...prev, propertyType: '' }))} />}
            {searchParams.minPrice && <FilterPill label={`$${Number(searchParams.minPrice).toLocaleString()}+`} onRemove={() => setSearchParams(prev => ({ ...prev, minPrice: '' }))} />}
            {searchParams.maxPrice && <FilterPill label={`≤$${Number(searchParams.maxPrice).toLocaleString()}`} onRemove={() => setSearchParams(prev => ({ ...prev, maxPrice: '' }))} />}
            {searchParams.beds && <FilterPill label={`${searchParams.beds}+ Beds`} onRemove={() => setSearchParams(prev => ({ ...prev, beds: '' }))} />}
            {searchParams.baths && <FilterPill label={`${searchParams.baths}+ Baths`} onRemove={() => setSearchParams(prev => ({ ...prev, baths: '' }))} />}
            {searchParams.mlsAreaMajor && <FilterPill label={searchParams.mlsAreaMajor} onRemove={() => setSearchParams(prev => ({ ...prev, mlsAreaMajor: '' }))} />}
            {searchParams.specialListingConditions && <FilterPill label={searchParams.specialListingConditions} onRemove={() => setSearchParams(prev => ({ ...prev, specialListingConditions: '' }))} />}
            {searchParams.minSqFt && <FilterPill label={`${Number(searchParams.minSqFt).toLocaleString()}+ sqft`} onRemove={() => setSearchParams(prev => ({ ...prev, minSqFt: '' }))} />}
            {searchParams.maxSqFt && <FilterPill label={`≤${Number(searchParams.maxSqFt).toLocaleString()} sqft`} onRemove={() => setSearchParams(prev => ({ ...prev, maxSqFt: '' }))} />}
            {searchParams.sort && <FilterPill label={searchParams.sort === 'price-asc' ? 'Price ↑' : searchParams.sort === 'price-desc' ? 'Price ↓' : searchParams.sort === 'newest' ? 'Newest' : 'Largest'} onRemove={() => setSearchParams(prev => ({ ...prev, sort: '' }))} />}
            <button type="button" onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors ml-1">Clear all</button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchBar;

"use client";
import React, { useState, useEffect } from 'react';
import { getPropertiesByFilter, fetchMediaUrls, getPropertyDetails } from '../services/trestleServices';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

const InteractiveRealEstateMap = dynamic(
  () => import('../../interactive-real-estate-map'),
  { ssr: false }
);
const DEFAULT_RADIUS = 10;
const PENNSYLVANIA_CENTER = { lat: 40.876, lng: -77.012 }; // Approximate center of PA
const PA_ZOOM_LEVEL = 7;

const SearchBar = ({ onSearchResults }) => {
  const router = useRouter();
  const [useMapMode, setUseMapMode] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useState({
    propertyType: router.query.propertyType || 'Residential',
    priceMin: router.query.priceMin || '',
    priceMax: router.query.priceMax || '',
    beds: router.query.beds || '',
    baths: router.query.baths || '',
    sqftMin: router.query.sqftMin || '',
    sqftMax: router.query.sqftMax || '',
    postalCode: router.query.postalCode || '',
    radius: router.query.radius ? parseInt(router.query.radius) : DEFAULT_RADIUS,
    listingStatus: router.query.listingStatus || 'Active',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const navEntries = typeof performance !== 'undefined' ? performance.getEntriesByType('navigation') : [];
    const isReload = navEntries.length > 0 && navEntries[0].type === 'reload';
    if (isReload) {
      localStorage.removeItem('searchParams');
      localStorage.removeItem('searchResults');
    } else {
      const savedSearchParams = JSON.parse(localStorage.getItem('searchParams'));
      const savedSearchResults = JSON.parse(localStorage.getItem('searchResults')) || [];
      if (savedSearchParams) {
        setSearchParams(savedSearchParams);
      }
      if (savedSearchResults) {
        onSearchResults(savedSearchResults);
      }
    }
  }, []);

  const buildODataQuery = () => {
    const filters = [];
    filters.push(`OriginatingSystemName eq 'MLS'`);
    if (searchParams.postalCode) {
      filters.push(`PostalCode eq '${searchParams.postalCode}'`);
    }
    if (searchParams.propertyType) {
      filters.push(`PropertyType eq '${searchParams.propertyType}'`);
    }
    if (searchParams.priceMin) {
      filters.push(`ListPrice ge ${searchParams.priceMin}`);
    }
    if (searchParams.priceMax) {
      filters.push(`ListPrice le ${searchParams.priceMax}`);
    }
    if (searchParams.beds) {
      filters.push(`BedroomsTotal ge ${searchParams.beds}`);
    }
    if (searchParams.baths) {
      filters.push(`BathroomsTotalInteger ge ${searchParams.baths}`);
    }
    if (searchParams.listingStatus) {
      filters.push(`StandardStatus eq '${searchParams.listingStatus}'`);
    }
    return filters.join(' and ');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const filterQuery = buildODataQuery();
      const { properties } = await getPropertiesByFilter(filterQuery);
      
      const listingsWithMedia = await Promise.all(
        properties.map(async (property) => {
          const mediaUrls = await fetchMediaUrls(property.ListingKey);
          return {
            ...property,
            media: mediaUrls[0] || '/properties.jpg',
          };
        })
      );

      onSearchResults(listingsWithMedia);
      localStorage.setItem('searchParams', JSON.stringify(searchParams));
      localStorage.setItem('searchResults', JSON.stringify(listingsWithMedia));
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMapSearchComplete = (mapFilters) => {
    setSearchParams(prev => ({
      ...prev,
      ...mapFilters
    }));
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setUseMapMode(prev => !prev)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {useMapMode ? 'Use Text Search' : 'Use Map Search'}
        </button>
      </div>

      {useMapMode ? (
        <div>
          <InteractiveRealEstateMap
            onFilterSelect={handleMapSearchComplete}
            center={PENNSYLVANIA_CENTER}
            zoom={PA_ZOOM_LEVEL}
          />
          {/* <button
            onClick={handleSearch}
            disabled={loading}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Searching...' : 'Search Properties'}
          </button> */}
        </div>
      ) : (
        <form onSubmit={handleSearch} className="flex flex-col gap-2">
          <div className="flex flex-col md:flex-row gap-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Postal Code"
                value={searchParams.postalCode}
                onChange={(e) => setSearchParams((p) => ({ ...p, postalCode: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border-0 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={searchParams.propertyType}
                onChange={(e) => setSearchParams((p) => ({ ...p, propertyType: e.target.value }))}
                className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="Residential">All Homes</option>
                <option value="Condo">Condos</option>
                <option value="MultiFamily">Multi-Family</option>
              </select>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Min Price"
                  value={searchParams.priceMin}
                  onChange={(e) => setSearchParams((p) => ({ ...p, priceMin: e.target.value }))}
                  className="w-28 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-3 text-gray-400 text-sm">$</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Max Price"
                  value={searchParams.priceMax}
                  onChange={(e) => setSearchParams((p) => ({ ...p, priceMax: e.target.value }))}
                  className="w-28 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-3 text-gray-400 text-sm">$</span>
              </div>
              <input
                type="number"
                placeholder="Beds"
                value={searchParams.beds}
                onChange={(e) => setSearchParams(p => ({ ...p, beds: e.target.value }))}
                className="w-28 px-4 py-2.5 rounded-lg border border-gray-200 text-sm"
              />
              <input
                type="number"
                placeholder="Baths"
                value={searchParams.baths}
                onChange={(e) => setSearchParams(p => ({ ...p, baths: e.target.value }))}
                className="w-28 px-4 py-2.5 rounded-lg border border-gray-200 text-sm"
              />
              <select
                value={searchParams.listingStatus}
                onChange={(e) => setSearchParams((p) => ({ ...p, listingStatus: e.target.value }))}
                className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="hidden sm:inline">{loading ? 'Searching...' : 'Search'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
      {error && <div className="mt-4 text-red-600">{error}</div>}
    </div>
  );
};

export default SearchBar;

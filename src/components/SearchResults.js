"use client";
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import MapWrapper from './MapWrapper';
import Link from 'next/link';
import Image from 'next/legacy/image';
import { getNextProperties } from '../services/trestleServices';

const SearchResults = ({
  listings,
  nextLink: initialNextLink,
  nextLinkUrl,
  loadMoreUrl,
  onLoadMore,
  loadMore: loadMoreProp,
  onLoadMoreClick,
  hasMore: hasMoreProp,
  isLoadingMore: externalLoading
}) => {
  const [viewMode, setViewMode] = useState('grid');
  const [nextLink, setNextLink] = useState(initialNextLink || nextLinkUrl || loadMoreUrl || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allListings, setAllListings] = useState(listings);

  useEffect(() => {
    // sync listings and potential pagination pointers (support multiple alias names)
    setAllListings(listings);
    setNextLink(initialNextLink || nextLinkUrl || loadMoreUrl || null);
  }, [listings, initialNextLink]);

  const loadMoreProperties = async () => {
    if (nextLink) {
      setLoading(true);
      setError(null);
      try {
        const { properties, nextLink: newNextLink } = await getNextProperties(nextLink);
        
        // Ensure each property has the correct media structure
        const processedProperties = properties.map(property => ({
          ...property,
          media: property.media || (property.Media?.[0]?.MediaURL || '/fallback-property.jpg'),
          mediaArray: property.mediaArray || 
            (property.Media?.map(m => m.MediaURL).filter(url => !!url) || [])
        }));

        setAllListings(prev => [...prev, ...processedProperties]);
        setNextLink(newNextLink);
      } catch (err) {
        setError('Failed to load more properties');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Determine whether there are more properties to load (support multiple prop names)
  const effectiveNextLink = nextLink || nextLinkUrl || loadMoreUrl || null;
  const effectiveHasMore = Boolean(hasMoreProp ?? effectiveNextLink);
  const isLoadingButton = Boolean(externalLoading ?? loading);

  // Unified handler that prefers parent-provided callbacks, else falls back to internal loader
  const handleLoadMoreClick = async () => {
    // prefer parent's handler if they provided one
    if (typeof onLoadMore === 'function') return onLoadMore();
    if (typeof loadMoreProp === 'function') return loadMoreProp();
    if (typeof onLoadMoreClick === 'function') return onLoadMoreClick();

    // fallback to internal loader (only if we have a link)
    if (effectiveNextLink) {
      await loadMoreProperties();
    }
  };

  if (!allListings || allListings.length === 0) {
    return (
      <section className="mb-16">
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg shadow-lg border border-gray-100 dark:border-gray-700">
          <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path>
          </svg>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            No properties found
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center">
            Try adjusting your search criteria or explore different locations
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-16">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          Search Results
          <span className="ml-3 text-lg font-normal text-gray-700 dark:text-gray-500">
            {allListings.length} {allListings.length === 1 ? 'property' : 'properties'}
          </span>
        </h2>
        
              <div className="flex items-center">
              <div className="h-10 flex items-right">
                <span className="font-serif text-2xl text-blue-700">
                Pares
                </span>
              </div>
              </div>
            </div>

            {viewMode === 'grid' ? (
            <div className="transition-all duration-500 ease-in-out">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {allListings.map((listing) => {
              const imageSrc = listing?.media || '/fallback-property.jpg';

              return (
                <Link
                  key={listing.ListingKey}
                  href={`/property/${listing.ListingKey}`}
                  className="group block rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="relative h-48 sm:h-60">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/20 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <Image
                      src={imageSrc}
                      alt={listing.UnparsedAddress || 'Property Image'}
                      layout="fill"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    {listing.StandardStatus === 'Closed' && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium z-20 shadow-md">
                        Sold
                      </div>
                    )}
                    {(listing.StandardStatus === 'Pending' || listing.StandardStatus === 'ActiveUnderContract') && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium z-20 shadow-md">
                        {listing.StandardStatus === 'ActiveUnderContract' ? 'Under Contract' : 'Pending'}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent h-24 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-3 left-3 flex items-center gap-3">
                        <span className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-gray-800 dark:text-white text-xs font-medium px-2.5 py-1.5 rounded-full shadow-sm flex items-center">
                          <svg className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                          View Details
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {listing.UnparsedAddress}
                    </h3>
                    <div className="flex items-center flex-wrap gap-2 sm:gap-3 mt-2">
                      <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                        </svg>
                        {listing.BedroomsTotal} beds
                      </div>
                      <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path>
                        </svg>
                        {listing.BathroomsTotalInteger} baths
                      </div>
                      {listing.LivingAreaSqFt && (
                        <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"></path>
                          </svg>
                          {listing.LivingAreaSqFt.toLocaleString()} sqft
                        </div>
                      )}
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-3 flex items-center">
                      {listing.ListPrice ? (
                        <>
                          <span className="bg-blue-600/10 text-blue-600 dark:bg-blue-400/20 dark:text-blue-400 py-0.5 px-2 rounded-md mr-2 text-xs sm:text-sm font-medium">Price</span>
                          ${listing.ListPrice.toLocaleString()}
                        </>
                      ) : 'Price not available'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
          {effectiveHasMore && (
            <div className="flex justify-center mt-10">
              <button
                onClick={handleLoadMoreClick}
                disabled={isLoadingButton}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl hover:shadow-lg disabled:opacity-70 transition-all duration-300 flex items-center gap-2 group"
              >
                {isLoadingButton ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading More Properties...
                  </>
                ) : (
                  <>
                    Load More Properties
                    <svg className="w-5 h-5 transform group-hover:translate-y-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
          {error && (
            <div className="mt-6 text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-700">
          <MapWrapper listings={allListings} />
        </div>
      )}
    </section>
  );
};

SearchResults.propTypes = {
  listings: PropTypes.arrayOf(
    PropTypes.shape({
      ListingKey: PropTypes.string.isRequired,
      media: PropTypes.string,
      UnparsedAddress: PropTypes.string,
      StandardStatus: PropTypes.string,
      BedroomsTotal: PropTypes.number,
      BathroomsTotalInteger: PropTypes.number,
      LivingAreaSqFt: PropTypes.number,
      ListPrice: PropTypes.number
    })
  ).isRequired,
  nextLink: PropTypes.string,
  nextLinkUrl: PropTypes.string,
  loadMoreUrl: PropTypes.string,
  onLoadMore: PropTypes.func,
  loadMore: PropTypes.func,
  onLoadMoreClick: PropTypes.func,
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool
};

export default SearchResults;
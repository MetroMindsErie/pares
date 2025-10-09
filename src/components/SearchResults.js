"use client";
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import MapWrapper from './MapWrapper';
import Link from 'next/link';
import Image from 'next/legacy/image';
import { getNextProperties } from '../services/trestleServices';

const SearchResults = ({ listings, nextLink: initialNextLink }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [nextLink, setNextLink] = useState(initialNextLink);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allListings, setAllListings] = useState(listings);

  useEffect(() => {
    console.log('Search listings updated:', listings?.length);
    setAllListings(listings);
    setNextLink(initialNextLink);
  }, [listings, initialNextLink]);

  const loadMoreProperties = async () => {
    if (nextLink) {
      setLoading(true);
      setError(null);
      try {
        const { properties, nextLink: newNextLink } = await getNextProperties(nextLink);
        setAllListings(prev => [...prev, ...properties]);
        setNextLink(newNextLink);
      } catch (err) {
        setError('Failed to load more properties');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!allListings || allListings.length === 0) {
    return (
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          No properties found
        </h2>
      </section>
    );
  }

  return (
    <section className="mb-16">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Search Results</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg ${
              viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Grid View
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allListings.map((listing) => {
              const imageSrc = listing?.media || '/fallback-property.jpg';

              return (
                <Link
                  key={listing.ListingKey}
                  href={`/property/${listing.ListingKey}`}
                  className="group block rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="relative h-60 bg-gray-100">
                    <Image
                      src={imageSrc}
                      alt={listing.UnparsedAddress || 'Property Image'}
                      layout="fill"
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    {listing.StandardStatus === 'Closed' && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Sold
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {listing.UnparsedAddress}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-gray-500 text-sm">
                        {listing.BedroomsTotal} beds · {listing.BathroomsTotalInteger} baths
                      </p>
                      {listing.LivingAreaSqFt && (
                        <span className="text-gray-500 text-sm">
                          · {listing.LivingAreaSqFt.toLocaleString()} sqft
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-bold text-gray-900 mt-2">
                      {listing.ListPrice
                        ? `$${listing.ListPrice.toLocaleString()}`
                        : 'Price not available'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
          {nextLink && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMoreProperties}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? 'Loading...' : 'Load More Properties'}
              </button>
            </div>
          )}
          {error && <div className="mt-4 text-red-600 text-center">{error}</div>}
        </div>
      ) : (
        <MapWrapper listings={allListings} />
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
  nextLink: PropTypes.string
};

export default SearchResults;
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PropTypes from 'prop-types';

const SearchResults = ({ listings }) => {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Search Results</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((listing) => {
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
                  {listing.ListPrice ? `$${listing.ListPrice.toLocaleString()}` : 'Price not available'}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
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
  ).isRequired
};

export default SearchResults;

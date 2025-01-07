import React from 'react';

const FeaturedListings = ({ featuredListings }) => {
  if (!featuredListings || featuredListings.length === 0) return null;

  return (
    <section id="listings" className="p-10 bg-gray-100">
      <h2 className="text-3xl font-bold text-center mb-8">Featured Listings</h2>
      <div className="flex overflow-x-auto space-x-6 pb-4">
        {featuredListings.map((listing, index) => (
          <div key={index} className="flex-none w-60 border rounded-lg overflow-hidden shadow-md">
            <img
              src={listing.images[0]?.fields?.file?.url || '/fallback-property-image.jpg'}
              alt={listing.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-xl font-bold">{listing.title}</h3>
              <p className="text-gray-600">
                {listing.bedrooms} Beds | {listing.bathrooms} Baths | ${listing.price.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedListings;

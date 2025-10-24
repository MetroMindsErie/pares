import React from 'react';
import Link from 'next/link';

const SavedProperties = ({ properties, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Saved Properties</h2>
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Saved Properties</h2>
        <p className="text-red-500">Error loading saved properties</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Saved Properties</h2>
      {properties.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No saved properties yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => (
            <Link 
              href={`/property/${property.listing_key}`} 
              key={property.id}
              className="block group"
            >
              <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48 w-full">
                  {/* Use regular img tag instead of Next.js Image */}
                  <img
                    src={property.image_url || '/fallback-property.jpg'}
                    alt={property.address}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = '/fallback-property.jpg';
                    }}
                  />
                </div>
                <div className="p-4">
                  <p className="font-medium text-lg text-blue-600">
                    ${property.price?.toLocaleString()}
                  </p>
                  <p className="text-gray-600 text-sm truncate">{property.address}</p>
                  <p className="text-gray-400 text-xs mt-2">
                    Saved {new Date(property.saved_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedProperties;

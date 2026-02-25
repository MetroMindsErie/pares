import React from 'react';
import Link from 'next/link';

const SavedProperties = ({ properties, isLoading, error, onDelete, deletingIds }) => {
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
          {properties.map((property) => {
            const isDeleting = deletingIds?.has(property.id);
            return (
              <div key={property.id} className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <Link 
                  href={`/property/${property.listing_key}`}
                  className="block"
                >
                  <div className="relative h-48 w-full">
                    {/* Use regular img tag instead of Next.js Image */}
                    <img
                      src={property.image_url || '/fallback-property.jpg'}
                      alt={property.address}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/fallback-property.jpg'; }}
                    />
                  </div>
                </Link>
                <div className="p-4 space-y-1">
                  <p className="font-medium text-lg text-teal-600">
                    ${property.price?.toLocaleString()}
                  </p>
                  <p className="text-gray-600 text-sm truncate">{property.address}</p>
                  <p className="text-gray-400 text-xs">
                    Saved {new Date(property.saved_at).toLocaleDateString()}
                  </p>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(property.id)}
                      disabled={isDeleting}
                      className={`mt-2 w-full text-sm px-3 py-2 rounded-md border ${
                        isDeleting
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      {isDeleting ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedProperties;

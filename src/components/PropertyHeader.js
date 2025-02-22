// components/PropertyHeader.js
export function PropertyHeader({ property }) {
    return (
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {property.UnparsedAddress}
            </h1>
            <p className="text-lg text-gray-600 mt-1">
              {property.USPSCity}, {property.PostalCode}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            property.StandardStatus?.toLowerCase() === 'closed'
              ? 'bg-red-600 text-white'
              : 'bg-green-600 text-white'
          }`}>
            {property.StandardStatus}
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-2xl font-bold text-gray-900">
            {property.ListPrice ? `$${property.ListPrice.toLocaleString()}` : 'Price not available'}
          </p>
          {property.LivingAreaSqFt && (
            <p className="text-gray-600">
              ${(property.ListPrice / property.LivingAreaSqFt).toFixed(2)}/sqft
            </p>
          )}
        </div>
      </div>
    );
  }
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBed, 
  faBath, 
  faRuler, 
  faHeart, 
  faTimes, 
  faPhone, 
  faEyeSlash 
} from '@fortawesome/free-solid-svg-icons';

const PropertyCard = ({ property, onSwipe, isTop = false }) => {
  const router = useRouter();

  const handleActionClick = (action) => {
    // For "Connect" action, navigate immediately without swiping
    if (action === 'up') {
      router.push(`/property/${property.ListingKey}?action=contact`);
      return;
    }
    
    // For other actions, proceed with normal swipe behavior
    onSwipe(property, action);
  };

  const formatPrice = (price) => {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col">
        {/* Property Image */}
        <div className="relative h-1/2 overflow-hidden">
          <img
            src={property.media || '/properties.jpg'}
            alt={property.UnparsedAddress || 'Property'}
            className="w-full h-full object-cover"
          />
          
          {/* Price Overlay */}
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg">
            <p className="text-2xl font-bold">{formatPrice(property.ListPrice)}</p>
          </div>

          {/* Status Badge */}
          {property.StandardStatus === 'Closed' && (
            <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              Sold
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {property.UnparsedAddress || 'Address not available'}
            </h2>
            
            <div className="flex items-center gap-4 mb-4 text-gray-600">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faBed} className="mr-2 text-blue-500" />
                <span>{property.BedroomsTotal || 'N/A'} beds</span>
              </div>
              <div className="flex items-center">
                <FontAwesomeIcon icon={faBath} className="mr-2 text-blue-500" />
                <span>{property.BathroomsTotalInteger || 'N/A'} baths</span>
              </div>
              <div className="flex items-center">
                <FontAwesomeIcon icon={faRuler} className="mr-2 text-blue-500" />
                <span>{property.LivingArea ? `${property.LivingArea.toLocaleString()} sqft` : 'N/A'}</span>
              </div>
            </div>

            <p className="text-gray-700 text-sm line-clamp-3">
              {property.PublicRemarks || 'No description available.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            <button
              onClick={() => handleActionClick('left')}
              className="flex flex-col items-center justify-center p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="text-gray-600 text-xl mb-1" />
              <span className="text-xs text-gray-600">Pass</span>
            </button>
            
            <button
              onClick={() => handleActionClick('down')}
              className="flex flex-col items-center justify-center p-3 bg-red-100 hover:bg-red-200 rounded-xl transition-colors"
            >
              <FontAwesomeIcon icon={faEyeSlash} className="text-red-600 text-xl mb-1" />
              <span className="text-xs text-red-600">Hide</span>
            </button>
            
            <button
              onClick={() => handleActionClick('right')}
              className="flex flex-col items-center justify-center p-3 bg-green-100 hover:bg-green-200 rounded-xl transition-colors"
            >
              <FontAwesomeIcon icon={faHeart} className="text-green-600 text-xl mb-1" />
              <span className="text-xs text-green-600">Like</span>
            </button>
            
            <button
              onClick={() => handleActionClick('up')}
              className="flex flex-col items-center justify-center p-3 bg-blue-100 hover:bg-blue-200 rounded-xl transition-colors"
            >
              <FontAwesomeIcon icon={faPhone} className="text-blue-600 text-xl mb-1" />
              <span className="text-xs text-blue-600">Connect</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBed, 
  faBath, 
  faRuler, 
  faHeart, 
  faPhone, 
  faChevronLeft, 
  faChevronRight,
  faMapPin,
  faCalendar,
  faExternalLinkAlt
} from '@fortawesome/free-solid-svg-icons';

const PropertyCollection = ({ properties, title, icon, emptyMessage, onPropertyClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!properties || properties.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <FontAwesomeIcon icon={icon} className="text-4xl text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  const currentProperty = properties[currentIndex];

  const formatPrice = (price) => {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const nextProperty = () => {
    setCurrentIndex((prev) => (prev + 1) % properties.length);
  };

  const prevProperty = () => {
    setCurrentIndex((prev) => (prev - 1 + properties.length) % properties.length);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={icon} className="text-2xl text-blue-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-600">{properties.length} properties</p>
            </div>
          </div>
          
          {properties.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={prevProperty}
                className="p-2 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-gray-600" />
              </button>
              <span className="text-sm text-gray-500 min-w-[60px] text-center">
                {currentIndex + 1} of {properties.length}
              </span>
              <button
                onClick={nextProperty}
                className="p-2 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Property Card */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="cursor-pointer"
            onClick={() => onPropertyClick && onPropertyClick(currentProperty)}
          >
            <div className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              {/* Property Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={currentProperty.media || '/properties.jpg'}
                  alt={currentProperty.UnparsedAddress || 'Property'}
                  className="w-full h-full object-cover"
                />
                
                {/* Price Overlay */}
                <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg">
                  <p className="text-lg font-bold">{formatPrice(currentProperty.ListPrice)}</p>
                </div>

                {/* Swipe Date */}
                {currentProperty.swipe_date && (
                  <div className="absolute top-3 right-3 bg-white bg-opacity-90 text-gray-800 px-2 py-1 rounded-lg text-xs">
                    <FontAwesomeIcon icon={faCalendar} className="mr-1" />
                    {formatDate(currentProperty.swipe_date)}
                  </div>
                )}
              </div>

              {/* Property Details */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-lg font-semibold text-gray-900 line-clamp-1">
                    {currentProperty.UnparsedAddress || 'Address not available'}
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onPropertyClick) onPropertyClick(currentProperty);
                    }}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                  </button>
                </div>

                <div className="flex items-center gap-1 text-gray-600 mb-3">
                  <FontAwesomeIcon icon={faMapPin} className="text-xs" />
                  <span className="text-sm">
                    {[currentProperty.City, currentProperty.StateOrProvince]
                      .filter(Boolean).join(', ')}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faBed} className="text-blue-500" />
                    <span>{currentProperty.BedroomsTotal || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faBath} className="text-blue-500" />
                    <span>{currentProperty.BathroomsTotalInteger || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faRuler} className="text-blue-500" />
                    <span>{currentProperty.LivingArea ? `${currentProperty.LivingArea.toLocaleString()} sqft` : 'N/A'}</span>
                  </div>
                </div>

                <p className="text-gray-700 text-sm line-clamp-2">
                  {currentProperty.PublicRemarks || 'No description available.'}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Dots */}
        {properties.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {properties.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyCollection;

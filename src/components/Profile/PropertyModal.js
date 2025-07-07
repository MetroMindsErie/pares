import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faBed, 
  faBath, 
  faRuler, 
  faMapPin, 
  faCalendar,
  faPhone,
  faExternalLinkAlt
} from '@fortawesome/free-solid-svg-icons';

const PropertyModal = ({ property, isOpen, onClose }) => {
  const router = useRouter();

  if (!property) return null;

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
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleContactAgent = () => {
    router.push(`/property/${property.ListingKey}?action=contact`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative">
              <img
                src={property.media || '/properties.jpg'}
                alt={property.UnparsedAddress || 'Property'}
                className="w-full h-64 object-cover rounded-t-2xl"
              />
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} className="text-gray-600" />
              </button>

              {/* Price Overlay */}
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
                <p className="text-2xl font-bold">{formatPrice(property.ListPrice)}</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {property.UnparsedAddress || 'Address not available'}
                </h2>
                
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <FontAwesomeIcon icon={faMapPin} />
                  <span>{[property.City, property.StateOrProvince].filter(Boolean).join(', ')}</span>
                </div>

                {property.swipe_date && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <FontAwesomeIcon icon={faCalendar} />
                    <span>Saved on {formatDate(property.swipe_date)}</span>
                  </div>
                )}
              </div>

              {/* Property Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <FontAwesomeIcon icon={faBed} className="text-2xl text-blue-600 mb-2" />
                  <p className="text-sm text-gray-600">Bedrooms</p>
                  <p className="text-lg font-semibold">{property.BedroomsTotal || 'N/A'}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <FontAwesomeIcon icon={faBath} className="text-2xl text-blue-600 mb-2" />
                  <p className="text-sm text-gray-600">Bathrooms</p>
                  <p className="text-lg font-semibold">{property.BathroomsTotalInteger || 'N/A'}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <FontAwesomeIcon icon={faRuler} className="text-2xl text-blue-600 mb-2" />
                  <p className="text-sm text-gray-600">Square Feet</p>
                  <p className="text-lg font-semibold">
                    {property.LivingArea ? property.LivingArea.toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Description */}
              {property.PublicRemarks && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{property.PublicRemarks}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleContactAgent}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  <FontAwesomeIcon icon={faPhone} />
                  Contact Agent
                </button>
                <button
                  onClick={() => router.push(`/property/${property.ListingKey}`)}
                  className="flex-1 flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                  View Details
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PropertyModal;

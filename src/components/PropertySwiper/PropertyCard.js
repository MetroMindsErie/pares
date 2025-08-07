import React, { useState, useMemo } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
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
  const [exitDirection, setExitDirection] = useState(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Transform values for rotation and opacity based on drag
  const rotateX = useTransform(y, [-300, 0, 300], [15, 0, -15]);
  const rotateZ = useTransform(x, [-300, 0, 300], [-30, 0, 30]);
  const opacity = useTransform(
    [x, y],
    ([latestX, latestY]) => 1 - Math.abs(latestX) / 300 - Math.abs(latestY) / 300
  );

  // Swipe indicator transforms - always create these hooks
  const leftIndicatorOpacity = useTransform(x, [-150, -50], [1, 0]);
  const rightIndicatorOpacity = useTransform(x, [50, 150], [0, 1]);
  const topIndicatorOpacity = useTransform(y, [-150, -50], [1, 0]);
  const bottomIndicatorOpacity = useTransform(y, [50, 150], [0, 1]);

  // Swipe threshold
  const SWIPE_THRESHOLD = 100;

  const handleActionClick = (action) => {
    console.log('PropertyCard action clicked:', action, 'for property:', property.ListingKey);
    
    // For "Connect" action, still trigger the swipe to save the action
    if (action === 'up') {
      console.log('Connection action - triggering swipe and navigation');
      // First save the swipe action
      onSwipe(property, action);
      // Then navigate to property details
      setTimeout(() => {
        router.push(`/property/${property.ListingKey}?action=contact`);
      }, 100);
      return;
    }
    
    // Set exit direction and trigger swipe
    setExitDirection(action);
    onSwipe(property, action);
  };

  const handleDragEnd = (_, info) => {
    const { offset, velocity } = info;
    const swipeDirection = getSwipeDirection(offset, velocity);
    
    if (swipeDirection) {
      handleActionClick(swipeDirection);
    }
  };

  const getSwipeDirection = (offset, velocity) => {
    const { x: offsetX, y: offsetY } = offset;
    const { x: velocityX, y: velocityY } = velocity;
    
    // Determine primary direction based on offset and velocity
    if (Math.abs(offsetX) > Math.abs(offsetY)) {
      // Horizontal swipe
      if (offsetX > SWIPE_THRESHOLD || velocityX > 500) return 'right';
      if (offsetX < -SWIPE_THRESHOLD || velocityX < -500) return 'left';
    } else {
      // Vertical swipe
      if (offsetY < -SWIPE_THRESHOLD || velocityY < -500) return 'up';
      if (offsetY > SWIPE_THRESHOLD || velocityY > 500) return 'down';
    }
    
    return null;
  };

  const formatPrice = (price) => {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  const getExitAnimation = () => {
    switch (exitDirection) {
      case 'left':
        return { x: -1000, rotate: -30, opacity: 0 };
      case 'right':
        return { x: 1000, rotate: 30, opacity: 0 };
      case 'up':
        return { y: -1000, opacity: 0 };
      case 'down':
        return { y: 1000, opacity: 0 };
      default:
        return { x: 0, y: 0, rotate: 0, opacity: 1 };
    }
  };

  // Function to get the display image
  const getDisplayImage = (property) => {
    // Always use the first image in mediaArray if available
    if (property.mediaArray && Array.isArray(property.mediaArray) && property.mediaArray.length > 0) {
      return property.mediaArray[0];
    }
    // Fallback to media field
    if (property.media) {
      return property.media;
    }
    // Check original Media array structure
    if (property.Media && Array.isArray(property.Media) && property.Media.length > 0) {
      return property.Media[0].MediaURL || property.Media[0];
    }
    // Fallback to any media field that might exist
    if (property.Media && typeof property.Media === 'string') {
      return property.Media;
    }
    return '/fallback-property.jpg';
  };

  const displayImage = getDisplayImage(property);

  // Static buyer agent information
  const buyerAgent = {
    name: 'John Easter',
    email: 'easterjo106@yahoo.com',
    phone: '814-873-5810',
    agency: 'Pennington Lines',
    photo: '/dad.jpg' // You can add John's photo here
  };

  return (
    <motion.div
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      style={{
        x,
        y,
        rotateX,
        rotateZ,
        opacity: isTop ? opacity : 1,
        zIndex: isTop ? 10 : 1,
      }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      animate={exitDirection ? getExitAnimation() : { x: 0, y: 0, rotate: 0 }}
      transition={{ duration: 0.3 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col">
        {/* Property Image */}
        <div className="relative h-1/2 overflow-hidden">
          <img
            src={displayImage || '/properties.jpg'}
            alt={property.UnparsedAddress || 'Property'}
            className="w-full h-full object-cover"
            draggable={false}
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

      {/* Swipe Indicators - Only show when isTop but hooks are always created */}
      {isTop && (
        <>
          <motion.div
            className="absolute top-1/2 left-8 transform -translate-y-1/2 bg-gray-500 text-white px-4 py-2 rounded-lg font-bold text-lg"
            style={{
              opacity: leftIndicatorOpacity
            }}
          >
            PASS
          </motion.div>
          
          <motion.div
            className="absolute top-1/2 right-8 transform -translate-y-1/2 bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-lg"
            style={{
              opacity: rightIndicatorOpacity
            }}
          >
            LIKE
          </motion.div>
          
          <motion.div
            className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-lg"
            style={{
              opacity: topIndicatorOpacity
            }}
          >
            CONNECT
          </motion.div>
          
          <motion.div
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-lg"
            style={{
              opacity: bottomIndicatorOpacity
            }}
          >
            HIDE
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default PropertyCard;

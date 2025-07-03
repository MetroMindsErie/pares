import React, { useState, useRef } from 'react';
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

const PropertyCard = ({ property, onSwipe, isTop = false, isMobile = false }) => {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragCurrent, setDragCurrent] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const SWIPE_THRESHOLD = 100;

  const handleActionClick = (action) => {
    // For "Connect" action, navigate immediately without swiping
    if (action === 'up') {
      router.push(`/property/${property.ListingKey}?action=contact`);
      return;
    }
    
    // For other actions, proceed with normal swipe behavior
    onSwipe(property, action);
  };

  // Touch/Mouse event handlers for mobile swipe gestures
  const handleTouchStart = (e) => {
    if (!isMobile || !isTop) return;
    
    const touch = e.touches?.[0] || e;
    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setDragCurrent({ x: 0, y: 0 });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !isMobile || !isTop) return;
    
    e.preventDefault();
    const touch = e.touches?.[0] || e;
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;
    
    setDragCurrent({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = (e) => {
    if (!isDragging || !isMobile || !isTop) return;
    
    setIsDragging(false);
    
    const deltaX = dragCurrent.x;
    const deltaY = dragCurrent.y;
    
    // Determine swipe direction based on the larger movement
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > SWIPE_THRESHOLD) {
        handleActionClick('right'); // Like
      } else if (deltaX < -SWIPE_THRESHOLD) {
        handleActionClick('left'); // Pass
      }
    } else {
      // Vertical swipe
      if (deltaY < -SWIPE_THRESHOLD) {
        handleActionClick('up'); // Connect
      } else if (deltaY > SWIPE_THRESHOLD) {
        handleActionClick('down'); // Hide
      }
    }
    
    // Reset drag state
    setDragCurrent({ x: 0, y: 0 });
  };

  const formatPrice = (price) => {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Calculate card transform based on drag
  const getCardStyle = () => {
    if (!isDragging || !isMobile) return {};
    
    const rotation = dragCurrent.x * 0.1; // Subtle rotation effect
    const opacity = Math.max(0.7, 1 - Math.abs(dragCurrent.x) / 300);
    
    return {
      transform: `translate(${dragCurrent.x}px, ${dragCurrent.y}px) rotate(${rotation}deg)`,
      opacity,
      transition: isDragging ? 'none' : 'all 0.3s ease-out'
    };
  };

  // Get swipe indicator
  const getSwipeIndicator = () => {
    if (!isDragging || !isMobile) return null;
    
    const deltaX = dragCurrent.x;
    const deltaY = dragCurrent.y;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 50) return { text: 'LIKE', color: 'bg-green-500', position: 'right' };
      if (deltaX < -50) return { text: 'PASS', color: 'bg-gray-500', position: 'left' };
    } else {
      if (deltaY < -50) return { text: 'CONNECT', color: 'bg-blue-500', position: 'top' };
      if (deltaY > 50) return { text: 'HIDE', color: 'bg-red-500', position: 'bottom' };
    }
    
    return null;
  };

  const swipeIndicator = getSwipeIndicator();

  return (
    <div 
      ref={cardRef}
      className="absolute inset-0 w-full h-full"
      style={getCardStyle()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={isMobile ? undefined : handleTouchStart}
      onMouseMove={isMobile ? undefined : handleTouchMove}
      onMouseUp={isMobile ? undefined : handleTouchEnd}
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col">
        {/* Swipe Indicator */}
        {swipeIndicator && (
          <div className={`absolute z-20 ${swipeIndicator.color} text-white px-4 py-2 rounded-lg font-bold text-lg transform -translate-x-1/2 -translate-y-1/2 ${
            swipeIndicator.position === 'left' ? 'top-1/2 left-8' :
            swipeIndicator.position === 'right' ? 'top-1/2 right-8' :
            swipeIndicator.position === 'top' ? 'top-8 left-1/2' :
            'bottom-8 left-1/2'
          }`}>
            {swipeIndicator.text}
          </div>
        )}

        {/* Property Image */}
        <div className="relative h-1/2 overflow-hidden">
          <img
            src={property.media || '/properties.jpg'}
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

          {/* Mobile Swipe Instructions - Only show on first card */}
          {isMobile && isTop && !isDragging && (
            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
              <div className="bg-white bg-opacity-90 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-gray-800 mb-2">Swipe to interact</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>← Pass</div>
                  <div>→ Like</div>
                  <div>↑ Connect</div>
                  <div>↓ Hide</div>
                </div>
              </div>
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

          {/* Action Buttons - Hide on mobile when dragging */}
          <div className={`grid grid-cols-4 gap-3 mt-6 transition-opacity ${isDragging && isMobile ? 'opacity-50' : ''}`}>
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

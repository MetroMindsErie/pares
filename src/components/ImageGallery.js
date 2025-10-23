import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const ImageGallery = ({ images = [], address = 'Property' }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Use fallback image if no images are provided
  const safeImages = images && images.length > 0 ? images : ['/fallback-property.jpg'];
  
  // For debugging
  if (images && images.length === 0) {

  }

  const goToPrevious = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? safeImages.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === safeImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <div className="relative rounded-lg overflow-hidden h-96">
      <img
        src={safeImages[currentImageIndex]}
        alt={`${address} - Image ${currentImageIndex + 1}`}
        className="w-full h-full object-cover"
        onError={(e) => {
          console.error('Image failed to load:', e.target.src);
          e.target.onerror = null;
          e.target.src = '/fallback-property.jpg';
        }}
      />
      
      {safeImages.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity focus:outline-none"
            aria-label="Previous image"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity focus:outline-none"
            aria-label="Next image"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div className="bg-black bg-opacity-50 rounded-full px-3 py-1 text-xs text-white">
              {currentImageIndex + 1} / {safeImages.length}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

ImageGallery.propTypes = {
  images: PropTypes.arrayOf(PropTypes.string),
  address: PropTypes.string
};

export default ImageGallery;

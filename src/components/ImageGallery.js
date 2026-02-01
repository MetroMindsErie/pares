import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faTimes, faExpand, faSearchPlus, faSearchMinus } from '@fortawesome/free-solid-svg-icons';

const ImageGallery = ({ images = [], address = 'Property' }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Use fallback image if no images are provided
  const safeImages = images && images.length > 0 ? images : ['/fallback-property.jpg'];

  const goToPrevious = (e) => {
    e?.stopPropagation();
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? safeImages.length - 1 : prevIndex - 1
    );
    setIsZoomed(false);
  };

  const goToNext = (e) => {
    e?.stopPropagation();
    setCurrentImageIndex((prevIndex) => 
      prevIndex === safeImages.length - 1 ? 0 : prevIndex + 1
    );
    setIsZoomed(false);
  };

  const openLightbox = (index) => {
    setCurrentImageIndex(index);
    setIsLightboxOpen(true);
    setIsZoomed(false);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setIsZoomed(false);
    document.body.style.overflow = 'unset';
  };

  const toggleZoom = (e) => {
    e.stopPropagation();
    setIsZoomed(!isZoomed);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isLightboxOpen) return;
      
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  return (
    <>
      {/* Main Gallery */}
      <div className="space-y-4">
        {/* Main Image */}
        <div className="relative rounded-lg overflow-hidden bg-gray-100" style={{ height: '500px' }}>
          <img
            src={safeImages[currentImageIndex]}
            alt={`${address} - Image ${currentImageIndex + 1}`}
            className="w-full h-full object-contain cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => openLightbox(currentImageIndex)}
            onError={(e) => {
              console.error('Image failed to load:', e.target.src);
              e.target.onerror = null;
              e.target.src = '/fallback-property.jpg';
            }}
          />
          
          {/* Expand button */}
          <button
            onClick={() => openLightbox(currentImageIndex)}
            className="absolute top-4 right-4 bg-black bg-opacity-60 text-white p-3 rounded-lg hover:bg-opacity-80 transition-all focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Expand image"
          >
            <FontAwesomeIcon icon={faExpand} className="w-4 h-4" />
          </button>

          {/* Navigation Arrows */}
          {safeImages.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-opacity-80 transition-all focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Previous image"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="w-5 h-5" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-opacity-80 transition-all focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Next image"
              >
                <FontAwesomeIcon icon={faChevronRight} className="w-5 h-5" />
              </button>
              
              {/* Image Counter */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-black bg-opacity-70 rounded-full px-4 py-2 text-sm font-medium text-white">
                  {currentImageIndex + 1} / {safeImages.length}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Thumbnail Navigation */}
        {safeImages.length > 1 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-32 overflow-y-auto">
            {safeImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`relative rounded-lg overflow-hidden aspect-square focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  index === currentImageIndex 
                    ? 'ring-2 ring-blue-600 opacity-100' 
                    : 'opacity-60 hover:opacity-100'
                }`}
                aria-label={`View image ${index + 1}`}
              >
                <img
                  src={image}
                  alt={`${address} thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/fallback-property.jpg';
                  }}
                />
                {index === currentImageIndex && (
                  <div className="absolute inset-0 border-2 border-blue-600 rounded-lg pointer-events-none" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 bg-white bg-opacity-20 text-white p-3 rounded-full hover:bg-opacity-30 transition-all focus:outline-none focus:ring-2 focus:ring-white z-10"
            aria-label="Close lightbox"
          >
            <FontAwesomeIcon icon={faTimes} className="w-6 h-6" />
          </button>

          {/* Zoom toggle */}
          <button
            onClick={toggleZoom}
            className="absolute top-4 right-20 bg-white bg-opacity-20 text-white p-3 rounded-full hover:bg-opacity-30 transition-all focus:outline-none focus:ring-2 focus:ring-white z-10"
            aria-label={isZoomed ? "Zoom out" : "Zoom in"}
          >
            <FontAwesomeIcon icon={isZoomed ? faSearchMinus : faSearchPlus} className="w-6 h-6" />
          </button>

          {/* Image Counter */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-20 rounded-full px-6 py-3 text-white font-medium z-10">
            {currentImageIndex + 1} / {safeImages.length}
          </div>

          {/* Main Image */}
          <div 
            className={`relative max-w-7xl max-h-screen p-4 ${isZoomed ? 'overflow-auto' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={safeImages[currentImageIndex]}
              alt={`${address} - Image ${currentImageIndex + 1}`}
              className={`max-w-full transition-all duration-300 ${
                isZoomed ? 'max-h-none w-auto cursor-zoom-out' : 'max-h-screen object-contain cursor-zoom-in'
              }`}
              onClick={toggleZoom}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/fallback-property.jpg';
              }}
            />
          </div>

          {/* Navigation Arrows */}
          {safeImages.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 text-white p-4 rounded-full hover:bg-opacity-30 transition-all focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Previous image"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="w-6 h-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 text-white p-4 rounded-full hover:bg-opacity-30 transition-all focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Next image"
              >
                <FontAwesomeIcon icon={faChevronRight} className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Thumbnail Strip at Bottom */}
          <div className="absolute bottom-4 left-0 right-0 px-4">
            <div className="max-w-4xl mx-auto bg-black bg-opacity-50 rounded-lg p-2">
              <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {safeImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(index);
                      setIsZoomed(false);
                    }}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden focus:outline-none transition-all ${
                      index === currentImageIndex 
                        ? 'ring-2 ring-white opacity-100 scale-110' 
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/fallback-property.jpg';
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

ImageGallery.propTypes = {
  images: PropTypes.arrayOf(PropTypes.string),
  address: PropTypes.string
};

export default ImageGallery;

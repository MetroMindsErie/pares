import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faExpand } from '@fortawesome/free-solid-svg-icons';

const ImageGallery = ({ images = [], address = 'Property' }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fallbackImage = '/fallback-property.jpg';
  
  // Use the provided images or fallback if empty
  const imageList = images.length > 0 ? images : [fallbackImage];
  
  const nextImage = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % imageList.length);
  };

  const prevImage = () => {
    setActiveIndex((prevIndex) => 
      prevIndex === 0 ? imageList.length - 1 : prevIndex - 1
    );
  };

  return (
    <div className="relative">
      {/* Main Image */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        <img
          src={imageList[activeIndex]}
          alt={`${address} - View ${activeIndex + 1}`}
          className="w-full h-96 object-contain mx-auto"
          onError={(e) => {
            e.target.src = fallbackImage;
          }}
        />
        
        {/* Image Controls */}
        {imageList.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full"
              aria-label="Previous image"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full"
              aria-label="Next image"
            >
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </>
        )}
        
        {/* Expand Button */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full"
          aria-label="View fullscreen"
        >
          <FontAwesomeIcon icon={faExpand} />
        </button>
        
        {/* Image Counter */}
        {imageList.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {activeIndex + 1} / {imageList.length}
          </div>
        )}
      </div>
      
      {/* Thumbnails */}
      {imageList.length > 1 && (
        <div className="flex overflow-x-auto gap-2 mt-4 pb-2">
          {imageList.map((url, index) => (
            <button
              key={index}
              className={`flex-shrink-0 w-20 h-20 overflow-hidden rounded ${activeIndex === index ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setActiveIndex(index)}
            >
              <img
                src={url}
                alt={`${address} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = fallbackImage;
                }}
              />
            </button>
          ))}
        </div>
      )}
      
      {/* Fullscreen Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-6xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-0 right-0 bg-white text-black p-2 z-10"
              aria-label="Close modal"
            >
              ✕
            </button>
            
            <div className="relative">
              <img
                src={imageList[activeIndex]}
                alt={`${address} - View ${activeIndex + 1} (fullscreen)`}
                className="max-h-[80vh] max-w-full mx-auto"
              />
              
              {imageList.length > 1 && (
                <>
                  <button 
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white text-black p-2 rounded-full"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} />
                  </button>
                  <button 
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white text-black p-2 rounded-full"
                  >
                    <FontAwesomeIcon icon={faArrowRight} />
                  </button>
                </>
              )}
            </div>
            
            {imageList.length > 1 && (
              <div className="mt-4 flex justify-center gap-1">
                {imageList.map((_, index) => (
                  <button
                    key={index}
                    className={`w-3 h-3 rounded-full ${activeIndex === index ? 'bg-white' : 'bg-gray-500'}`}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Go to image ${index + 1}`}
                  ></button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;

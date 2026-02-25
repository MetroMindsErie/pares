// components/PropertyGallery.js
import { useState } from 'react';
import PropTypes from 'prop-types';

export const PropertyGallery = ({ media }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!media?.length) return null;

  return (
    <div className="relative group">
      {/* Main Image */}
      <div className="relative h-96 rounded-xl overflow-hidden shadow-lg">
        <img
          src={media[activeIndex]}
          alt={`Property image ${activeIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
        
        {/* Image Counter */}
        <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {activeIndex + 1} / {media.length}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        {media.map((img, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`relative h-20 rounded-md overflow-hidden cursor-pointer transition-opacity ${
              index === activeIndex ? 'ring-2 ring-teal-500' : 'opacity-75 hover:opacity-100'
            }`}
          >
            <img
              src={img}
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

PropertyGallery.propTypes = {
  media: PropTypes.arrayOf(PropTypes.string).isRequired
};
// components/FeaturedListings.js
import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types'; // added import
import Link from 'next/link';
import Image from 'next/image';

const FeaturedListings = ({ listings }) => {
  if (!Array.isArray(listings)) {
    console.error('FeaturedListings received invalid listings prop:', listings);
    return null;
  }
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState(4);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Split listings into initial visible set and scrollable set
  const visibleListings = listings.slice(0, visibleCount);
  const scrollableListings = listings.slice(visibleCount, 10);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setVisibleCount(mobile ? 1 : 4); // Show 1 on mobile, 4 on desktop
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScroll = (direction) => {
    const container = containerRef.current;
    if (!container) return;

    const scrollAmount = direction === 'next' ? 300 : -300;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <section className="mb-16">
      <div className="flex justify-between items-center mb-6">
        {/* <h2 className="text-2xl font-bold text-gray-900">{title}</h2> */}
        {!isMobile && scrollableListings.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => handleScroll('prev')}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              ←
            </button>
            <button
              onClick={() => handleScroll('next')}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* Visible Properties Grid */}
      <div className="hidden md:grid md:grid-cols-4 gap-6 mb-6">
        {visibleListings.map((listing) => (
          <PropertyCard key={listing.ListingKey} listing={listing} />
        ))}
      </div>

      {/* Scrollable Container */}
      <div 
        ref={containerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide md:hidden"
      >
        {listings.slice(0, 10).map((listing) => (
          <PropertyCard 
            key={listing.ListingKey} 
            listing={listing} 
            mobile={isMobile}
          />
        ))}
      </div>

      {/* Scrollable Properties (Desktop) */}
      {!isMobile && scrollableListings.length > 0 && (
        <div 
          ref={containerRef}
          className="hidden md:flex gap-6 overflow-x-auto scrollbar-hide mt-6"
        >
          {scrollableListings.map((listing) => (
            <PropertyCard key={listing.ListingKey} listing={listing} />
          ))}
        </div>
      )}
    </section>
  );
};
FeaturedListings.propTypes = {
  title: PropTypes.string.isRequired,
  listings: PropTypes.arrayOf(
    PropTypes.shape({
      ListingKey: PropTypes.string.isRequired,
      media: PropTypes.string,
      // ... other required props
    })
  ).isRequired
};
const PropertyCard = ({ listing, mobile }) => {
  if (!listing) return null;

  const imageSrc = typeof listing.media === 'string' ? 
    listing.media : 
    '/properties.jpg';

  return (
    <Link
      href={`/property/${listing.ListingKey}`}
      className={`${
        mobile ? 'min-w-[85vw]' : 'min-w-[300px]'
      } flex-shrink-0 group block rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300`}
    >
      <div className="relative h-60 bg-gray-100">
        <Image
          src={imageSrc}
          alt={listing.UnparsedAddress}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {listing.StandardStatus === 'Closed' && (
          <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
            Sold
          </div>
        )}
      </div>
      
      <div className="p-4 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 truncate">
          {listing.UnparsedAddress}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-gray-500 text-sm">
            {listing.BedroomsTotal} beds · {listing.BathroomsTotalInteger} baths
          </p>
          {listing.LivingAreaSqFt && (
            <span className="text-gray-500 text-sm">
              · {listing.LivingAreaSqFt.toLocaleString()} sqft
            </span>
          )}
        </div>
        <p className="text-xl font-bold text-gray-900 mt-2">
          {listing.ListPrice ? `$${listing.ListPrice.toLocaleString()}` : 'Price not available'}
        </p>
      </div>
    </Link>
  );
};

export default FeaturedListings;
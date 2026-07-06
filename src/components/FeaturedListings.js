// components/FeaturedListings.js
import React, { useRef, useState, useEffect } from 'react';
import { proxiedImageUrl, imageSrcSet } from '../utils/imageProxy';
import PropTypes from 'prop-types'; // added import
import Link from 'next/link';

export function FeaturedListings({ listings, title }) {
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
      <div className="flex justify-between items-center mb-8">
        <h2 className="font-heading font-bold text-slate-900 tracking-tight text-2xl">{title}</h2>
        {!isMobile && scrollableListings.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => handleScroll('prev')}
              className="w-10 h-10 rounded-full border border-slate-200 bg-white shadow-sm hover:border-teal-400 hover:text-teal-600 transition-colors flex items-center justify-center text-slate-400 text-sm"
            >
              ←
            </button>
            <button
              onClick={() => handleScroll('next')}
              className="w-10 h-10 rounded-full border border-slate-200 bg-white shadow-sm hover:border-teal-400 hover:text-teal-600 transition-colors flex items-center justify-center text-slate-400 text-sm"
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
      } flex-shrink-0 group block rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 hover:-translate-y-0.5`}
    >
      <div className="relative h-60 bg-gray-100">
        <img
          src={proxiedImageUrl(imageSrc, 640)}
          srcSet={imageSrcSet(imageSrc)}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          alt={listing.UnparsedAddress}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
          onError={(e) => { e.target.onerror = null; e.target.src = '/fallback-property.jpg'; }}
        />
        {listing.StandardStatus === 'Closed' && (
          <div className="absolute top-3 left-3 bg-red-600 text-white px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] rounded-sm">
            Sold
          </div>
        )}
        {listing.StandardStatus === 'Active' && (
          <div className="absolute top-3 left-3 bg-teal-600 text-white px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] rounded-sm">
            Active
          </div>
        )}
      </div>
      
      <div className="p-4 bg-white border-t-2 border-teal-500/70">
        <p className="text-lg font-bold text-teal-600 mb-1 tabular-nums">
          {listing.ListPrice ? `$${listing.ListPrice.toLocaleString()}` : 'Price on Request'}
        </p>
        <h3 className="text-sm font-semibold text-slate-800 truncate mb-2">
          {listing.UnparsedAddress}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="text-[0.65rem] text-slate-400 uppercase tracking-[0.1em] font-semibold">{listing.BedroomsTotal} bd</span>
          <span className="text-slate-300 text-xs">·</span>
          <span className="text-[0.65rem] text-slate-400 uppercase tracking-[0.1em] font-semibold">{listing.BathroomsTotalInteger} ba</span>
          {listing.LivingAreaSqFt && (
            <>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-[0.65rem] text-slate-400 uppercase tracking-[0.1em] font-semibold">{listing.LivingAreaSqFt.toLocaleString()} sf</span>
            </>
          )}
        </div>
        <p className="text-[0.6rem] text-slate-400 text-center py-1 border-t border-slate-100">Courtesy of GEBOR</p>
      </div>
    </Link>
  );
};


export default FeaturedListings;
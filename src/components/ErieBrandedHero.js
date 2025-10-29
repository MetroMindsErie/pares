"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SearchBar from './SearchBar';
import PartnersTicker from './PartnersTicker';

const ErieBrandedHero = ({ onSearchResults }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Erie downtown images - you'll need to add these to your public folder
  const heroImages = [
    '/images/erie-downtown-1.jpg',
    '/images/erie-downtown-2.jpg', 
    '/images/erie-downtown-3.jpg',
    '/images/erie-downtown-4.jpg'
  ];

  // Auto-rotate hero images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 6000); // Change image every 6 seconds
    
    return () => clearInterval(interval);
  }, [heroImages.length]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      // allow overflow so large headings aren't clipped by overlays, and add mobile top padding
      className="relative overflow-visible"
      style={{ minHeight: '85vh' }}
    >
      {/* Partners ticker (separate component) */}
      {/* <PartnersTicker /> */}

      {/* Image Carousel Background */}
      <div className="absolute inset-0">
        {heroImages.map((image, index) => (
          <motion.div
            key={image}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${image})`,
              opacity: index === currentImageIndex ? 1 : 0,
            }}
            initial={{ scale: 1.1 }}
            animate={{ 
              scale: index === currentImageIndex ? 1 : 1.1,
              opacity: index === currentImageIndex ? 1 : 0
            }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        ))}
        
        {/* Enhanced Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-800/60 to-blue-900/70"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
      </div>

      {/* Brand Badge */}
      {/* <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="absolute top-8 left-8 z-20"
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2">
          <span className="text-white font-semibold text-sm tracking-wide">ERIE, PENNSYLVANIA</span>
        </div>
      </motion.div> */}

      {/* Image Navigation Dots */}
      <div className="absolute bottom-8 right-8 z-20 flex space-x-2">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentImageIndex 
                ? 'bg-white shadow-lg' 
                : 'bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`View image ${index + 1}`}
          />
        ))}
      </div>

      {/* Main Hero Content */}
      {/* add mobile padding-top so sticky navbar / ticker don't overlap the heading; remove padding on lg+ */}
      <div className="relative z-10 h-full flex items-center pt-20 lg:pt-0">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
            
            {/* Left Column - Hero Text */}
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="text-white"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                <span className="block">Discover Your</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  Perfect Home
                </span>
                <span className="block">in Erie</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed max-w-xl">
                Experience premium real estate services in Pennsylvania's beautiful lakefront city. 
                From downtown lofts to waterfront estates.
              </p>
              
              {/* Statistics Bar */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="grid grid-cols-3 gap-6 mb-8"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">500+</div>
                  <div className="text-sm text-blue-200">Active Listings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">98%</div>
                  <div className="text-sm text-blue-200">Client Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">15+</div>
                  <div className="text-sm text-blue-200">Years Experience</div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Search Interface */}
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="lg:pl-8"
            >
              <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Start Your Property Search
                  </h2>
                  <p className="text-gray-600">
                    Access our comprehensive MLS database with real-time listings
                  </p>
                </div>
                
                {/* Enhanced Search Bar */}
                <SearchBar onSearchResults={onSearchResults} />
                
                {/* Quick Search Options */}
                {/* <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">Popular Searches:</p>
                  <div className="flex flex-wrap gap-2">
                    {['Downtown Erie', 'Waterfront', 'Millcreek', 'West Erie', 'Luxury Homes'].map((term) => (
                      <button
                        key={term}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded-full transition-colors"
                        onClick={() => {
                          // Trigger search with this term
                          const searchInput = document.querySelector('input[name="search"]');
                          if (searchInput) {
                            searchInput.value = term;
                            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                          }
                        }}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div> */}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator (non-overlapping) - placed below hero content so it won't overlap search card */}
      <div className="relative z-30 flex justify-center mt-6 sm:mt-8 hero-scroll-gap">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="flex flex-col items-center text-white/90 pointer-events-none"
        >
          <span className="text-xs uppercase tracking-wider mb-2">Scroll to Explore</span>
          <motion.div
            aria-hidden
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-3 bg-white/70 rounded-full mt-2"
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ErieBrandedHero;

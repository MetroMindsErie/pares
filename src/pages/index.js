"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Hero } from '../components/Hero';
import { Contact } from '../components/Contact';
import Reels from '../components/Reels';
import Blog from '../components/Blog';
import Stablecoin from '../components/Stablecoin';
import { useAuth } from '../context/auth-context';
import { handleProfileNavigation } from '../utils/profileUtils';
import Layout from '../components/Layout';
import '../styles/animations.css';
import ReactDOM from 'react-dom';
import CountyDetails from '../components/CountyDetails';  // Add this import

// Dynamically import the map component to prevent SSR issues
const InteractiveRealEstateMap = dynamic(
  () => import('../../interactive-real-estate-map'),
  { ssr: false }
);

// Updated center coordinates to match the map component
const PENNSYLVANIA_CENTER = { lat: 40.95, lng: -77.85 }; 
const PA_ZOOM_LEVEL = 7;

const HomePage = ({ featuredListings = [], heroContent }) => {
  const router = useRouter();
  const [showMapGuide, setShowMapGuide] = useState(true);
  const [hasInteractedWithMap, setHasInteractedWithMap] = useState(false);
  const mapRef = useRef(null);
  const { user, isAuthenticated } = useAuth();
  // Track if user has seen instructions
  const hasSeenInstructions = useRef(false);
  const [isMapExpanded, setIsMapExpanded] = useState(true); // Changed from false to true
  const [selectedCountyId, setSelectedCountyId] = useState(null);
  const countyDetailsRef = useRef(null);
  const [countyDetails, setCountyDetails] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  useEffect(() => {
    // Check if user has seen map instructions before
    const hasSeenMapGuide = localStorage.getItem('hasSeenMapGuide');
    if (hasSeenMapGuide) {
      setShowMapGuide(false);
      hasSeenInstructions.current = true;
    }
  }, []);
  
  const dismissMapGuide = () => {
    setShowMapGuide(false);
    localStorage.setItem('hasSeenMapGuide', 'true');
    hasSeenInstructions.current = true;
  };
  
  const handleMapInteraction = () => {
    if (!hasInteractedWithMap) {
      setHasInteractedWithMap(true);
      if (showMapGuide) {
        setTimeout(() => {
          setShowMapGuide(false);
        }, 2000);
      }
    }
  };

  const handleEmailClick = async (e) => {
    e.preventDefault();
    if (user) {
      await handleProfileNavigation(user, router);
    } else {
      router.push('/login');
    }
  };

  // Enhanced county selection handler with shorter loading time and debug logs
  const handleCountySelected = (countyId) => {
    console.log("County selected in parent:", countyId);
    
    // Set selected county ID immediately
    setSelectedCountyId(countyId);
    
    // Start loading state immediately
    setIsDetailsLoading(true);
    
    // End loading after a very short delay - this helps content appear faster
    setTimeout(() => {
      console.log("Ending loading state for county details");
      setIsDetailsLoading(false);
      
      // Replace the require with a proper rendering approach
      const detailsContent = document.querySelector('.county-details-content');
      
      if (detailsContent && typeof window !== 'undefined') {
        try {
          // Use createRoot API for React 18
          const root = ReactDOM.createRoot(detailsContent);
          root.render(<CountyDetails countyId={countyId} />);
          console.log("County details rendered:", countyId);
        } catch (err) {
          console.error("Error rendering county details:", err);
          // Fallback rendering for older React versions or errors
          detailsContent.innerHTML = `
            <div class="p-6 text-center">
              <p class="text-gray-800 font-medium">
                Showing details for county ID: ${countyId}
              </p>
              <p class="text-gray-500 mt-2">
                (Loading county information...)
              </p>
            </div>
          `;
        }
      } else {
        console.error("County details container not found");
      }
    }, 200);
  };

  // Dynamic background patterns for visual interest
  const backgroundPattern = {
    backgroundImage: 'radial-gradient(rgba(25, 118, 210, 0.05) 1px, transparent 1px), radial-gradient(rgba(25, 118, 210, 0.05) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 10px 10px',
  };

  return (
    <Layout>
      <Head>
        <title>Interactive Property Map | Pennsylvania Real Estate</title>
        <meta name="description" content="Explore properties across Pennsylvania with our interactive map" />
      </Head>
      
      <main className="pt-16 min-h-screen bg-gradient-to-br from-white to-gray-50" style={backgroundPattern}>
        {/* Hero Section with Map Preview */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden bg-cover bg-center"
          style={{
            backgroundImage: 'url(/hero-background.jpg)',
            height: '300px'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-indigo-900/80"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center relative z-10">
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="max-w-3xl"
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight drop-shadow-md">
                Discover Pennsylvania Properties
              </h1>
              <p className="text-lg md:text-xl text-blue-100 max-w-2xl leading-relaxed drop-shadow">
                Explore our interactive county map to find available properties across Pennsylvania
              </p>
              <div className="mt-5">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 bg-white text-blue-800 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  onClick={() => mapRef.current?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Explore the Map
                </motion.button>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Map Section with Improved Layout */}
        <div id="map-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-20" ref={mapRef}>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="bg-white rounded-xl p-0 overflow-visible shadow-xl border border-gray-100" 
          >
            {/* Map Header with Toggle Button */}
            <div className="bg-gray-50 p-4 flex items-center justify-between border-b border-gray-200">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Interactive County Explorer</h2>
                  <p className="text-sm text-gray-500">Click on a highlighted county to view properties</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <a 
                  href="#how-to-use" 
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md text-sm font-medium transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  How to Use
                </a>
                <button 
                  onClick={() => setIsMapExpanded(!isMapExpanded)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-sm font-medium transition-colors"
                  aria-label={isMapExpanded ? "Collapse map" : "Expand map"}
                >
                  {isMapExpanded ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      <span className="hidden sm:inline">Collapse</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      <span className="hidden sm:inline">Expand</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Map Container - Explicit positioning */}
            <div 
              className="transition-all duration-500 ease-in-out"
              style={{ 
                height: isMapExpanded ? '50vh' : '35vh', 
                minHeight: isMapExpanded ? '400px' : '300px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div className="relative h-full w-full">
                {/* Map Legend - Top Right */}
                <div className="absolute top-4 right-4 z-10 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200 max-w-xs">
                  <div className="text-xs font-medium text-gray-500 mb-2">MAP LEGEND</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#0000FF'}}></div>
                      <span className="text-xs">Erie County</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#FFFF00'}}></div>
                      <span className="text-xs">Warren County</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#800080'}}></div>
                      <span className="text-xs">Crawford County</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#E2E8F0'}}></div>
                      <span className="text-xs">Other Counties</span>
                    </div>
                  </div>
                </div>
                
                {/* Interactive Map Component with onCountySelected handler */}
                <InteractiveRealEstateMap
                  onInteraction={handleMapInteraction}
                  onCountySelected={handleCountySelected}
                />
                
                {/* Map Instructions Overlay */}
                {showMapGuide && (
                  <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-10">
                    <div className="bg-white rounded-xl p-6 max-w-lg shadow-2xl">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-blue-800">County Property Explorer</h3>
                        <button 
                          onClick={dismissMapGuide} 
                          className="text-gray-400 hover:text-gray-600"
                          aria-label="Close instructions"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      <div className="space-y-4 text-gray-700">
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 rounded-full p-2 text-blue-700 shrink-0 mt-0.5">1</div>
                          <div>
                            <p className="font-medium">Navigate the Map</p>
                            <p className="text-sm text-gray-600">Use your mouse to pan and zoom around the Pennsylvania map.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 rounded-full p-2 text-blue-700 shrink-0 mt-0.5">2</div>
                          <div>
                            <p className="font-medium">Select a County</p>
                            <p className="text-sm text-gray-600">Click on a highlighted county (Erie, Warren, or Crawford) to view available properties and county statistics.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 rounded-full p-2 text-blue-700 shrink-0 mt-0.5">3</div>
                          <div>
                            <p className="font-medium">Explore Properties</p>
                            <p className="text-sm text-gray-600">Browse active and closed listings in your selected county.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 rounded-full p-2 text-blue-700 shrink-0 mt-0.5">4</div>
                          <div>
                            <p className="font-medium">View Details</p>
                            <p className="text-sm text-gray-600">Click on any property listing to see more information.</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end gap-3">
                        <button 
                          onClick={dismissMapGuide}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          Start Exploring
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* First-time User Hint */}
                {!hasSeenInstructions.current && !showMapGuide && !hasInteractedWithMap && (
                  <div className="absolute top-16 right-4 bg-blue-50 rounded-lg p-3 shadow-lg border border-blue-200 max-w-xs animate-bounce-subtle">
                    <p className="text-sm text-blue-800">
                      <span className="font-bold">Tip:</span> Click on a colored county to see available properties.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Simplified County Details Container */}
            <div 
              id="county-details-container" 
              className="county-details-wrapper border-t border-gray-200 relative"
              ref={countyDetailsRef}
              style={{ 
                minHeight: '200px',
                maxHeight: 'none', // Remove max height restriction
                display: 'block', 
                width: '100%',
                background: '#fff',
                overflowY: 'visible', // Allow content to flow
                transition: 'all 0.5s ease-in-out'
              }}
            >
              {/* Back to map button for mobile users */}
              {selectedCountyId && (
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-2 flex justify-between items-center shadow-sm">
                  <button 
                    onClick={() => document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    Back to Map
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    {COUNTY_STYLES[selectedCountyId]?.name || ''} County
                  </span>
                </div>
              )}
              
              {!selectedCountyId ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500">Select a county on the map to view details and properties</p>
                </div>
              ) : isDetailsLoading ? (
                <div className="county-details-loading p-6 text-center">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-6"></div>
                  </div>
                </div>
              ) : null}
              <div className="county-details-content">
                {/* This will be populated by the map component's direct DOM manipulation */}
              </div>
            </div>
          </motion.div>
        </div>

        {/* How to Use Guide Section */}
        <div id="how-to-use" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How to Use the County Explorer
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="bg-blue-100 rounded-full p-3 text-blue-700 shrink-0">
                    <span className="font-bold text-lg">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 mb-1">Explore the Map</h3>
                    <p className="text-gray-600">Pan around the map by clicking and dragging. Use the mouse wheel or touch gestures to zoom in and out.</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="bg-blue-100 rounded-full p-3 text-blue-700 shrink-0">
                    <span className="font-bold text-lg">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 mb-1">Select a County</h3>
                    <p className="text-gray-600">Click on a highlighted county (Erie, Warren, or Crawford) to view its properties and details.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="bg-blue-100 rounded-full p-3 text-blue-700 shrink-0">
                    <span className="font-bold text-lg">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 mb-1">Review County Details</h3>
                    <p className="text-gray-600">After selecting a county, scroll down to see county information and statistics.</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="bg-blue-100 rounded-full p-3 text-blue-700 shrink-0">
                    <span className="font-bold text-lg">4</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 mb-1">Browse Properties</h3>
                    <p className="text-gray-600">Toggle between active and closed listings. Click on any property card to view more details.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Pro Tip:</strong> Use the "Expand" button to make the map larger for easier navigation on smaller screens.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Section Divider */}
        <div className="max-w-5xl mx-auto py-4">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex-grow h-0.5 bg-gradient-to-r from-white via-gray-200 to-white"></div>
            <div className="text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="flex-grow h-0.5 bg-gradient-to-r from-white via-gray-200 to-white"></div>
          </div>
        </div>

        {/* Main Content Section - All content after the map */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Any content below the map goes here */}
          {isAuthenticated ? (
            <div className="space-y-24">
              <motion.section 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="section-transition"
              >
                <Blog />
              </motion.section>
              
              <motion.section 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="section-transition"
              >
                <Stablecoin />
              </motion.section>
              
              <motion.section 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="section-transition"
              >
                <Reels />
              </motion.section>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="glass-effect rounded-2xl p-8 shadow-lg"
              >
                <Contact />
              </motion.div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center py-16 px-4 my-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-sm"
            >
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welcome to our Guest Experience</h2>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-8">
                Enjoy our free guest tier with limited features. For a premium experience with full access to all properties and tools, please sign in.
              </p>
              <button 
                onClick={() => router.push('/login')}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Sign in to access premium features"
              >
                Get Started
              </button>
            </motion.div>
          )}

          {/* Hero Content */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="my-16"
          >
            <Hero content={heroContent} />
          </motion.div>
          
          {/* User Profile Link */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex justify-center py-10"
          >
            <a 
              href="#" 
              onClick={handleEmailClick}
              className="flex items-center space-x-2 px-6 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-full shadow-sm hover:shadow transition-all duration-300 group"
              aria-label={user ? `View profile for ${user.email}` : "Sign in to your account"}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {user?.email ? user.email[0].toUpperCase() : '?'}
                </span>
              </div>
              <span className="text-gray-700 group-hover:text-gray-900">
                {user?.email || 'Sign in to your account'}
              </span>
              <svg 
                className="w-4 h-4 text-gray-400 group-hover:text-gray-700 group-hover:transform group-hover:translate-x-1 transition-transform"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </motion.div>
        </div>
      </main>
    </Layout>
  );
};

// Add this to make the county styles available globally
const COUNTY_STYLES = {
  '42049': { name: 'Erie', color: '#0000FF' },
  '42121': { name: 'Warren', color: '#FFFF00' },
  '42039': { name: 'Crawford', color: '#800080' }
};

export async function getStaticProps() {
  try {
    const heroContent = null;
    const featuredListings = [];
    return {
      props: {
        heroContent: heroContent || null,
        featuredListings: featuredListings || []
      }
    };
  } catch (error) {
    console.error('Error fetching content:', error);
    return { props: { heroContent: null, featuredListings: [] } };
  }
}

export default HomePage;

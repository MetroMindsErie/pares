"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Hero } from '../components/Hero';
import Blog from '../components/Blog';
import { useAuth } from '../context/auth-context';
import Layout from '../components/Layout';
import '../styles/animations.css';
import SearchResults from '../components/SearchResults';
import ErieBrandedHero from '../components/ErieBrandedHero';
import CityFeatures from '../components/CityFeatures';
import { getCachedSearchResults, hasCachedSearchResults, cacheSearchResults } from '../lib/searchCache';
import PartnersTicker from '@/components/PartnersTicker';

const HomePage = ({ featuredListings = [], heroContent }) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  // Enhanced state for search results with loading
  const [searchResults, setSearchResults] = useState(null);
  const [nextLink, setNextLink] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchResultsRef = useRef(null);

  // Check for cached results on component mount
  useEffect(() => {
    // Check if we should scroll to top (coming from dashboard)
    const shouldScrollToTop = sessionStorage.getItem('scrollToTop');
    
    if (shouldScrollToTop === 'true') {
      sessionStorage.removeItem('scrollToTop');
      
      // Clear search results immediately
      setSearchResults(null);
      setNextLink(null);
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'auto' });
      
      return; // Exit early, don't load cached results
    }
    
    // Only load cached results if NOT coming from dashboard
    const cachedResults = getCachedSearchResults();
    if (cachedResults && cachedResults.length > 0) {
      setSearchResults(cachedResults);
      // Scroll to results if we have them
      setTimeout(() => {
        searchResultsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 500);
    }
  }, []);

  // Enhanced handler for search results with caching
  const handleSearchResults = (properties, nextLinkUrl) => {
    ('Search results received:', properties); // Debug log
    ('Properties count:', properties?.length); // Debug log
    
    setIsSearching(false);
    setSearchResults(properties);
    setNextLink(nextLinkUrl);
    
    // Cache the search results
    if (properties && properties.length > 0) {
      cacheSearchResults(properties);
      
      setTimeout(() => {
        searchResultsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  };

  // Add search start handler
  const handleSearchStart = () => {
    setIsSearching(true);
    setSearchResults(null);
  };

  const handleEmailClick = async (e) => {
    e.preventDefault();
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
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
        <title>Erie Pennsylvania Real Estate | Premium Properties & MLS Search</title>
        <meta name="description" content="Discover premium real estate in Erie, Pennsylvania. Search MLS listings, explore downtown properties, and find your perfect home with our professional real estate services." />
        <meta name="keywords" content="Erie Pennsylvania real estate, MLS search, downtown Erie properties, Pennsylvania homes" />
      </Head>
      
      <main className="pt-4 sm:pt-8 md:pt-16 min-h-screen bg-gradient-to-br from-white to-gray-50" style={backgroundPattern}>
        <PartnersTicker />
        {/* Enhanced Branded Hero Section */}
        <ErieBrandedHero 
          onSearchResults={handleSearchResults}
          onSearchStart={handleSearchStart}
        />

        {/* Enhanced Search Results Section */}
        <div 
          ref={searchResultsRef} 
          className="w-full"
        >
          {isSearching && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="text-center">
                <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-blue-700">Searching properties...</span>
                </div>
              </div>
            </div>
          )}
          
          {searchResults && searchResults.length > 0 && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 bg-white shadow-sm">
              <SearchResults 
                key={`search-results-${searchResults.length}-${Date.now()}`}
                listings={searchResults} 
                nextLink={nextLink} 
              />
            </div>
          )}
          
          {searchResults && searchResults.length === 0 && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="text-center bg-gray-50 rounded-lg p-8">
                <p className="text-gray-600 text-lg">No properties found matching your search criteria.</p>
                <p className="text-gray-500 mt-2">Try adjusting your search filters or location.</p>
              </div>
            </div>
          )}
        </div>

        {/* Only show City Features if no search results */}
        {!searchResults && <CityFeatures />}
        
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
                {/* Added: link to full blog page */}
                <div className="mt-4 flex justify-end">
                  <a
                    href="/blog"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
                  >
                    View all posts
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </motion.section>
              
              {/* <motion.section 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="section-transition"
              >
                <Stablecoin />
              </motion.section> */}
              
              {/* <motion.section 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="section-transition"
              >
                <Reels />
              </motion.section> */}
              
              {/* <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="glass-effect rounded-2xl p-8 shadow-lg"
              >
                <Contact />
              </motion.div> */}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center py-8 sm:py-12 px-4 my-6 sm:my-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-sm"
            >
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Welcome to our Guest Experience</h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-700 max-w-2xl mx-auto mb-6 sm:mb-8">
                Enjoy our free guest tier with limited features. For a premium experience with full access to all properties and tools, please sign in.
              </p>
              <button 
                onClick={() => router.push('/login')}
                className="relative px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border-2 border-blue-400 hover:border-blue-300 shadow-lg text-sm sm:text-base"
                aria-label="Sign in to access premium features"
              >
                <span className="relative z-10">Get Started</span>
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/20 to-blue-500/20 blur-sm"></div>
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
              className="flex items-center space-x-2 px-6 py-3 bg-white hover:bg-gray-50 border-2 border-blue-200 hover:border-blue-300 rounded-full shadow-sm hover:shadow-lg transition-all duration-300 group"
              aria-label={user ? `Go to dashboard for ${user.email}` : "Sign in to your account"}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {user?.email ? user.email[0].toUpperCase() : '👤'}
                </span>
              </div>
              <span className="text-gray-700 group-hover:text-blue-700">
                {user?.email ? 'Go to Dashboard' : 'Sign in to your account'}
              </span>
              <svg 
                className="w-4 h-4 text-blue-400 group-hover:text-blue-600 group-hover:transform group-hover:translate-x-1 transition-transform"
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

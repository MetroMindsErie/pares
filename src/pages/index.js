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
import BiggerPocketsSection from '@/components/BiggerPocketsSection';

const HomePage = ({ featuredListings = [], heroContent }) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  // Enhanced state for search results with loading
  const [searchResults, setSearchResults] = useState(null);
  const [nextLink, setNextLink] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchResultsRef = useRef(null);

  // Defensive "load more" handler used by SearchResults
  const loadMore = async () => {
    if (!nextLink) return;
    setIsSearching(true);
    try {
      const res = await fetch(nextLink);
      const data = await res.json();

      // Support several possible response shapes
      let newProps = [];
      if (Array.isArray(data)) {
        newProps = data;
      } else if (Array.isArray(data.properties)) {
        newProps = data.properties;
      } else if (Array.isArray(data.results)) {
        newProps = data.results;
      } else if (Array.isArray(data.items)) {
        newProps = data.items;
      }

      if (newProps.length === 0) {
        // nothing to append
        setNextLink(data.next || data.nextLink || null);
        return;
      }

      const combined = [...(searchResults || []), ...newProps];
      setSearchResults(combined);
      // Update cache if you rely on cached search results
      try { cacheSearchResults(combined); } catch (e) { /* ignore cache errors */ }

      // Update pagination pointer (defensive)
      setNextLink(data.next || data.nextLink || null);
    } catch (err) {
      console.error('Error loading more properties:', err);
    } finally {
      setIsSearching(false);
    }
  };

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
  const handleSearchResults = (propertiesOrPayload, nextLinkUrl) => {
    setIsSearching(false);

    // Defensive: some callers may pass `{ properties: [...] }`, `{ listings: [...] }`, etc.
    const extracted = Array.isArray(propertiesOrPayload)
      ? propertiesOrPayload
      : (Array.isArray(propertiesOrPayload?.properties)
          ? propertiesOrPayload.properties
          : (Array.isArray(propertiesOrPayload?.listings)
              ? propertiesOrPayload.listings
              : (Array.isArray(propertiesOrPayload?.results)
                  ? propertiesOrPayload.results
                  : [])));

    const effectiveNext =
      nextLinkUrl ||
      propertiesOrPayload?.nextLink ||
      propertiesOrPayload?.next ||
      propertiesOrPayload?.loadMoreUrl ||
      null;

    setSearchResults(extracted);
    setNextLink(effectiveNext);
    
    // Cache the search results
    if (extracted && extracted.length > 0) {
      cacheSearchResults(extracted);
      
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
                <div className="inline-flex items-center px-4 py-2 bg-teal-50 rounded-lg">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-teal-700">Searching properties...</span>
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
                nextLinkUrl={nextLink}     // common alternative name
                loadMoreUrl={nextLink}     // another alias
                onLoadMore={loadMore}      // some components expect this
                onLoadMoreClick={loadMore} // another alias
                loadMore={loadMore}        // another alias
                hasMore={!!nextLink}       // boolean flag often used to show load button
                isLoadingMore={isSearching}
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
  
          {/* Blog section — visible on home page */}
          <div className="my-12">
            <BiggerPocketsSection
              pageSize={6}
              heading="Latest from the PARES Blog"
              showBiggerPockets={false}
              showSeeAllButton={true}
            />
          </div>
          

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
            {/* Avatar helper used for both auth and guest states */}
            {/*
              Avatar: gradient ring -> white inner circle -> initials or SVG icon.
              Keeps label & hint text to the right for clarity.
            */}
            <button
              type="button"
              onClick={handleEmailClick}
              aria-label={user ? `Go to dashboard for ${user.email}` : "Sign in to your account"}
              className="inline-flex items-center gap-4 px-5 py-3 border border-teal-200 rounded-md text-teal-600 bg-transparent hover:bg-white/5 shadow-sm hover:shadow-md transition-colors transition-shadow focus:outline-none focus:ring-2 focus:ring-teal-300"
            >
              <div className="flex-shrink-0">
                <div className="rounded-full p-[2px] bg-gradient-to-tr from-teal-400 to-green-500">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-sm font-semibold text-gray-800 shadow">
                    {/* Neutral user glyph — no initials */}
                    <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 20a8 8 0 0116 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="text-left">
                <div className="text-sm font-semibold text-teal-600">
                  {user ? 'Member Hub' : 'Start exploring'}
                </div>
                <div className="text-xs text-teal-600/80 -mt-0.5">
                  {user ? 'Open your dashboard' : 'Create an account or sign in'}
                </div>
              </div>

              <svg className="ml-3 w-4 h-4 text-teal-600/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
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

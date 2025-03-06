"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import { Hero } from '../components/Hero';
import { Contact } from '../components/Contact';
import Reels from '../components/Reels';
import Blog from '../components/Blog';
import Stablecoin from '../components/Stablecoin';
import { useAuth } from '../context/auth-context';
import { handleProfileNavigation } from '../utils/profileUtils';
import '../styles/animations.css';

const HomePage = ({ featuredListings = [], heroContent }) => {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const resultsRef = useRef(null);

  useEffect(() => {
    const storedResults = localStorage.getItem('searchResults');
    if (storedResults) {
      try {
        setIsLoading(true);
        const parsedResults = JSON.parse(storedResults);
        setSearchResults(Array.isArray(parsedResults) ? parsedResults : []);
        setIsSearching(true);
        setTimeout(() => setIsLoading(false), 500); // Simulated loading for better UX
      } catch (error) {
        console.error('Error parsing search results:', error);
        setSearchResults([]);
        setIsLoading(false);
      }
    }

    if (router?.query && Object.keys(router.query).length) {
      router.replace('/', undefined, { shallow: true }).catch(() => { });
    }
  }, [router]);

  const handleSearchResults = (results) => {
    if (Array.isArray(results)) {
      setIsLoading(true);
      setSearchResults(results);
      setIsSearching(true);
      
      setTimeout(() => {
        setIsLoading(false);
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 600);
    }
  };

  const handleEmailClick = async (e) => {
    e.preventDefault();
    
    if (user) {
      await handleProfileNavigation(user, router);
    } else {
      // If no user is logged in, redirect to login
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
        <title>Find Your Dream Home | Premium Real Estate</title>
        <meta name="description" content="Discover exceptional properties in your favorite locations" />
      </Head>
      
      <main className="pt-16 min-h-screen bg-gradient-to-br from-white to-gray-50" style={backgroundPattern}>
        {/* Hero Section with Glass Effect */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-indigo-900 opacity-90"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 lg:py-32 relative z-10">
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
                Find Your Dream Home
              </h1>
              <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto">
                Discover exceptional properties curated just for you
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="max-w-3xl mx-auto glass-effect rounded-xl p-4 md:p-6"
            >
              <SearchBar onSearchResults={handleSearchResults} />
            </motion.div>

            {/* Decorative elements */}
            <div className="hidden md:block absolute right-5 bottom-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="hidden md:block absolute left-5 bottom-10 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          </div>
        </motion.div>

        {/* Main Content Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" ref={resultsRef}>
          {/* Search Results with Animation */}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-16"
              >
                {isLoading ? (
                  <div aria-live="polite" aria-busy="true" className="my-12">
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="flex items-center justify-center space-x-2"
                    >
                      <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                      <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                      <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                      <span className="sr-only">Loading search results...</span>
                    </motion.div>
                    <p className="text-center text-gray-600 mt-4">Finding the best matches for you...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Search Results</h2>
                    <SearchResults listings={searchResults} />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 bg-gray-50 rounded-lg"
                  >
                    <p className="text-gray-700 text-xl">No properties match your search criteria.</p>
                    <p className="text-gray-500 mt-2">Try adjusting your search parameters.</p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Authenticated Content or Guest Message */}
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
}

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

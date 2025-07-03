import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import PropertySwiper from '../components/PropertySwiper/PropertySwiper';
import { searchProperties, getNextProperties } from '../services/trestleServices';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faHeart, faPhone, faSearch } from '@fortawesome/free-solid-svg-icons';

const SwipePage = () => {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextLink, setNextLink] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [stats, setStats] = useState({
    liked: 0,
    connections: 0,
    viewed: 0
  });
  const [searchInput, setSearchInput] = useState('');

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize with query parameters
  useEffect(() => {
    const { q, location } = router.query;
    if (q || location) {
      const initialQuery = q || location;
      setSearchQuery(initialQuery);
      setSearchInput(initialQuery);
      handleSearch(initialQuery);
    }
  }, [router.query]);

  const handleSearch = async (query) => {
    setLoading(true);
    setHasSearched(true);
    
    try {
      const searchParams = {
        location: query
      };
      
      const result = await searchProperties(searchParams);
      setProperties(result.properties);
      setNextLink(result.nextLink);
      setSearchQuery(query);
      
      // Reset stats
      setStats({
        liked: 0,
        connections: 0,
        viewed: 0
      });
      
    } catch (error) {
      console.error('Search failed:', error);
      // You might want to show an error message here
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextLink || loading) return;
    
    setLoading(true);
    try {
      const result = await getNextProperties(nextLink);
      setProperties(prev => [...prev, ...result.properties]);
      setNextLink(result.nextLink);
    } catch (error) {
      console.error('Failed to load more properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyAction = (property, direction) => {
    // Update stats
    setStats(prev => ({
      ...prev,
      viewed: prev.viewed + 1,
      liked: direction === 'right' ? prev.liked + 1 : prev.liked,
      connections: direction === 'up' ? prev.connections + 1 : prev.connections
    }));

    // Handle specific actions
    switch (direction) {
      case 'up': // Connect
        // Redirect to property detail page or contact form
        router.push(`/property/${property.ListingKey}?action=contact`);
        break;
      case 'right': // Like
        // Could show a brief animation or feedback
        break;
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      handleSearch(searchInput.trim());
    }
  };

  // Always show swiper interface on mobile if we have searched, or on desktop if we have properties
  const shouldShowSwiper = hasSearched && (isMobile || properties.length > 0);

  return (
    <Layout>
      <Head>
        <title>Find Your Perfect Home | PA Real Estate</title>
        <meta name="description" content="Swipe through properties to find your perfect home in Pennsylvania" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        {/* Always Visible Search Header */}
        <div className="sticky top-0 z-50 bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors flex-shrink-0"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                {!isMobile && <span>Back</span>}
              </button>
              
              <form onSubmit={handleSearchSubmit} className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={isMobile ? "City, county, ZIP..." : "Search by city, county, or ZIP code..."}
                    className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <FontAwesomeIcon 
                    icon={faSearch} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-1.5 rounded-md transition-colors text-sm"
                  >
                    {loading ? '...' : 'Search'}
                  </button>
                </div>
              </form>
              
              {/* Stats - Mobile Compact */}
              {shouldShowSwiper && (
                <div className="flex gap-3 text-sm flex-shrink-0">
                  <div className="flex items-center gap-1 text-green-600">
                    <FontAwesomeIcon icon={faHeart} />
                    <span>{stats.liked}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <FontAwesomeIcon icon={faPhone} />
                    <span>{stats.connections}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 pb-8">
          <div className="max-w-6xl mx-auto px-4">
            {!shouldShowSwiper ? (
              /* Initial Search Interface for Desktop */
              <div className="text-center py-16">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Where would you like to live?
                </h2>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Search for properties in Pennsylvania and swipe through them to find your perfect home.
                </p>
                
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="text-2xl mb-2">👈</div>
                    <h3 className="font-semibold text-gray-800 mb-2">Pass</h3>
                    <p className="text-sm text-gray-600">Not interested? Swipe left to pass on this property.</p>
                  </div>
                  
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="text-2xl mb-2">❤️</div>
                    <h3 className="font-semibold text-gray-800 mb-2">Like</h3>
                    <p className="text-sm text-gray-600">Love it? Swipe right to save to your favorites.</p>
                  </div>
                  
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="text-2xl mb-2">📞</div>
                    <h3 className="font-semibold text-gray-800 mb-2">Connect</h3>
                    <p className="text-sm text-gray-600">Ready to learn more? Swipe up to contact the agent.</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Swiper Interface - Show immediately on mobile after search */
              <div className={`${isMobile ? 'block' : 'grid grid-cols-1 lg:grid-cols-3 gap-8'} items-start`}>
                {/* Desktop Sidebar - Hidden on Mobile */}
                {!isMobile && (
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <h3 className="font-semibold text-gray-800 mb-4">Your Activity</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Properties viewed</span>
                          <span className="font-medium">{stats.viewed}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Liked</span>
                          <span className="font-medium text-green-600">{stats.liked}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Connections</span>
                          <span className="font-medium text-blue-600">{stats.connections}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Property Swiper - Full Width on Mobile */}
                <div className={isMobile ? 'w-full' : 'lg:col-span-2'}>
                  {/* Show loading state on mobile while search is happening */}
                  {loading && properties.length === 0 && isMobile ? (
                    <div className="relative w-full h-[70vh] max-w-md mx-auto">
                      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col animate-pulse">
                        <div className="h-1/2 bg-gray-200"></div>
                        <div className="flex-1 p-6 flex flex-col">
                          <div className="h-6 bg-gray-200 rounded mb-4 w-3/4"></div>
                          <div className="flex gap-4 mb-4">
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                          </div>
                          <div className="space-y-2 flex-1">
                            <div className="h-3 bg-gray-200 rounded"></div>
                            <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          </div>
                          <div className="grid grid-cols-4 gap-3 mt-6">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white bg-opacity-90 rounded-lg p-4 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-sm text-gray-600">Finding properties...</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <PropertySwiper
                      properties={properties}
                      onLoadMore={handleLoadMore}
                      loading={loading}
                      hasMore={!!nextLink}
                      onPropertyAction={handlePropertyAction}
                      isMobile={isMobile}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};


export default SwipePage;

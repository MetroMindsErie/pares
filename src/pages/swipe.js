import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import PropertySwiper from '../components/PropertySwiper/PropertySwiper';
import { searchProperties, getNextProperties } from '../services/trestleServices';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faHeart, faSearch, faFilter, faChevronDown, faTimes } from '@fortawesome/free-solid-svg-icons';

const QUICK_LOCATIONS = ['Erie', 'Crawford', 'Warren', 'Meadville', 'Corry', 'North East'];
const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'ActiveUnderContract', label: 'Under Contract' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Closed', label: 'Sold' },
];
const PRICE_RANGES = [
  { value: '', label: 'Any Price' },
  { value: '0-100000', label: 'Under $100K' },
  { value: '100000-200000', label: '$100K – $200K' },
  { value: '200000-350000', label: '$200K – $350K' },
  { value: '350000-500000', label: '$350K – $500K' },
  { value: '500000-', label: '$500K+' },
];
const BED_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
];
const TYPE_OPTIONS = [
  { value: '', label: 'Any Type' },
  { value: 'Residential', label: 'Residential' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Land', label: 'Land' },
  { value: 'Multi-Family', label: 'Multi-Family' },
  { value: 'Farm', label: 'Farm' },
];

const SwipePage = () => {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nextLink, setNextLink] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(null);
  const [stats, setStats] = useState({ liked: 0, viewed: 0 });

  const [filters, setFilters] = useState({
    location: '',
    status: 'Active',
    priceRange: '',
    beds: '',
    propertyType: '',
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize with query parameters
  useEffect(() => {
    const { q, location } = router.query;
    if (q || location) {
      const initialQuery = q || location;
      setFilters(prev => ({ ...prev, location: initialQuery }));
      handleSearch({ ...filters, location: initialQuery });
    }
  }, [router.query]);

  const buildSearchParams = useCallback((f) => {
    const params = { location: f.location };
    if (f.status) params.status = f.status;
    if (f.beds) params.beds = f.beds;
    if (f.propertyType) params.propertyType = f.propertyType;
    if (f.priceRange) {
      const [min, max] = f.priceRange.split('-');
      if (min) params.minPrice = min;
      if (max) params.maxPrice = max;
    }
    return params;
  }, []);

  const handleSearch = async (overrideFilters) => {
    const f = overrideFilters || filters;
    if (!f.location.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setShowFilters(false);

    try {
      const searchParams = buildSearchParams(f);
      const result = await searchProperties(searchParams);
      setProperties(result.properties);
      setNextLink(result.nextLink);
      setStats({ liked: 0, viewed: 0 });
    } catch (error) {
      console.error('Search failed:', error);
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
      console.error('Failed to load more:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyAction = (property, direction) => {
    setStats(prev => ({
      ...prev,
      viewed: prev.viewed + 1,
      liked: direction === 'right' ? prev.liked + 1 : prev.liked,
    }));

    if (direction === 'right') {
      setSaving(true);
      setSaveToast('Saved!');
      setTimeout(() => { setSaving(false); setSaveToast(null); }, 1200);
    }

    if (direction === 'up') {
      router.push(`/property/${property.ListingKey}?action=contact`);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const activeFilterCount = [filters.priceRange, filters.beds, filters.propertyType].filter(Boolean).length
    + (filters.status !== 'Active' ? 1 : 0);

  const shouldShowSwiper = hasSearched && (isMobile || properties.length > 0);

  return (
    <Layout>
      <Head>
        <title>Find Your Perfect Home | PA Real Estate</title>
        <meta name="description" content="Swipe through properties to find your perfect home in Pennsylvania" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-green-50/20">
        {/* Sticky Search Header */}
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0 text-sm">
                <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                {!isMobile && <span>Back</span>}
              </button>

              <form onSubmit={handleSearchSubmit} className="flex-1">
                <div className="relative">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    value={filters.location}
                    onChange={(e) => updateFilter('location', e.target.value)}
                    placeholder={isMobile ? "City, county, ZIP..." : "Search by city, county, or ZIP code..."}
                    className="w-full pl-9 pr-20 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm transition-all"
                  />
                  <button type="submit" disabled={loading}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white px-4 py-1.5 rounded-lg transition-colors text-xs font-medium">
                    {loading ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="hidden sm:inline">Searching</span>
                      </span>
                    ) : 'Search'}
                  </button>
                </div>
              </form>

              {/* Filter toggle */}
              <button onClick={() => setShowFilters(!showFilters)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm transition-all flex-shrink-0 ${
                  showFilters ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                <FontAwesomeIcon icon={faFilter} className="text-xs" />
                {!isMobile && <span>Filters</span>}
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-teal-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Stats */}
              {shouldShowSwiper && (
                <div className="flex items-center gap-1.5 text-sm flex-shrink-0 bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg">
                  <FontAwesomeIcon icon={faHeart} className="text-xs" />
                  <span className="font-medium">{stats.liked}</span>
                </div>
              )}
            </div>

            {/* Quick location chips */}
            {(!hasSearched || showFilters) && (
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Quick:</span>
                {QUICK_LOCATIONS.map(term => (
                  <button key={term} type="button"
                    onClick={() => { updateFilter('location', term); handleSearch({ ...filters, location: term }); }}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                      filters.location === term
                        ? 'border-teal-400 bg-teal-50 text-teal-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:bg-teal-50/50'
                    }`}>
                    {term}
                  </button>
                ))}
              </div>
            )}

            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-100 pb-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1 block">Status</label>
                    <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-400 focus:border-teal-400">
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1 block">Price</label>
                    <select value={filters.priceRange} onChange={(e) => updateFilter('priceRange', e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-400 focus:border-teal-400">
                      {PRICE_RANGES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1 block">Beds</label>
                    <select value={filters.beds} onChange={(e) => updateFilter('beds', e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-400 focus:border-teal-400">
                      {BED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1 block">Type</label>
                    <select value={filters.propertyType} onChange={(e) => updateFilter('propertyType', e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-400 focus:border-teal-400">
                      {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  {activeFilterCount > 0 && (
                    <button onClick={() => setFilters(prev => ({ ...prev, status: 'Active', priceRange: '', beds: '', propertyType: '' }))}
                      className="text-xs text-gray-500 hover:text-red-500 transition-colors">
                      Clear filters
                    </button>
                  )}
                  <button onClick={() => handleSearch()}
                    className="ml-auto bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium px-5 py-2 rounded-lg transition-colors">
                    Apply & Search
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Toast */}
        {saveToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-bounce">
            <div className="bg-green-600 text-white px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
              {saving ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <FontAwesomeIcon icon={faHeart} />
              )}
              {saveToast}
            </div>
          </div>
        )}

        <div className="pt-4 pb-8">
          <div className="max-w-6xl mx-auto px-4">
            {!shouldShowSwiper ? (
              <div className="text-center py-16">
                <h2 className="text-3xl font-bold text-gray-800 mb-3">
                  Where would you like to live?
                </h2>
                <p className="text-gray-500 mb-10 max-w-xl mx-auto">
                  Search for properties and swipe through them to find your perfect home.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
                  {[
                    { icon: '👈', title: 'Pass', desc: 'Not interested? Swipe left.', color: 'bg-gray-50 border-gray-200' },
                    { icon: '❤️', title: 'Like & Save', desc: 'Love it? Swipe right to save.', color: 'bg-green-50 border-green-200' },
                    { icon: '📞', title: 'Connect', desc: 'Swipe up to view details.', color: 'bg-teal-50 border-teal-200' },
                    { icon: '🙈', title: 'Hide', desc: 'Swipe down to hide forever.', color: 'bg-red-50 border-red-200' },
                  ].map(item => (
                    <div key={item.title} className={`p-5 rounded-xl border ${item.color}`}>
                      <div className="text-2xl mb-2">{item.icon}</div>
                      <h3 className="font-semibold text-gray-800 text-sm mb-1">{item.title}</h3>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`${isMobile ? 'block' : 'grid grid-cols-1 lg:grid-cols-3 gap-8'} items-start`}>
                {!isMobile && (
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                      <h3 className="font-semibold text-gray-800 text-sm mb-3">Session Activity</h3>
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Viewed</span>
                          <span className="font-medium text-gray-800">{stats.viewed}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Liked</span>
                          <span className="font-medium text-green-600">{stats.liked}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                      <h3 className="font-semibold text-gray-800 text-sm mb-2">Results</h3>
                      <p className="text-sm text-gray-500">{properties.length} properties found</p>
                      {nextLink && (
                        <p className="text-xs text-teal-600 mt-1">More available</p>
                      )}
                    </div>
                  </div>
                )}

                <div className={isMobile ? 'w-full' : 'lg:col-span-2'}>
                  {loading && properties.length === 0 ? (
                    <div className="relative w-full h-[70vh] max-w-md mx-auto flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-200 border-t-teal-600 mx-auto mb-3"></div>
                        <p className="text-sm text-gray-500">Finding properties...</p>
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

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/auth-context';
import WelcomeBanner from '../components/Dashboard/WelcomeBanner';
import StatsCard from '../components/Dashboard/StatsCard';
import RecentActivity from '../components/Dashboard/RecentActivity';
import supabase from '../lib/supabase-setup';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { checkFacebookConnection } from '../services/facebookService';
import SavedProperties from '../components/Dashboard/SavedProperties';
import CompareModal from '../components/Dashboard/CompareModal';
import clsx from 'clsx';

export default function DashboardPage() {
  // Compare selection state
  const MAX_COMPARE = 4;
  const [compareIds, setCompareIds] = useState([]); // array of property identifiers
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const announceRef = useRef(null);

  // Initialize compare from deep link ?compare=id1,id2
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const compareParam = params.get('compare');
    if (compareParam) {
      const ids = compareParam.split(',').filter(Boolean).slice(0, MAX_COMPARE);
      setCompareIds(ids);
    }
  }, []);

  const toggleCompare = (id) => {
    setCompareIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x => x !== id);
        if (announceRef.current) announceRef.current.textContent = `Removed from comparison. ${next.length} selected.`;
        return next;
      }
      if (prev.length >= MAX_COMPARE) {
        // simple inline tooltip alternative
        if (announceRef.current) announceRef.current.textContent = `Max ${MAX_COMPARE} properties can be compared.`;
        return prev;
      }
      const next = [...prev, id];
      if (announceRef.current) announceRef.current.textContent = `Added to comparison. ${next.length} selected.`;
      return next;
    });
  };

  const clearCompare = () => {
    setCompareIds([]);
    if (announceRef.current) announceRef.current.textContent = 'Cleared comparison selection.';
  };

  const openCompareModal = () => {
    if (compareIds.length < 2) {
      if (announceRef.current) announceRef.current.textContent = 'Select at least two properties to compare.';
      return;
    }
    setIsCompareOpen(true);
  };

  const { user, isAuthenticated, loading, authChecked } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [hasFacebookConnection, setHasFacebookConnection] = useState(false);
  const [userId, setUserId] = useState(null);
  const [fbConnectionChecked, setFbConnectionChecked] = useState(false);
  const [propertyStats, setPropertyStats] = useState({ liked: 0, connections: 0 });
  const [savedProperties, setSavedProperties] = useState([]);
  const [savedPropertiesLoading, setSavedPropertiesLoading] = useState(true);
  const [savedPropertiesError, setSavedPropertiesError] = useState(null);
  const router = useRouter();
  
  // Use refs to track if effects have run to prevent loops
  const profileFetchedRef = useRef(false);
  const activitiesFetchedRef = useRef(false);
  const cleanupDoneRef = useRef(false);

  // Stop potential infinite loops by clearing URL params
  useEffect(() => {
    if (!cleanupDoneRef.current && typeof window !== 'undefined') {
      cleanupDoneRef.current = true;
      
      // Clear URL params that could cause refresh loops
      if (window.location.href.includes('?')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Reset dashboard load counter and all session storage that might cause loops
      sessionStorage.removeItem('dashboardLoadCount');
      localStorage.removeItem('cryptoInvestorSelected');
    }
    
    // Cleanup and prevent edge case loops
    return () => {
      sessionStorage.removeItem('dashboardLoadCount');
    };
  }, []);

  // Get user ID from multiple sources to ensure we have one - only run once
  useEffect(() => {
    const getUserId = async () => {
      // Skip if we already have a user ID
      if (userId) return;
      
      // First try from auth context
      if (user?.id) {

        setUserId(user.id);
        return;
      }

      // If not in auth context, try from session once
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUserId = data?.session?.user?.id;
        
        if (sessionUserId) {

          setUserId(sessionUserId);
          return;
        } else {

        }
      } catch (err) {
        console.error('Error getting session:', err);
      }
    };
    
    getUserId();
  }, [user, userId]);

  // Fetch user profile only once
  useEffect(() => {
    // Only run this effect if we have a userId and haven't fetched the profile yet
    if (!userId || profileFetchedRef.current) return;
    
    const fetchUserProfile = async () => {
      setLocalLoading(true);
      profileFetchedRef.current = true; // Mark as fetched to prevent loops
      
      try {
        // Fetch user profile

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setLocalLoading(false);
          return;
        }

        // If no profile picture but user has one in metadata, use that
        if (!data.profile_picture_url && user?.user_metadata?.avatar_url) {
          data.profile_picture_url = user.user_metadata.avatar_url;
        }
          
        setProfile(data);
        
        // Check Facebook connection in a non-blocking way if not already checked
        if (!fbConnectionChecked) {

          checkFacebookConnection(userId)
            .then(fbConnected => {

              setHasFacebookConnection(fbConnected);
              setFbConnectionChecked(true);
            })
            .catch(err => {
              console.error('Error checking Facebook connection:', err);
              setFbConnectionChecked(true); // Mark as checked even on error
            });
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
      } finally {
        setLocalLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, user, fbConnectionChecked]);

  // Fetch activities only once - updated to show recent property saves
  useEffect(() => {
    if (activitiesFetchedRef.current) return;
    
    const fetchRecentActivities = async () => {
      if (!userId) return;
      
      try {
        const { data: savedProps, error } = await supabase
          .from('saved_properties')
          .select('*')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        const formattedActivities = savedProps.map(prop => ({
          title: `Saved ${prop.address}`,
          time: new Date(prop.saved_at).toLocaleString(),
          icon: '❤️',
          type: 'property_saved'
        }));

        setActivities(formattedActivities);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setActivities([]);
      }
      
      activitiesFetchedRef.current = true;
    };

    fetchRecentActivities();
  }, [userId]);

  // Fetch property stats
  useEffect(() => {
    const fetchPropertyStats = async () => {
      if (!userId) return;

      try {

        const { getSwipeStats, cleanupNullPropertyData, cleanupOversizedPropertyData } = await import('../utils/swipeUtils');
        
        // Clean up any problematic records first (one-time cleanup)
        try {
          await cleanupNullPropertyData(userId);
          await cleanupOversizedPropertyData(userId);
        } catch (cleanupError) {

        }
        
        const stats = await getSwipeStats(userId);

        
        setPropertyStats({
          liked: stats.liked || 0,
          connections: stats.connections || 0
        });
      } catch (error) {
        console.error('Error fetching property stats:', error);
      }
    };

    fetchPropertyStats();
  }, [userId]);

  // Fetch saved properties
  useEffect(() => {
    const fetchSavedProperties = async () => {
      if (!userId) return;
      
      try {
        const { data, error } = await supabase
          .from('saved_properties')
          .select('*')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false });

        if (error) throw error;
        setSavedProperties(data || []);
      } catch (err) {
        console.error('Error fetching saved properties:', err);
        setSavedPropertiesError(err.message);
      } finally {
        setSavedPropertiesLoading(false);
      }
    };

    fetchSavedProperties();
  }, [userId]);

  // Update the getProfilePicture function to prioritize Google auth
  const getProfilePicture = () => {
    if (!user) return '/default-avatar.png';
    
    // Check Google auth picture first
    if (user.app_metadata?.provider === 'google' && user.user_metadata?.picture) {
      return user.user_metadata.picture;
    }
    
    // Then check profile data
    if (profile?.profile_picture_url) {
      return profile.profile_picture_url;
    }
    
    // Then check general avatar URL
    if (user.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    
    return '/default-avatar.png';
  };

  // Simplified loading check
  const isLoading = loading || (localLoading && !profile);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      {/* Hero section with background image */}
      <div className="relative bg-cover bg-center h-40 sm:h-48 md:h-64" 
           style={{ 
             backgroundImage: 'url("/dashboard-hero.jpg")',
             backgroundBlendMode: 'overlay',
             backgroundColor: 'rgba(0,0,0,0.5)'
           }}>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          {profile && (
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 md:gap-6 text-center sm:text-left">
              <img
                src={getProfilePicture()}
                alt={`${profile.first_name}'s profile`}
                className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full border-4 border-white/20 shadow-xl object-cover"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  e.target.src = '/default-avatar.png';
                }}
              />
              <div className="text-white">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                  Welcome back, {profile.first_name}!
                </h1>
                <p className="mt-1 sm:mt-2 text-blue-100 text-xs sm:text-sm md:text-base">
                  Here's what's happening with your saved properties
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      {/* ensure on mobile the content sits below the hero to avoid overlap; keep negative pull on sm+ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:-mt-10">
         {/* Stats Cards */}
         <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 mb-6 sm:mb-8">
           <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 transform hover:scale-105 transition-transform duration-200">
             <StatsCard
               title="Saved Properties"
               value={savedProperties.length.toString()}
               change={0}
               icon="heart"
             />
           </div>
         </div>

        {/* Quick Actions and Recent Activity */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 mb-6 sm:mb-8">
          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-lg p-4 sm:p-6 border border-blue-100">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-blue-900">Quick Actions</h3>
            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={() => {
                  // Clear any cached search results
                  if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('searchResults');
                    sessionStorage.removeItem('searchParams');
                    localStorage.removeItem('lastSearchResults');
                    localStorage.removeItem('lastSearchParams');
                    sessionStorage.setItem('scrollToTop', 'true');
                  }
                  
                  // Navigate to home
                  window.location.href = '/';
                }}
                className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 sm:gap-3 text-sm sm:text-base"
              >
                <span className="p-1.5 sm:p-2 bg-blue-500 rounded-full text-sm">🏠</span>
                Browse Properties
              </button>
              <button
                onClick={() => router.push('/saved-properties')}
                className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 sm:gap-3 text-sm sm:text-base"
              >
                <span className="p-1.5 sm:p-2 bg-green-500 rounded-full text-sm">❤️</span>
                View Saved Properties ({savedProperties.length})
              </button>
              <button
                onClick={() => router.push('/create-profile')}
                className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 sm:gap-3 text-sm sm:text-base"
              >
                <span className="p-1.5 sm:p-2 bg-gray-300 rounded-full text-sm">⚙️</span>
                Profile Settings
              </button>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="md:col-span-2 bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-lg p-6 border border-blue-100">
            <h3 className="text-lg font-semibold mb-4 text-blue-900">Recent Activity</h3>
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-2xl">{activity.icon}</span>
                    <div className="flex-1">
                      <p className="text-gray-800">{activity.title}</p>
                      <p className="text-sm text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No recent activities</p>
            )}
          </div>
        </div>

        {/* Saved Properties Section + inline compact selector + compare tray */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">Saved Properties</h3>
              <button aria-hidden className="p-1 rounded-md text-gray-400 hover:text-teal-500 transition" title="Filter (ui placeholder)">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M10 18h4M6 6h12M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openCompareModal}
                className={clsx(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-md font-medium transition',
                  compareIds.length >= 2 ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                )}
                aria-disabled={compareIds.length < 2}
                title={compareIds.length < 2 ? 'Select at least 2 to compare' : 'Compare selected properties'}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M9 6v12M15 6v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Compare
                {compareIds.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-6 h-6 text-xs font-semibold bg-white text-teal-600 rounded-full shadow-sm">{compareIds.length}</span>
                )}
              </button>
              <button onClick={clearCompare} className="p-2 rounded-md text-gray-500 hover:text-red-600" title="Clear compare selection">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>

          {/* Inline compact selector (image-first rows with compare toggle) */}
          <div className="space-y-3">
            {savedPropertiesLoading ? (
              <div className="text-sm text-gray-500">Loading saved properties…</div>
            ) : savedProperties.length === 0 ? (
              <div className="text-sm text-gray-500">You have no saved properties yet.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {savedProperties.map((p) => {
                  const id = p.id || p.mlsId || p.listing_id || p.uuid || p.address || JSON.stringify(p);
                  const selected = compareIds.includes(String(id));
                  const price = p.price || p.list_price || p.listingPrice || p.amount;
                  const beds = p.beds || p.bedrooms || p.bed_count;
                  const baths = p.baths || p.bathrooms || p.bath_count;
                  const sqft = p.sqft || p.livingspace || p.building_area;
                  const thumb = (p.photos && p.photos[0]) || p.image || (p.images && p.images[0]) || '/default-property.jpg';
                  return (
                    <li key={String(id)} className="flex items-center gap-4 py-3">
                      <img src={thumb} alt={`${p.address || p.title || 'Property'} - ${price || ''}`} loading="lazy" className={clsx('w-28 h-20 rounded-lg object-cover shadow-sm transition-transform', selected ? 'ring-4 ring-teal-200 -translate-y-1' : '')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{price ? `$${Number(price).toLocaleString()}` : '—'}</div>
                            <div className="text-xs text-gray-500">{beds ?? '—'} bd • {baths ?? '—'} ba • {sqft ?? '—'} ft²</div>
                            <div className="text-xs text-gray-500 truncate">{p.address || p.full_address || p.title || 'Unknown address'}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* simple actions placeholder */}
                        <button className="p-2 rounded-md text-gray-400 hover:text-gray-700" title="More actions">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M12 6a2 2 0 100-4 2 2 0 000 4zM12 14a2 2 0 100-4 2 2 0 000 4zM12 22a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button
                          onClick={() => toggleCompare(String(id))}
                          className={clsx(
                            'px-3 py-2 rounded-md border font-medium text-sm transition',
                            selected ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-gray-200 text-gray-700'
                          )}
                          title={selected ? 'Remove from compare' : 'Add to compare'}
                        >
                          {selected ? 'Selected' : 'Compare'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* aria live region for announcements */}
          <div aria-live="polite" className="sr-only" ref={announceRef} />
        </div>

        {/* Sticky compare tray (bottom-right on desktop, bottom full width on mobile) */}
        {compareIds.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50 hidden md:flex items-center gap-3 bg-white rounded-xl shadow-lg px-4 py-2 ring-1 ring-black/6" role="region" aria-label="Compare tray">
            <div className="flex gap-2 overflow-x-auto max-w-[520px]">
              {compareIds.map(id => {
                const p = savedProperties.find(sp => String(sp.id || sp.mlsId || sp.listing_id || sp.uuid || sp.address || JSON.stringify(sp)) === String(id));
                if (!p) return null;
                const thumb = (p.photos && p.photos[0]) || p.image || (p.images && p.images[0]) || '/default-property.jpg';
                return (
                  <div key={id} className="w-20 h-14 rounded-md overflow-hidden relative ring-1 ring-gray-100">
                    <img src={thumb} alt={p.address || 'property'} className="w-full h-full object-cover" loading="lazy" />
                    <button onClick={() => toggleCompare(String(id))} className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-sm" aria-label={`Remove ${p.address || 'property'} from compare`}>
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={openCompareModal} className="px-3 py-2 bg-teal-500 text-white rounded-md shadow-sm">Compare ({compareIds.length})</button>
              <button onClick={clearCompare} className="p-2 text-gray-500 rounded-md" title="Clear">
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Mobile tray */}
        {compareIds.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-[60] md:hidden bg-white border-t border-gray-200 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-x-auto">
              {compareIds.map(id => {
                const p = savedProperties.find(sp => String(sp.id || sp.mlsId || sp.listing_id || sp.uuid || sp.address || JSON.stringify(sp)) === String(id));
                if (!p) return null;
                const thumb = (p.photos && p.photos[0]) || p.image || (p.images && p.images[0]) || '/default-property.jpg';
                return (
                  <img key={id} src={thumb} alt={p.address || 'property'} className="w-16 h-12 rounded-md object-cover" loading="lazy" />
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={openCompareModal} className="px-3 py-2 bg-teal-500 text-white rounded-md">Compare</button>
              <button onClick={clearCompare} className="px-2 py-2 text-gray-500">Clear</button>
            </div>
          </div>
        )}

        {/* Compare modal */}
        <CompareModal
          open={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          properties={savedProperties.filter(sp => compareIds.includes(String(sp.id || sp.mlsId || sp.listing_id || sp.uuid || sp.address || JSON.stringify(sp))))}
          allSelectedIds={compareIds}
        />
         </div>
     </Layout>
   );
 }

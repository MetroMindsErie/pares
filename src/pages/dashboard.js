import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useAuth } from '../context/auth-context';
import WelcomeBanner from '../components/Dashboard/WelcomeBanner';
import StatsCard from '../components/Dashboard/StatsCard';
import RecentActivity from '../components/Dashboard/RecentActivity';
import supabase from '../lib/supabase-setup';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { checkFacebookConnection } from '../services/facebookService';
import { AIAssistantPanel } from '../components/AIAssistantPanel';
import { getUserActivity } from '../utils/activityStorage';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth(); // ensure proper destructure
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
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

  function formatTime(ts) {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return '';
    }
  }

  function buildActivityKey(prefix, id) {
    return `${prefix}:${String(id || '')}`;
  }

  // Fetch activities (saved properties + swipe actions) and merge with local AI activity.
  useEffect(() => {
    const fetchRecentActivities = async () => {
      if (!userId) return;

      setActivitiesLoading(true);

      try {
        const [{ data: savedProps, error: savedErr }, { data: swipes, error: swipesErr }] = await Promise.all([
          supabase
          .from('saved_properties')
          .select('*')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false })
          .limit(10),
          supabase
            .from('property_swipes')
            .select('id, property_id, swipe_direction, property_data, created_at')
            .eq('user_id', userId)
            .in('swipe_direction', ['right', 'up'])
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        if (savedErr) throw savedErr;
        if (swipesErr) throw swipesErr;

        const savedItems = (savedProps || []).map((prop) => ({
          key: buildActivityKey('saved', prop.id || prop.listing_key || prop.address),
          type: 'property_saved',
          icon: '❤️',
          title: `Saved: ${prop.address || 'Property'}`,
          time: formatTime(prop.saved_at),
          ts: Date.parse(prop.saved_at),
          href: prop.listing_key ? `/property/${encodeURIComponent(String(prop.listing_key))}` : null,
        }));

        const swipeItems = (swipes || []).map((s) => {
          const dir = String(s.swipe_direction || '');
          const icon = dir === 'up' ? '🤝' : '❤️';
          const label = dir === 'up' ? 'Connected' : 'Liked';
          const addr = s?.property_data?.UnparsedAddress || s?.property_data?.address || s?.property_data?.StreetAddress || '';
          const listingKey = s?.property_data?.ListingKey || s?.property_id;
          return {
            key: buildActivityKey('swipe', s.id || listingKey),
            type: dir === 'up' ? 'property_connection' : 'property_like',
            icon,
            title: `${label}: ${addr || 'Property'}`,
            time: formatTime(s.created_at),
            ts: Date.parse(s.created_at),
            href: listingKey ? `/property/${encodeURIComponent(String(listingKey))}` : null,
          };
        });

        const aiItems = (getUserActivity(userId) || []).map((it) => {
          const t = String(it.type || '');
          const icon = t === 'cma_pricing' ? '💰' : t === 'ai_search' ? '🤖' : '•';
          const subtitle = t === 'cma_pricing'
            ? [it?.meta?.county, it?.meta?.zip].filter(Boolean).join(' • ')
            : null;
          return {
            key: buildActivityKey('ai', `${it.ts}:${t}`),
            type: t,
            icon,
            title: it.title || 'AI activity',
            time: formatTime(it.ts),
            ts: it.ts,
            subtitle,
            href: null,
          };
        });

        const merged = [...aiItems, ...swipeItems, ...savedItems]
          .filter((a) => Number.isFinite(a.ts))
          .sort((a, b) => (b.ts || 0) - (a.ts || 0))
          .slice(0, 12);

        setActivities(merged);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setActivities([]);
      } finally {
        setActivitiesLoading(false);
      }
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

  // Fetch saved properties (kept for stats card count)
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

  // Remove isLoading (was undefined). Use authLoading only.
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-700">
          Please log in to view your dashboard.
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>User Dashboard | Personalized Property Suggestions</title>
      </Head>
      <Layout>
        <main className="pt-16 min-h-screen bg-gray-50 dark:bg-gray-950">
          {/* Hero section */}
          <div
            className="relative bg-cover bg-center h-40 sm:h-48 md:h-64"
            style={{
              backgroundImage: 'url("/paresfinal.jpg")',
              backgroundBlendMode: 'overlay',
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          >
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
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 mb-6 sm:mb-8">
              <StatsCard
                title="Saved Properties"
                value={savedProperties.length.toString()}
                change={0}
                icon="heart"
              />
              <StatsCard
                title="Liked"
                value={String(propertyStats.liked || 0)}
                change={0}
                icon="heart"
              />
              <StatsCard
                title="Connections"
                value={String(propertyStats.connections || 0)}
                change={0}
                icon="handshake"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-6 sm:mb-8">
              <div className="md:col-span-2">
                <AIAssistantPanel />
              </div>
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          sessionStorage.removeItem('searchResults');
                          sessionStorage.removeItem('searchParams');
                          localStorage.removeItem('lastSearchResults');
                          localStorage.removeItem('lastSearchParams');
                          sessionStorage.setItem('scrollToTop', 'true');
                        }
                        window.location.href = '/';
                      }}
                      className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                      Browse Properties
                    </button>
                    <button
                      onClick={() => router.push('/saved-properties')}
                      className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                    >
                      View Saved Properties ({savedProperties.length})
                    </button>
                    <button
                      onClick={() => router.push('/create-profile')}
                      className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                    >
                      Profile Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </Layout>
    </>
   );
 }

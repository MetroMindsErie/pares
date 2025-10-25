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

export default function DashboardPage() {
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
      <div className="relative bg-cover bg-center h-48 md:h-64" 
           style={{ 
             backgroundImage: 'url("/dashboard-hero.jpg")',
             backgroundBlendMode: 'overlay',
             backgroundColor: 'rgba(0,0,0,0.5)'
           }}>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          {profile && (
            <div className="flex items-center gap-6">
              <img
                src={getProfilePicture()}
                alt={`${profile.first_name}'s profile`}
                className="h-20 w-20 rounded-full border-4 border-white/20 shadow-xl object-cover"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  e.target.src = '/default-avatar.png';
                }}
              />
              <div className="text-white">
                <h1 className="text-3xl font-bold">
                  Welcome back, {profile.first_name}!
                </h1>
                <p className="mt-2 text-blue-100">
                  Here's what's happening with your saved properties
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform duration-200">
            <StatsCard
              title="Saved Properties"
              value={savedProperties.length.toString()}
              change={0}
              icon="heart"
            />
          </div>
        </div>

        {/* Quick Actions and Recent Activity */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-lg p-6 border border-blue-100">
            <h3 className="text-lg font-semibold mb-4 text-blue-900">Quick Actions</h3>
            <div className="space-y-3">
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
                className="w-full text-left px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-3"
              >
                <span className="p-2 bg-blue-500 rounded-full">🏠</span>
                Browse Properties
              </button>
              <button
                onClick={() => router.push('/saved-properties')}
                className="w-full text-left px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-3"
              >
                <span className="p-2 bg-green-500 rounded-full">❤️</span>
                View Saved Properties ({savedProperties.length})
              </button>
              <button
                onClick={() => router.push('/create-profile')}
                className="w-full text-left px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-3"
              >
                <span className="p-2 bg-gray-300 rounded-full">⚙️</span>
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

        {/* Saved Properties Section */}
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-lg p-6 border border-blue-100 mb-8">
          <SavedProperties 
            properties={savedProperties}
            isLoading={savedPropertiesLoading}
            error={savedPropertiesError}
          />
        </div>
      </div>
    </Layout>
  );
}

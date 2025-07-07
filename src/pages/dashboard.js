import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/auth-context';
import WelcomeBanner from '../components/Dashboard/WelcomeBanner';
import StatsCard from '../components/Dashboard/StatsCard';
import RecentActivity from '../components/Dashboard/RecentActivity';
import supabase from '../lib/supabase-setup';
import { useRouter } from 'next/router';
// Change the import path to use the proper Reels component
import Reels from '../components/Reels';
import Layout from '../components/Layout';
import { checkFacebookConnection } from '../services/facebookService';

export default function DashboardPage() {
  const { user, isAuthenticated, loading, authChecked } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [hasFacebookConnection, setHasFacebookConnection] = useState(false);
  const [userId, setUserId] = useState(null);
  const [fbConnectionChecked, setFbConnectionChecked] = useState(false);
  const [propertyStats, setPropertyStats] = useState({ liked: 0, connections: 0 });
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
        console.log("Dashboard: Setting user ID from auth context:", user.id);
        setUserId(user.id);
        return;
      }

      // If not in auth context, try from session once
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUserId = data?.session?.user?.id;
        
        if (sessionUserId) {
          console.log("Dashboard: Setting user ID from session:", sessionUserId);
          setUserId(sessionUserId);
          return;
        } else {
          console.log("Dashboard: No user ID found in session");
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
        console.log("Dashboard: Fetching profile for user:", userId);
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
          console.log("Dashboard: Checking Facebook connection for user:", userId);
          checkFacebookConnection(userId)
            .then(fbConnected => {
              console.log("Dashboard: Facebook connection check result:", fbConnected);
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

  // Fetch activities only once - simplified to avoid loops
  useEffect(() => {
    if (activitiesFetchedRef.current) return;
    activitiesFetchedRef.current = true;
    
    // Mock data for now
    setActivities([
      { title: 'Profile updated', time: '2 hours ago', icon: '📝' },
      { title: 'New connection added', time: '1 day ago', icon: '🤝' }
    ]);
  }, []);

  // Fetch property stats
  useEffect(() => {
    const fetchPropertyStats = async () => {
      if (!userId) return;

      try {
        console.log('Fetching property stats for user:', userId);
        const { getSwipeStats } = await import('../utils/swipeUtils');
        const stats = await getSwipeStats(userId);
        console.log('Dashboard received stats:', stats);
        
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

  // Simplified loading check
  const isLoading = loading || (localLoading && !profile);

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {profile && <WelcomeBanner profile={profile} />}
        
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatsCard
            title="Profile Views"
            value="123"
            change={12}
            icon="eye"
          />
          <StatsCard
            title="Saved Properties"
            value={propertyStats.liked.toString()}
            change={0}
            icon="heart"
          />
          <StatsCard
            title="Connection Requests"
            value={propertyStats.connections.toString()}
            change={0}
            icon="phone"
          />
        </div>

        {/* Add Quick Actions */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/swipe')}
                className="w-full text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                🏠 Browse Properties
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="w-full text-left px-4 py-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                ❤️ View Saved Properties ({propertyStats.liked})
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="w-full text-left px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                📞 Connection Requests ({propertyStats.connections})
              </button>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <RecentActivity activities={activities} />
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Facebook Reels</h2>
          <p className="text-gray-600 mb-6">
            {hasFacebookConnection 
              ? 'Here are your real estate reels from Facebook.' 
              : 'Connect your Facebook account to display and manage your real estate reels.'}
          </p>
          
          {/* Pass all necessary props to the Reels component */}
          <div className="bg-gray-50 rounded-lg">
            <Reels 
              userId={userId} 
              hasFacebookConnection={hasFacebookConnection}
              autofetch={true}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

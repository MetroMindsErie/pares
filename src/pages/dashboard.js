import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import WelcomeBanner from '../components/Dashboard/WelcomeBanner';
import StatsCard from '../components/Dashboard/StatsCard';
import RecentActivity from '../components/Dashboard/RecentActivity';
import supabase from '../lib/supabase-setup';
import { useRouter } from 'next/router';
import Reels from '../components/Reels';
import Layout from '../components/Layout';
import { checkFacebookConnection } from '../services/facebookService';

export default function DashboardPage() {
  const { user, isAuthenticated, loading, authChecked } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [hasFacebookConnection, setHasFacebookConnection] = useState(false);
  const [userId, setUserId] = useState(null); // Add dedicated state for userId
  const router = useRouter();

  // Get user ID from multiple sources to ensure we have one
  useEffect(() => {
    const getUserId = async () => {
      // First try from auth context
      if (user?.id) {
        console.log("Setting user ID from auth context:", user.id);
        setUserId(user.id);
        return;
      }

      // If not in auth context, try from session
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUserId = data?.session?.user?.id;
        
        if (sessionUserId) {
          console.log("Setting user ID from session:", sessionUserId);
          setUserId(sessionUserId);
          return;
        }
      } catch (err) {
        console.error('Error getting session:', err);
      }
      
      // No user ID available
      console.warn("No user ID available from auth context or session");
    };
    
    getUserId();
  }, [user]);

  // Improved redirect logic with session verification and better loading state
  useEffect(() => {
    const verifySession = async () => {
      if (!loading && authChecked && !isAuthenticated) {
        console.log('No authentication detected in dashboard, checking session directly');
        
        try {
          // Double-check session before redirecting
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            console.log('Found session despite auth context reporting not authenticated');
            return; // Don't redirect if we have a session
          }
          
          console.log('No session found, redirecting to login');
          router.replace('/login?redirect=/dashboard');
        } catch (err) {
          console.error('Session verification error:', err);
        }
      }
    };
    
    verifySession();
  }, [authChecked, isAuthenticated, loading, router]);

  // Debug logging
  useEffect(() => {
    console.log('Dashboard auth state:', { 
      isAuthenticated, 
      loading, 
      authChecked,
      hasUser: !!user,
      userId: user?.id,
      storedUserId: userId
    });
  }, [isAuthenticated, loading, authChecked, user, userId]);

  // Fetch user profile with enhanced error handling and retries
  useEffect(() => {
    const fetchUserProfile = async () => {
      // Don't try to fetch if we don't have a user ID
      if (!userId) {
        console.log("Waiting for user ID before fetching profile...");
        return;
      }
      
      setLocalLoading(true);
      let retryCount = 0;
      const MAX_RETRIES = 3;
      
      const attemptFetch = async () => {
        try {
          console.log('Fetching profile for user:', userId);
          
          // Also check for Facebook connection
          const fbConnected = await checkFacebookConnection(userId);
          setHasFacebookConnection(fbConnected);
          console.log('User has Facebook connection:', fbConnected);
          
          // Fetch user profile with additional debug
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

          console.log('Fetched profile with these fields:', Object.keys(data));
          console.log('Profile picture URL from database:', data.profile_picture_url);
          
          // If no profile picture in database but user has one in metadata, use that
          if (!data.profile_picture_url && user?.user_metadata?.avatar_url) {
            console.log('Using avatar URL from auth metadata:', user.user_metadata.avatar_url);
            
            // Update the database with this URL
            const { error: updateError } = await supabase
              .from('users')
              .update({ 
                profile_picture_url: user.user_metadata.avatar_url,
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);
            
            if (updateError) {
              console.error('Error updating profile picture:', updateError);
            } else {
              // Update local data copy with picture URL
              data.profile_picture_url = user.user_metadata.avatar_url;
            }
          }
          
          setProfile(data);
          setLocalLoading(false);
        } catch (err) {
          console.error('Profile fetch error:', err);
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Error fetching profile, retrying (${retryCount}/${MAX_RETRIES})...`);
            setTimeout(attemptFetch, 1000); // Retry after 1 second
          } else {
            console.log('Max retries reached, giving up');
            setLocalLoading(false);
          }
        }
      };

      attemptFetch();
    };

    fetchUserProfile();
  }, [userId, user]);

  const fetchRecentActivities = async () => {
    // Implement your activity fetching logic here
    // For now, using mock data
    setActivities([
      { title: 'Profile updated', time: '2 hours ago', icon: '📝' },
      { title: 'New connection added', time: '1 day ago', icon: '🤝' }
    ]);
  };

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  if (loading || localLoading || !userId) {
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
          title="Connections"
          value="45"
          change={5}
          icon="handshake"
        />
        {/* Add more StatsCard components as needed */}
      </div>

      <div className="mt-8">
        <RecentActivity activities={activities} />
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Facebook Reels</h2>
        <p className="text-gray-600 mb-6">
          {hasFacebookConnection 
            ? 'Here are your real estate reels from Facebook.' 
            : 'Connect your Facebook account to display and manage your real estate reels.'}
        </p>
        
        {/* Reels component with userId and connection status passed explicitly */}
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

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import WelcomeBanner from '../components/Dashboard/WelcomeBanner';
import StatsCard from '../components/Dashboard/StatsCard';
import RecentActivity from '../components/Dashboard/RecentActivity';
import supabase from '../lib/supabase-setup';
import { useRouter } from 'next/router';
import Reels from '../components/Reels';

export default function DashboardPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        console.log('Fetched profile:', data); // Debug log
        setProfile(data);
      } catch (err) {
        console.error('Error:', err);
      }
    };

    fetchUserProfile();
  }, [user]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
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
          Connect your Facebook account to display and manage your real estate reels.
        </p>
        
        {/* Reels component */}
        <div className="bg-gray-50 rounded-lg">
          <Reels />
        </div>
      </div>
    </div>
  );
}

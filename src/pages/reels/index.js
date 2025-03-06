import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ReelsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Use client-side data fetching instead of server-side rendering
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const fetchReels = async () => {
      try {
        // Get user from local storage or context
        const userData = JSON.parse(localStorage.getItem('user'));
        
        if (!userData?.id) {
          router.push('/login');
          return;
        }
        
        // Redirect to client fetch page that doesn't use SSR
        router.push(`/dashboard/reels`);
      } catch (error) {
        console.error('Error fetching reels:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReels();
  }, [router]);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Reels</h1>
      {loading ? (
        <p>Loading reels...</p>
      ) : (
        <p>Redirecting to dashboard...</p>
      )}
    </div>
  );
}

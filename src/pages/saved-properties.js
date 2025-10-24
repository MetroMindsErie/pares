import { useState, useEffect } from 'react';
import { useAuth } from '../context/auth-context';
import supabase from '../lib/supabase-setup';
import Layout from '../components/Layout';
import Link from 'next/link';
import Image from 'next/image';

export default function SavedProperties() {
  const { user } = useAuth();
  const [savedProperties, setSavedProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSavedProperties = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('saved_properties')
          .select('*')
          .eq('user_id', user.id)
          .order('saved_at', { ascending: false });

        if (error) throw error;
        setSavedProperties(data || []);
      } catch (err) {
        console.error('Error fetching saved properties:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedProperties();
  }, [user?.id]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex justify-center items-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Saved Properties</h1>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {savedProperties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No saved properties yet.</p>
            <Link 
              href="/swipe" 
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Properties
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedProperties.map((property) => (
              <Link 
                href={`/property/${property.listing_key}`}
                key={property.id}
                className="block"
              >
                <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border overflow-hidden">
                  <div className="relative h-48 w-full">
                    <Image
                      src={property.image_url || '/fallback-property.jpg'}
                      alt={property.address}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      priority={false}
                      onError={(e) => {
                        e.target.src = '/fallback-property.jpg';
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-lg mb-2">{property.address}</h3>
                    <p className="text-2xl font-bold text-blue-600">
                      ${property.price?.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Saved on {new Date(property.saved_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

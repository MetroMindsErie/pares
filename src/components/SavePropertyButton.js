"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '../context/auth-context';
import supabase from '../lib/supabase-setup';

const SavePropertyButton = ({ propertyId, listingKey, address, price, imageUrl }) => {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if property is already saved when component mounts or when user/propertyId changes
  useEffect(() => {
    let mounted = true;
    const checkSaved = async () => {
      if (!user?.id || !propertyId) return;
      try {
        // maybeSingle avoids throwing if no row is found
        const { data, error: fetchError } = await supabase
          .from('saved_properties')
          .select('*')
          .eq('user_id', user.id)
          .eq('property_id', propertyId)
          .maybeSingle();

        if (fetchError) {
          console.error('Error checking saved status:', fetchError);
          return;
        }
        if (!mounted) return;
        setIsSaved(!!data);
      } catch (err) {
        console.error('Error checking saved status:', err);
      }
    };

    checkSaved();
    return () => { mounted = false; };
  }, [user?.id, propertyId]);

  const handleSave = async () => {
    if (!user) {
      setError('Please login to save properties');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isSaved) {
        // Remove from saved properties
        const { error: deleteError } = await supabase
          .from('saved_properties')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', propertyId);

        if (deleteError) throw deleteError;
        setIsSaved(false);
      } else {
        // Add to saved properties
        const { error: insertError } = await supabase
          .from('saved_properties')
          .insert({
            user_id: user.id,
            property_id: propertyId,
            listing_key: listingKey,
            address: address,
            price: price,
            image_url: imageUrl || '/fallback-property.jpg', // Add image URL
            saved_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error saving property:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleSave}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          isSaved
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="text-xl">
          {isSaved ? '❤️' : '🤍'}
        </span>
        {isSaved ? 'Saved' : 'Save Property'}
      </button>
      
      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-red-100 text-red-700 text-sm p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default SavePropertyButton;

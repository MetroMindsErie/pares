import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import PropertyCard from './PropertyCard';
import LoadingCard from './LoadingCard';
import EmptyState from './EmptyState';
import { useAuth } from '../../context/auth-context';

const PropertySwiper = ({ 
  properties = [], 
  onLoadMore, 
  loading = false, 
  hasMore = false,
  onPropertyAction 
}) => {
  const { user } = useAuth();
  const [currentCards, setCurrentCards] = useState([]);
  const [swipedProperties, setSwipedProperties] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  // Initialize cards when properties change
  useEffect(() => {
    if (properties.length > 0) {
      const filtered = properties.filter(
        property => !swipedProperties.has(property.ListingKey)
      );
      setCurrentCards(filtered.slice(0, 3)); // Show max 3 cards at once
    }
  }, [properties, swipedProperties]);

  // Load user's swipe history from localStorage if no user
  useEffect(() => {
    if (!user?.id) {
      try {
        const localSwipes = JSON.parse(localStorage.getItem('swipeActions') || '[]');
        const swipedIds = localSwipes.map(swipe => swipe.propertyId);
        setSwipedProperties(new Set(swipedIds));
      } catch (error) {
        console.error('Failed to load local swipe history:', error);
      }
    }
  }, [user?.id]);

  const handleSwipe = useCallback(async (property, direction) => {
    const swipeAction = {
      propertyId: property.ListingKey,
      direction,
      timestamp: new Date().toISOString(),
      propertyData: property
    };

    // Save swipe action
    try {
      if (user?.id) {
        // For authenticated users, you could save to Supabase here
        // await saveSwipeAction(user.id, swipeAction);
        console.log('Would save to Supabase for user:', user.id);
      } else {
        // Save to localStorage for non-authenticated users
        const localSwipes = JSON.parse(localStorage.getItem('swipeActions') || '[]');
        localSwipes.push(swipeAction);
        localStorage.setItem('swipeActions', JSON.stringify(localSwipes));
      }

      // Update swiped properties set
      setSwipedProperties(prev => new Set([...prev, property.ListingKey]));

      // Call external handler if provided
      if (onPropertyAction) {
        onPropertyAction(property, direction);
      }

    } catch (error) {
      console.error('Failed to save swipe action:', error);
    }

    // Remove the swiped card and advance to next
    setCurrentCards(prev => {
      const newCards = prev.filter(card => card.ListingKey !== property.ListingKey);
      
      // Add next property if available
      const nextIndex = currentIndex + prev.length;
      if (nextIndex < properties.length) {
        const nextProperty = properties[nextIndex];
        if (!swipedProperties.has(nextProperty.ListingKey)) {
          newCards.push(nextProperty);
        }
      }
      
      return newCards;
    });

    setCurrentIndex(prev => prev + 1);

    // Load more properties if running low
    if (currentIndex >= properties.length - 5 && hasMore && !loading) {
      onLoadMore?.();
    }
  }, [user?.id, currentIndex, properties, swipedProperties, hasMore, loading, onLoadMore, onPropertyAction]);

  const handleKeyPress = useCallback((event) => {
    if (currentCards.length === 0) return;

    const topCard = currentCards[0];
    
    switch (event.key) {
      case 'ArrowLeft':
        handleSwipe(topCard, 'left');
        break;
      case 'ArrowRight':
        handleSwipe(topCard, 'right');
        break;
      case 'ArrowUp':
        handleSwipe(topCard, 'up');
        break;
      case 'ArrowDown':
        handleSwipe(topCard, 'down');
        break;
    }
  }, [currentCards, handleSwipe]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  if (loading && currentCards.length === 0) {
    return (
      <div className="relative w-full h-[600px] max-w-md mx-auto">
        <LoadingCard />
      </div>
    );
  }

  if (currentCards.length === 0 && !loading) {
    return (
      <div className="relative w-full h-[600px] max-w-md mx-auto">
        <EmptyState onReset={() => {
          setSwipedProperties(new Set());
          setCurrentIndex(0);
        }} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] max-w-md mx-auto">
      <AnimatePresence>
        {currentCards.map((property, index) => (
          <PropertyCard
            key={property.ListingKey}
            property={property}
            onSwipe={handleSwipe}
            isTop={index === 0}
          />
        ))}
      </AnimatePresence>

      {/* Instructions */}
      <div className="absolute -bottom-16 left-0 right-0 text-center">
        <p className="text-sm text-gray-500 mb-2">
          Swipe or use arrow keys
        </p>
        <div className="flex justify-center gap-4 text-xs text-gray-400">
          <span>← Pass</span>
          <span>→ Like</span>
          <span>↑ Connect</span>
          <span>↓ Hide</span>
        </div>
      </div>
    </div>
  );
};

export default PropertySwiper;

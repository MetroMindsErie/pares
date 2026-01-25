import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import PropertyCard from './PropertyCard';
import LoadingCard from './LoadingCard';
import EmptyState from './EmptyState';
import { useAuth } from '../../context/auth-context';
import { saveSwipeAction, getSwipedProperties } from '../../utils/swipeUtils';

const PropertySwiper = ({ 
  properties = [], 
  onLoadMore, 
  loading = false, 
  hasMore = false,
  onPropertyAction,
  isMobile = false
}) => {
  const { user } = useAuth();
  const [currentCards, setCurrentCards] = useState([]);
  const [swipedProperties, setSwipedProperties] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardKey, setCardKey] = useState(0); // Add unique key counter

  // Initialize cards when properties change
  useEffect(() => {
    if (properties.length > 0) {
      const filtered = properties.filter(
        property => property.ListingKey && !swipedProperties.has(property.ListingKey)
      );
      
      // Add unique keys to prevent duplicate key errors
      const cardsWithKeys = filtered.slice(0, 3).map((property, index) => ({
        ...property,
        _cardKey: `${property.ListingKey}-${Date.now()}-${index}`
      }));
      
      setCurrentCards(cardsWithKeys);
    }
  }, [properties, swipedProperties]);

  // Load user's swipe history
  useEffect(() => {
    const loadSwipeHistory = async () => {
      if (user?.id) {
        try {
          const swipedIds = await getSwipedProperties(user.id);
          setSwipedProperties(new Set(swipedIds));
        } catch (error) {
          console.error('Failed to load swipe history:', error);
        }
      } else {
        try {
          const localSwipes = JSON.parse(localStorage.getItem('swipeActions') || '[]');
          const swipedIds = localSwipes.map(swipe => swipe.propertyId);
          setSwipedProperties(new Set(swipedIds));
        } catch (error) {
          console.error('Failed to load local swipe history:', error);
        }
      }
    };

    loadSwipeHistory();
  }, [user?.id]);

  const handleSwipe = useCallback(async (property, direction) => {
    ('Handling swipe:', { 
      property: property.ListingKey, 
      direction, 
      userId: user?.id,
      timestamp: new Date().toISOString()
    });
    
    if (!property.ListingKey) {
      console.error('Property missing ListingKey:', property);
      return;
    }
    
    // Validate that we have essential property data
    if (!property.UnparsedAddress && !property.ListPrice) {
      console.warn('Property missing essential data, saving swipe without property_data');
    }
    
    const swipeAction = {
      propertyId: property.ListingKey,
      direction,
      timestamp: new Date().toISOString(),
      propertyData: property
    };

    // Save swipe action
    try {
      if (user?.id) {

        await saveSwipeAction(user.id, swipeAction);

      } else {

        // For localStorage, also clean the data to keep it manageable
        const cleanedAction = {
          ...swipeAction,
          propertyData: {
            ListingKey: property.ListingKey,
            UnparsedAddress: property.UnparsedAddress,
            ListPrice: property.ListPrice,
            BedroomsTotal: property.BedroomsTotal,
            BathroomsTotalInteger: property.BathroomsTotalInteger,
            LivingArea: property.LivingArea,
            media: property.media
          }
        };
        
        const localSwipes = JSON.parse(localStorage.getItem('swipeActions') || '[]');
        localSwipes.push(cleanedAction);
        
        // Keep only the last 100 swipes in localStorage to prevent it from growing too large
        if (localSwipes.length > 100) {
          localSwipes.splice(0, localSwipes.length - 100);
        }
        
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
      // Still allow the UI to update even if save fails
    }

    // Remove the swiped card and advance to next
    setCurrentCards(prev => {
      const newCards = prev.filter(card => card.ListingKey !== property.ListingKey);
      
      // Add next property if available
      const nextIndex = currentIndex + prev.length;
      if (nextIndex < properties.length) {
        const nextProperty = properties[nextIndex];
        if (nextProperty.ListingKey && !swipedProperties.has(nextProperty.ListingKey)) {
          // Add unique key to prevent duplicate key errors
          const cardWithKey = {
            ...nextProperty,
            _cardKey: `${nextProperty.ListingKey}-${Date.now()}-${nextIndex}`
          };
          newCards.push(cardWithKey);
        }
      }
      
      return newCards;
    });

    setCurrentIndex(prev => prev + 1);
    setCardKey(prev => prev + 1); // Increment unique key counter

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
      <div className={`relative w-full ${isMobile ? 'h-[70vh]' : 'h-[600px]'} max-w-md sm:max-w-xl mx-auto px-3 sm:px-0`}>
        <LoadingCard />
      </div>
    );
  }

  if (currentCards.length === 0 && !loading) {
    return (
      <div className={`relative w-full ${isMobile ? 'h-[70vh]' : 'h-[600px]'} max-w-md sm:max-w-xl mx-auto px-3 sm:px-0`}>
        <EmptyState onReset={() => {
          setSwipedProperties(new Set());
          setCurrentIndex(0);
        }} />
      </div>
    );
  }

  return (
    <div className={`relative w-full ${isMobile ? 'h-[70vh]' : 'h-[600px]'} max-w-md sm:max-w-xl mx-auto px-3 sm:px-0`}>
      <AnimatePresence>
        {currentCards.map((property, index) => (
          <PropertyCard
            key={property._cardKey || `${property.ListingKey}-${index}`}
            property={property}
            onSwipe={handleSwipe}
            isTop={index === 0}
            isMobile={isMobile}
          />
        ))}
      </AnimatePresence>

      {/* Instructions - Adjusted for Mobile */}
      <div className={`absolute ${isMobile ? '-bottom-8' : '-bottom-16'} left-0 right-0 text-center`}>
        {!isMobile && (
          <>
            <p className="text-sm text-gray-500 mb-2">
              Swipe or use arrow keys
            </p>
            <div className="flex justify-center gap-4 text-xs text-gray-400">
              <span>← Pass</span>
              <span>→ Like</span>
              <span>↑ Connect</span>
              <span>↓ Hide</span>
            </div>
          </>
        )}
        {isMobile && (
          <p className="text-xs text-gray-400">
            Swipe on the image to interact with properties
          </p>
        )}
      </div>
    </div>
  );
};

export default PropertySwiper;

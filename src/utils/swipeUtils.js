import supabase from '../lib/supabase-setup';

// Session cache for properties
let sessionCache = {
  swipedProperties: new Set(),
  likedProperties: [],
  connectionProperties: [],
  lastUpdated: null
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Save a swipe action to the database and update session cache
 */
export const saveSwipeAction = async (userId, swipeAction) => {
  try {
    console.log('Saving swipe action:', { userId, swipeAction });
    
    // Add to session cache immediately with proper direction handling
    sessionCache.swipedProperties.add(swipeAction.propertyId);
    
    // Remove from other categories first to avoid duplicates
    sessionCache.likedProperties = sessionCache.likedProperties.filter(
      prop => prop.ListingKey !== swipeAction.propertyId
    );
    sessionCache.connectionProperties = sessionCache.connectionProperties.filter(
      prop => prop.ListingKey !== swipeAction.propertyId
    );
    
    // Add to appropriate category based on direction
    if (swipeAction.direction === 'right') {
      sessionCache.likedProperties.unshift({
        ...swipeAction.propertyData,
        swipe_date: swipeAction.timestamp,
        ListingKey: swipeAction.propertyData.ListingKey || swipeAction.propertyId
      });
      console.log('Added to liked properties cache');
    } else if (swipeAction.direction === 'up') {
      sessionCache.connectionProperties.unshift({
        ...swipeAction.propertyData,
        swipe_date: swipeAction.timestamp,
        ListingKey: swipeAction.propertyData.ListingKey || swipeAction.propertyId
      });
      console.log('Added to connection properties cache');
    }
    
    sessionCache.lastUpdated = Date.now();
    
    // First check if a swipe already exists for this user-property combination
    const { data: existingSwipe, error: checkError } = await supabase
      .from('property_swipes')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', swipeAction.propertyId)
      .maybeSingle();

    if (checkError) {
      console.error('Check error:', checkError);
      throw checkError;
    }

    if (existingSwipe) {
      console.log('Updating existing swipe:', existingSwipe.id);
      // Update existing swipe
      const { data, error } = await supabase
        .from('property_swipes')
        .update({
          swipe_direction: swipeAction.direction,
          property_data: swipeAction.propertyData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSwipe.id)
        .select();

      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      console.log('Swipe updated successfully:', data);
      return data;
    } else {
      console.log('Creating new swipe');
      // Create new swipe
      const { data, error } = await supabase
        .from('property_swipes')
        .insert({
          user_id: userId,
          property_id: swipeAction.propertyId,
          swipe_direction: swipeAction.direction,
          property_data: swipeAction.propertyData,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      console.log('Swipe created successfully:', data);
      return data;
    }
  } catch (error) {
    console.error('Error saving swipe action:', error);
    throw error;
  }
};

/**
 * Get all swiped property IDs for a user (with session cache)
 */
export const getSwipedProperties = async (userId) => {
  try {
    // Check session cache first
    if (sessionCache.lastUpdated && 
        Date.now() - sessionCache.lastUpdated < CACHE_DURATION &&
        sessionCache.swipedProperties.size > 0) {
      console.log('Using cached swiped properties');
      return Array.from(sessionCache.swipedProperties);
    }

    console.log('Fetching swiped properties from database');
    const { data, error } = await supabase
      .from('property_swipes')
      .select('property_id')
      .eq('user_id', userId);

    if (error) throw error;
    
    const swipedIds = data.map(item => item.property_id);
    
    // Update session cache
    sessionCache.swipedProperties = new Set(swipedIds);
    sessionCache.lastUpdated = Date.now();
    
    return swipedIds;
  } catch (error) {
    console.error('Error fetching swiped properties:', error);
    return Array.from(sessionCache.swipedProperties);
  }
};

/**
 * Get liked properties for a user
 */
export const getLikedProperties = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('property_swipes')
      .select('property_id, property_data, created_at')
      .eq('user_id', userId)
      .eq('swipe_direction', 'right')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching liked properties:', error);
    return [];
  }
};

/**
 * Get hidden properties for a user (swiped down)
 */
export const getHiddenProperties = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('property_swipes')
      .select('property_id')
      .eq('user_id', userId)
      .eq('swipe_direction', 'down');

    if (error) throw error;
    return data.map(item => item.property_id);
  } catch (error) {
    console.error('Error fetching hidden properties:', error);
    return [];
  }
};

/**
 * Get properties marked for connection (swiped up)
 */
export const getConnectionProperties = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('property_swipes')
      .select('property_id, property_data, created_at')
      .eq('user_id', userId)
      .eq('swipe_direction', 'up')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching connection properties:', error);
    return [];
  }
};

/**
 * Remove a property from swipe history (allows re-swiping)
 */
export const removeSwipeAction = async (userId, propertyId) => {
  try {
    const { error } = await supabase
      .from('property_swipes')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing swipe action:', error);
    throw error;
  }
};

/**
 * Get swipe statistics for a user
 */
export const getSwipeStats = async (userId) => {
  try {
    console.log('Fetching swipe stats for user:', userId);
    
    const { data, error } = await supabase
      .from('property_swipes')
      .select('swipe_direction')
      .eq('user_id', userId);

    if (error) throw error;
    console.log('Raw swipe stats data:', data);

    const stats = {
      total: data.length,
      liked: data.filter(s => s.swipe_direction === 'right').length,
      passed: data.filter(s => s.swipe_direction === 'left').length,
      hidden: data.filter(s => s.swipe_direction === 'down').length,
      connections: data.filter(s => s.swipe_direction === 'up').length
    };

    console.log('Calculated stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error fetching swipe stats:', error);
    return { total: 0, liked: 0, passed: 0, hidden: 0, connections: 0 };
  }
};

/**
 * Get detailed liked properties with property data for profile display (with session cache)
 */
export const getLikedPropertiesWithData = async (userId) => {
  try {
    // Check session cache first
    if (sessionCache.lastUpdated && 
        Date.now() - sessionCache.lastUpdated < CACHE_DURATION &&
        sessionCache.likedProperties.length > 0) {
      console.log('Using cached liked properties');
      return sessionCache.likedProperties;
    }

    console.log('Fetching liked properties for user:', userId);
    
    const { data, error } = await supabase
      .from('property_swipes')
      .select('property_id, property_data, created_at')
      .eq('user_id', userId)
      .eq('swipe_direction', 'right')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching liked properties:', error);
      throw error;
    }

    console.log('Raw liked properties data:', data);
    
    if (!data || data.length === 0) {
      console.log('No liked properties found');
      return [];
    }

    const formattedProperties = data.map(item => {
      if (!item.property_data) {
        console.warn('Property data is null for:', item.property_id);
        return null;
      }
      
      return {
        ...item.property_data,
        swipe_date: item.created_at,
        ListingKey: item.property_data.ListingKey || item.property_id
      };
    }).filter(Boolean);

    // Update session cache
    sessionCache.likedProperties = formattedProperties;
    sessionCache.lastUpdated = Date.now();

    console.log('Formatted liked properties:', formattedProperties);
    return formattedProperties;
  } catch (error) {
    console.error('Error fetching liked properties with data:', error);
    return sessionCache.likedProperties;
  }
};

/**
 * Get detailed connection properties with property data for profile display (with session cache)
 */
export const getConnectionPropertiesWithData = async (userId) => {
  try {
    // Check session cache first
    if (sessionCache.lastUpdated && 
        Date.now() - sessionCache.lastUpdated < CACHE_DURATION &&
        sessionCache.connectionProperties.length > 0) {
      console.log('Using cached connection properties');
      return sessionCache.connectionProperties;
    }

    console.log('Fetching connection properties for user:', userId);
    
    const { data, error } = await supabase
      .from('property_swipes')
      .select('property_id, property_data, created_at')
      .eq('user_id', userId)
      .eq('swipe_direction', 'up')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching connection properties:', error);
      throw error;
    }

    console.log('Raw connection properties data:', data);
    
    if (!data || data.length === 0) {
      console.log('No connection properties found');
      return [];
    }

    const formattedProperties = data.map(item => {
      if (!item.property_data) {
        console.warn('Property data is null for:', item.property_id);
        return null;
      }
      
      return {
        ...item.property_data,
        swipe_date: item.created_at,
        ListingKey: item.property_data.ListingKey || item.property_id
      };
    }).filter(Boolean);

    // Update session cache
    sessionCache.connectionProperties = formattedProperties;
    sessionCache.lastUpdated = Date.now();

    console.log('Formatted connection properties:', formattedProperties);
    return formattedProperties;
  } catch (error) {
    console.error('Error fetching connection properties with data:', error);
    return sessionCache.connectionProperties;
  }
};

/**
 * Clear session cache
 */
export const clearSessionCache = () => {
  sessionCache = {
    swipedProperties: new Set(),
    likedProperties: [],
    connectionProperties: [],
    lastUpdated: null
  };
};

/**
 * Get session cache stats
 */
export const getSessionCacheStats = () => {
  return {
    swipedCount: sessionCache.swipedProperties.size,
    likedCount: sessionCache.likedProperties.length,
    connectionCount: sessionCache.connectionProperties.length,
    lastUpdated: sessionCache.lastUpdated
  };
};

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
 * Clean and minimize property data for storage
 */
const cleanPropertyData = (property) => {
  if (!property) return null;

  // Always use mediaArray for all images, and media for the first image
  let mediaArray = [];
  if (property.mediaArray && Array.isArray(property.mediaArray)) {
    mediaArray = property.mediaArray;
  } else if (property.Media && Array.isArray(property.Media)) {
    mediaArray = property.Media
      .slice()
      .sort((a, b) => {
        if (a.Order !== undefined && b.Order !== undefined) {
          return a.Order - b.Order;
        }
        return 0;
      })
      .map(mediaItem => mediaItem.MediaURL)
      .filter(url => !!url);
  } else if (property.media && Array.isArray(property.media)) {
    mediaArray = property.media;
  }

  let displayImage = mediaArray.length > 0 ? mediaArray[0] : (
    property.media && typeof property.media === 'string' ? property.media : null
  );

  // Extract only essential fields and filter out null/undefined values
  const essentialData = {
    ListingKey: property.ListingKey,
    UnparsedAddress: property.UnparsedAddress,
    ListPrice: property.ListPrice,
    BedroomsTotal: property.BedroomsTotal,
    BathroomsTotalInteger: property.BathroomsTotalInteger,
    LivingArea: property.LivingArea,
    PropertyType: property.PropertyType,
    StandardStatus: property.StandardStatus,
    City: property.City,
    StateOrProvince: property.StateOrProvince,
    PostalCode: property.PostalCode,
    // Store the first image as the primary display image
    media: displayImage,
    // Store additional images if space allows (limit to first 3 images)
    mediaArray: mediaArray,
    // Limit description to 200 chars to keep data small
    PublicRemarks: property.PublicRemarks ? 
      property.PublicRemarks.substring(0, 200) + (property.PublicRemarks.length > 200 ? '...' : '') : null
  };
  
  // Filter out null, undefined, and empty string values
  const cleanedData = Object.fromEntries(
    Object.entries(essentialData).filter(([key, value]) => 
      value !== null && 
      value !== undefined && 
      value !== '' &&
      !(typeof value === 'string' && value.trim() === '')
    )
  );
  
  // Only return data if we have essential fields and data is reasonable size
  if (cleanedData.ListingKey) {
    const dataSize = JSON.stringify(cleanedData).length;
    if (dataSize > 2048) { // 2KB limit
      console.warn('Property data still too large after cleaning:', dataSize, 'bytes');
      // Further reduce data if still too large
      return {
        ListingKey: cleanedData.ListingKey,
        UnparsedAddress: cleanedData.UnparsedAddress,
        ListPrice: cleanedData.ListPrice,
        BedroomsTotal: cleanedData.BedroomsTotal,
        BathroomsTotalInteger: cleanedData.BathroomsTotalInteger,
        LivingArea: cleanedData.LivingArea,
        media: cleanedData.media
      };
    }
    return cleanedData;
  }
  
  return null;
};

/**
 * Save a swipe action to the database and update session cache
 */
export const saveSwipeAction = async (userId, swipeAction) => {
  try {
    console.log('Saving swipe action:', { userId, propertyId: swipeAction.propertyId, direction: swipeAction.direction });
    
    // Clean and minimize property data
    const cleanedPropertyData = cleanPropertyData(swipeAction.propertyData);
    
    if (!cleanedPropertyData) {
      console.warn('No valid property data to save, skipping database save');
      return null;
    }
    
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
        ...cleanedPropertyData,
        swipe_date: swipeAction.timestamp
      });
      console.log('Added to liked properties cache');
    } else if (swipeAction.direction === 'up') {
      sessionCache.connectionProperties.unshift({
        ...cleanedPropertyData,
        swipe_date: swipeAction.timestamp
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
          property_data: cleanedPropertyData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSwipe.id)
        .select();

      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      console.log('Swipe updated successfully');
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
          property_data: cleanedPropertyData,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      console.log('Swipe created successfully');
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
      .not('property_data', 'is', null) // Filter out null property_data
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

    const formattedProperties = data
      .filter(item => item.property_data && typeof item.property_data === 'object')
      .map(item => ({
        ...item.property_data,
        swipe_date: item.created_at,
        ListingKey: item.property_data.ListingKey || item.property_id
      }));

    // Update session cache
    sessionCache.likedProperties = formattedProperties;
    sessionCache.lastUpdated = Date.now();

    console.log('Formatted liked properties:', formattedProperties);
    return formattedProperties;
  } catch (error) {
    console.error('Error fetching liked properties with data:', error);
    return sessionCache.likedProperties || [];
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
      .not('property_data', 'is', null) // Filter out null property_data
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

    const formattedProperties = data
      .filter(item => item.property_data && typeof item.property_data === 'object')
      .map(item => ({
        ...item.property_data,
        swipe_date: item.created_at,
        ListingKey: item.property_data.ListingKey || item.property_id
      }));

    // Update session cache
    sessionCache.connectionProperties = formattedProperties;
    sessionCache.lastUpdated = Date.now();

    console.log('Formatted connection properties:', formattedProperties);
    return formattedProperties;
  } catch (error) {
    console.error('Error fetching connection properties with data:', error);
    return sessionCache.connectionProperties || [];
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

/**
 * Clean up existing null property_data records (admin function)
 */
export const cleanupNullPropertyData = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('property_swipes')
      .delete()
      .eq('user_id', userId)
      .is('property_data', null);

    if (error) throw error;
    
    console.log('Cleaned up null property_data records:', data);
    return data;
  } catch (error) {
    console.error('Error cleaning up null property_data:', error);
    throw error;
  }
};

/**
 * Clean up existing oversized property_data records (admin function)
 */
export const cleanupOversizedPropertyData = async (userId) => {
  try {
    // First, get all oversized records
    const { data: oversizedRecords, error: fetchError } = await supabase
      .from('property_swipes')
      .select('id, property_id, property_data, swipe_direction')
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    let cleanedCount = 0;
    let deletedCount = 0;

    for (const record of oversizedRecords) {
      const dataSize = JSON.stringify(record.property_data).length;
      
      if (dataSize > 5120) { // 5KB
        console.log(`Processing oversized record: ${record.property_id}, size: ${dataSize} bytes`);
        
        // Try to clean the data
        const cleanedData = cleanPropertyData(record.property_data);
        
        if (cleanedData) {
          // Update with cleaned data
          const { error: updateError } = await supabase
            .from('property_swipes')
            .update({ property_data: cleanedData })
            .eq('id', record.id);
            
          if (updateError) {
            console.error('Failed to update record:', updateError);
          } else {
            cleanedCount++;
          }
        } else {
          // Delete if can't be cleaned
          const { error: deleteError } = await supabase
            .from('property_swipes')
            .delete()
            .eq('id', record.id);
            
          if (deleteError) {
            console.error('Failed to delete record:', deleteError);
          } else {
            deletedCount++;
          }
        }
      }
    }
    
    console.log(`Cleanup complete: ${cleanedCount} records cleaned, ${deletedCount} records deleted`);
    return { cleanedCount, deletedCount };
  } catch (error) {
    console.error('Error cleaning up oversized property_data:', error);
    throw error;
  }
};

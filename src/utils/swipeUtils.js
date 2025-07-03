import supabase from '../lib/supabase-setup';

/**
 * Save a swipe action to the database
 */
export const saveSwipeAction = async (userId, swipeAction) => {
  try {
    const { data, error } = await supabase
      .from('property_swipes')
      .insert({
        user_id: userId,
        property_id: swipeAction.propertyId,
        swipe_direction: swipeAction.direction,
        property_data: swipeAction.propertyData,
        created_at: swipeAction.timestamp
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving swipe action:', error);
    throw error;
  }
};

/**
 * Get all swiped property IDs for a user
 */
export const getSwipedProperties = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('property_swipes')
      .select('property_id')
      .eq('user_id', userId);

    if (error) throw error;
    return data.map(item => item.property_id);
  } catch (error) {
    console.error('Error fetching swiped properties:', error);
    return [];
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
    const { data, error } = await supabase
      .from('property_swipes')
      .select('swipe_direction')
      .eq('user_id', userId);

    if (error) throw error;

    const stats = {
      total: data.length,
      liked: data.filter(s => s.swipe_direction === 'right').length,
      passed: data.filter(s => s.swipe_direction === 'left').length,
      hidden: data.filter(s => s.swipe_direction === 'down').length,
      connections: data.filter(s => s.swipe_direction === 'up').length
    };

    return stats;
  } catch (error) {
    console.error('Error fetching swipe stats:', error);
    return { total: 0, liked: 0, passed: 0, hidden: 0, connections: 0 };
  }
};

import supabase from '../lib/supabase-setup';

/**
 * Check if a user has completed their profile
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} - Whether the user has a complete profile
 */
export const checkUserHasProfile = async (userId) => {
  try {
    // Fetch the user profile including additional fields to verify completeness
    const { data, error } = await supabase
      .from('users')
      .select('hasprofile, roles, first_name, last_name, email')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    // Enhanced profile completeness check - verify crucial fields exist
    const isProfileComplete = 
      data.hasprofile === true && 
      data.first_name && 
      data.last_name && 
      data.email;
    
    console.log('User profile check:', { 
      hasprofile: data.hasprofile,
      firstName: !!data.first_name,
      lastName: !!data.last_name,
      email: !!data.email,
      roles: data.roles,
      isComplete: isProfileComplete
    });
    
    return isProfileComplete;
  } catch (err) {
    console.error('Error in checkUserHasProfile:', err);
    return false;
  }
};

/**
 * Get user roles from the database
 * @param {string} userId - The user ID to check
 * @returns {Promise<Array>} - Array of user roles
 */
export const getUserRoles = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('roles')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    // Handle case when roles data might be null or undefined
    if (!data.roles) {
      console.warn('No roles found for user, defaulting to user role');
      return ['user'];
    }
    
    console.log('User roles from database:', data.roles);
    
    return Array.isArray(data.roles) ? data.roles : ['user'];
  } catch (err) {
    console.error('Error getting user roles:', err);
    return ['user']; // Default to user role on error
  }
};

/**
 * Handle navigation based on user profile completion status
 * @param {object} user - The user object
 * @param {function} router - Next.js router or navigation function
 */
export const handleProfileNavigation = async (user, router) => {
  if (!user || !router) return;
  
  console.log('Handling profile navigation for user:', user.id);
  
  try {
    const hasprofile = await checkUserHasProfile(user.id);
    
    if (hasprofile) {
      console.log('User has complete profile, redirecting to dashboard');
      router.push('/dashboard');
    } else {
      console.log('User needs to complete profile, redirecting to create-profile');
      router.push('/create-profile');
    }
  } catch (err) {
    console.error('Navigation error:', err);
    // Default to dashboard on error - NEVER redirect to login
    router.push('/dashboard');
  }
};

/**
 * Check if user is authenticated and redirect accordingly
 * @param {object} user - The user object
 * @param {function} router - Next.js router or navigation function
 * @param {string} destination - Where to redirect authenticated users
 * @returns {boolean} - Whether the user is authenticated
 */
export const ensureAuthenticated = (user, router, destination = '/dashboard') => {
  // If we have a user, they're authenticated - no redirect needed
  if (user) {
    return true;
  }
  
  // Don't redirect to login - this prevents loops
  // The lack of a return value (undefined) indicates no authenticated user
  return false;
};

/**
 * Ensure user profile is saved correctly with retry mechanism
 * @param {string} userId - The user ID
 * @param {object} profileData - The profile data to save
 * @returns {Promise<boolean>} - Whether save was successful
 */
export const saveUserProfile = async (userId, profileData) => {
  if (!userId || !profileData) {
    console.error('Missing userId or profileData for profile save');
    return false;
  }
  
  try {
    console.log('Saving profile for user:', userId);
    
    // Ensure hasprofile flag is set
    const dataToSave = {
      ...profileData,
      hasprofile: true,
      updated_at: new Date().toISOString()
    };
    
    // Add retry mechanism
    let attempts = 0;
    let success = false;
    let lastError = null;
    
    while (attempts < 3 && !success) {
      attempts++;
      try {
        const { error } = await supabase
          .from('users')
          .update(dataToSave)
          .eq('id', userId);
          
        if (error) {
          lastError = error;
          console.error(`Profile save attempt ${attempts} failed:`, error);
          
          // Short delay before retry
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        // Verify save worked
        const { data: verifyData, error: verifyError } = await supabase
          .from('users')
          .select('hasprofile, first_name, last_name')
          .eq('id', userId)
          .single();
          
        if (verifyError) {
          console.error('Profile save verification failed:', verifyError);
          lastError = verifyError;
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        if (verifyData.hasprofile !== true) {
          console.warn('hasprofile flag not set correctly, will retry');
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        // If we get here, save was successful
        success = true;
        console.log('Profile saved successfully on attempt', attempts);
      } catch (error) {
        lastError = error;
        console.error(`Unexpected error in profile save attempt ${attempts}:`, error);
        if (attempts === 3) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (!success && lastError) {
      console.error('All profile save attempts failed:', lastError);
      return false;
    }
    
    return success;
  } catch (error) {
    console.error('Fatal error in saveUserProfile:', error);
    return false;
  }
};

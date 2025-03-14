import supabase from '../lib/supabase-setup';

/**
 * Check if a user has completed their profile
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} - Whether the user has a complete profile
 */
export const checkUserHasProfile = async (userId) => {
  try {
    // Fetch the user profile including roles
    const { data, error } = await supabase
      .from('users')
      .select('hasprofile, roles')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    console.log('User profile check:', { hasprofile: data.hasprofile, roles: data.roles });
    
    return data.hasprofile;
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
      console.log('User has profile, redirecting to dashboard');
      router.push('/dashboard');
    } else {
      console.log('User needs to create profile, redirecting to create-profile');
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

import supabase from '../lib/supabase-setup';

/**
 * Check if a user has completed their profile
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} - Whether the user has a complete profile
 */
export const checkUserHasProfile = async (userId) => {
  if (!userId) return false;
  
  try {
    console.log('Checking profile for user ID:', userId);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')  // Select all fields to make debugging easier
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error checking user profile:', error);
      return false;
    }
    
    console.log('Profile data:', data);
    
    // Consider a profile complete if it exists at all
    // You can add more specific checks based on your data model
    const hasprofile = Boolean(data && Object.keys(data).length > 0);
    
    console.log('Has profile:', hasprofile);
    
    return hasprofile;
  } catch (err) {
    console.error('Error in checkUserHasProfile:', err);
    return false;
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
    // Default to dashboard on error
    router.push('/dashboard');
  }
};

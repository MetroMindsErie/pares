import supabase from './supabase-setup';

/**
 * Fetches a user's Facebook profile picture and saves it to the database
 * @param {Object} user - The authenticated user object with identities
 * @param {string} providerToken - Optional direct provider token from session
 * @returns {Promise<string|null>} - The URL of the profile picture or null
 */
export async function fetchAndStoreFacebookProfilePicture(user, providerToken = null) {
  if (!user || !user.id) {
    console.log("No valid user data for Facebook profile picture fetch");
    return null;
  }
  
  console.log("Attempting to fetch Facebook profile for user:", user.id);
  
  try {
    // First try to get token from user object directly
    let accessToken = null;
    let facebookId = null;
    
    // Try to get from identities if available
    if (user.identities) {
      const facebookIdentity = user.identities.find(
        identity => identity.provider === 'facebook'
      );
      
      if (facebookIdentity) {
        accessToken = facebookIdentity.access_token;
        facebookId = facebookIdentity.id;
        console.log("Found Facebook identity in user object");
      }
    }
    
    // If not found in identities, try to use the provided provider token
    if (!accessToken && providerToken) {
      console.log("Using provided provider token for Facebook");
      accessToken = providerToken;
      // For provider token, we use 'me' as the Facebook ID
      facebookId = 'me';
    }
    
    // If still no token, try to get it from our database
    if (!accessToken) {
      console.log("Attempting to fetch token from database");
      const { data: authProvider } = await supabase
        .from('auth_providers')
        .select('access_token, provider_user_id')
        .eq('user_id', user.id)
        .eq('provider', 'facebook')
        .single();
        
      if (authProvider?.access_token) {
        console.log("Found Facebook token in auth_providers table");
        accessToken = authProvider.access_token;
        facebookId = authProvider.provider_user_id || 'me';
      }
    }
    
    // Last resort - check users table
    if (!accessToken) {
      console.log("Checking users table for Facebook token");
      const { data: userData } = await supabase
        .from('users')
        .select('facebook_access_token, facebook_user_id')
        .eq('id', user.id)
        .single();
        
      if (userData?.facebook_access_token) {
        console.log("Found Facebook token in users table");
        accessToken = userData.facebook_access_token;
        facebookId = userData.facebook_user_id || 'me';
      }
    }
    
    // If we still don't have a token, we can't proceed
    if (!accessToken) {
      console.log("Could not find Facebook access token in any location");
      return null;
    }
    
    console.log(`Fetching profile picture for Facebook user: ${facebookId || 'me'}`);
    
    // Fetch profile picture from Facebook Graph API
    const response = await fetch(
      `https://graph.facebook.com/v13.0/${facebookId || 'me'}/picture?type=large&redirect=false&access_token=${accessToken}`
    );
    
    if (!response.ok) {
      throw new Error(`Facebook API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Facebook picture response:", data);
    
    if (!data.data || !data.data.url) {
      console.log("No profile picture URL in Facebook response");
      return null;
    }
    
    const pictureUrl = data.data.url;
    console.log("Retrieved Facebook profile picture URL:", pictureUrl);
    
    // Save the profile picture URL to the database
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        profile_picture_url: pictureUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
      
    if (updateError) {
      console.error("Error saving profile picture to database:", updateError);
      return null;
    }
    
    console.log("Profile picture successfully saved to database");
    return pictureUrl;
    
  } catch (error) {
    console.error("Error in fetchAndStoreFacebookProfilePicture:", error);
    return null;
  }
}

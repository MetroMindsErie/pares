import supabase from './supabase-setup';

/**
 * Fetches a profile picture from Facebook and stores it in Supabase storage
 * @param {Object} user - The user object from Supabase auth
 * @param {string} providerToken - Optional Facebook provider token for authentication
 * @returns {Promise<string>} - URL to the stored profile picture
 */
export async function fetchAndStoreFacebookProfilePicture(user, providerToken = null) {
  try {
    if (!user || !user.id) {
      throw new Error('User object is required');
    }

    // Get Facebook provider identity
    const identities = user.identities || user.user_metadata?.identities || [];
    const fbIdentity = identities.find(i => i.provider === 'facebook');

    if (!fbIdentity) {
      console.log('No Facebook identity found');
      return null;
    }

    // Try to fetch the profile picture using different methods
    const fbUserId = fbIdentity.id || fbIdentity.user_id;
    
    // Method 1: Try to use the Graph API if we have a provider token
    let imageBlob;
    let imageUrl;
    
    if (providerToken) {
      try {
        // Attempt to use FB Graph API with token
        const graphResponse = await fetch(
          `https://graph.facebook.com/v18.0/${fbUserId}/picture?type=large&access_token=${providerToken}`,
          { redirect: 'follow' }
        );
        
        if (graphResponse.ok) {
          imageBlob = await graphResponse.blob();
          console.log('Successfully fetched image from Graph API');
        }
      } catch (error) {
        console.warn('Failed to fetch with Graph API:', error);
      }
    }

    // Method 2: Try with platform-lookaside URL if we have one from the auth process
    if (!imageBlob && fbIdentity.picture) {
      try {
        // Using a proxy approach to avoid CORS
        const response = await fetch('/api/proxy-image?url=' + encodeURIComponent(fbIdentity.picture));
        if (response.ok) {
          imageBlob = await response.blob();
          console.log('Successfully fetched image via proxy');
        }
      } catch (error) {
        console.warn('Failed to fetch image via proxy:', error);
      }
    }

    // If we still don't have an image, try a default Facebook URL format
    if (!imageBlob) {
      try {
        const defaultUrl = `https://graph.facebook.com/${fbUserId}/picture?type=large`;
        const response = await fetch('/api/proxy-image?url=' + encodeURIComponent(defaultUrl));
        if (response.ok) {
          imageBlob = await response.blob();
          console.log('Successfully fetched image with default URL format');
        }
      } catch (error) {
        console.warn('Failed to fetch image with default URL:', error);
      }
    }

    // If we still couldn't get the image, return null
    if (!imageBlob) {
      console.error('Could not fetch Facebook profile picture using any method');
      return null;
    }

    // Upload image to Supabase storage
    const fileName = `profile-pictures/${user.id}/fb-profile-${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-content')
      .upload(fileName, imageBlob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL for the uploaded image
    const { data: publicUrlData } = supabase.storage
      .from('user-content')
      .getPublicUrl(fileName);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image');
    }

    console.log('Successfully stored Facebook profile picture in Supabase', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;

  } catch (error) {
    console.error('Error in fetchAndStoreFacebookProfilePicture:', error);
    return null;
  }
}

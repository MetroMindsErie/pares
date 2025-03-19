import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase admin client for data deletion
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const FACEBOOK_APP_SECRET = process.env.SUPABASE_AUTH_FACEBOOK_SECRET;

export default async function handler(req, res) {
  // Handle Facebook webhook verification during setup
  if (req.method === 'GET') {
    // Facebook sends a challenge to verify the webhook
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verify using your configured verification token
    const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;

    console.log('Webhook verification request received:', { mode, token, challenge, verifyToken });

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Facebook webhook verified successfully');
      return res.status(200).send(challenge);
    } else {
      console.error('Failed to verify Facebook webhook:', { mode, token, verifyToken });
      return res.status(403).json({ error: 'Verification failed' });
    }
  }

  // Handle actual data deletion requests
  if (req.method === 'POST') {
    try {
      // Verify the request is from Facebook
      const isValid = verifyFacebookRequest(req);
      
      if (!isValid) {
        return res.status(403).json({ error: 'Request verification failed' });
      }
      
      const data = req.body;
      
      // Check if this is a user data deletion request
      if (data?.object === 'user' && data?.entry?.[0]?.id && data?.entry?.[0]?.changed_fields?.includes('data_deletion')) {
        const facebookUserId = data.entry[0].id;
        await handleUserDataDeletion(facebookUserId);
        
        // Respond to Facebook within the required timeframe
        return res.status(200).json({ 
          url: `${process.env.NEXT_PUBLIC_APP_URL || req.headers.origin}/api/deletion-status`,
          confirmation_code: `deletion-${Date.now()}-${facebookUserId}`
        });
      }
      
      // For other webhook events, just acknowledge receipt
      return res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('Error processing deletion request:', error);
      return res.status(500).json({ error: 'Failed to process deletion request' });
    }
  }
  
  // Reject other methods
  return res.status(405).json({ error: 'Method not allowed' });
}

// Verify the request came from Facebook using signature
function verifyFacebookRequest(req) {
  if (!FACEBOOK_APP_SECRET) {
    console.error('Facebook app secret not configured');
    return false;
  }
  
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    console.error('No signature provided in the request');
    return false;
  }
  
  const elements = signature.split('=');
  const signatureHash = elements[1];
  
  const expectedHash = crypto
    .createHmac('sha256', FACEBOOK_APP_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  return signatureHash === expectedHash;
}

// Handle deletion of user data from your database
async function handleUserDataDeletion(facebookUserId) {
  try {
    console.log(`Processing data deletion request for Facebook user ID: ${facebookUserId}`);
    
    // 1. Find user(s) by Facebook ID in auth_providers table
    const { data: providers, error: providerError } = await supabase
      .from('auth_providers')
      .select('user_id')
      .eq('provider', 'facebook')
      .eq('provider_user_id', facebookUserId);
      
    if (providerError) {
      throw providerError;
    }
    
    // Also check the users table which has a direct facebook_user_id field
    const { data: directUsers, error: directUserError } = await supabase
      .from('users')
      .select('id')
      .eq('facebook_user_id', facebookUserId);
      
    if (directUserError) {
      throw directUserError;
    }
    
    // Combine user IDs from both queries (avoiding duplicates)
    let userIds = new Set(providers?.map(p => p.user_id) || []);
    directUsers?.forEach(user => userIds.add(user.id));
    
    if (userIds.size === 0) {
      console.log('No users found with this Facebook ID');
      return;
    }
    
    // 2. Delete user data for each matched user
    for (const userId of userIds) {
      console.log(`Deleting data for user ID: ${userId}`);
      
      // Delete user's content (reels, etc.)
      await supabase
        .from('reels')
        .delete()
        .eq('user_id', userId);
      
      // Check if user has a profile picture in user_profile table
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profile')
        .select('profile_picture_url')
        .eq('id', userId)
        .single();
      
      if (!profileError && userProfile?.profile_picture_url) {
        // Delete profile picture from storage if it's stored in Supabase
        try {
          const picUrl = userProfile.profile_picture_url;
          if (picUrl && picUrl.includes('user-content')) {
            // Extract path from URL if it's stored in Supabase
            const pathMatch = picUrl.match(/user-content\/([^?]+)/);
            if (pathMatch && pathMatch[1]) {
              await supabase.storage.from('user-content').remove([pathMatch[1]]);
            }
          }
        } catch (storageError) {
          console.error(`Error deleting profile picture for user ${userId}:`, storageError);
        }
      }
      
      // Delete from auth_providers
      await supabase
        .from('auth_providers')
        .delete()
        .eq('user_id', userId);
      
      // Delete from user_profile if it exists
      await supabase
        .from('user_profile')
        .delete()
        .eq('id', userId);
      
      // Delete user record itself
      await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      // Delete auth user as the final step (requires admin privileges)
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (authDeleteError) {
        console.error(`Could not delete auth user: ${authDeleteError.message}`);
      }
    }
    
    console.log(`Deletion of user data complete for Facebook ID: ${facebookUserId}`);
  } catch (error) {
    console.error('Error during user data deletion:', error);
    throw error;
  }
}

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase admin client for data deletion
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Facebook webhook verified successfully');
      return res.status(200).send(challenge);
    } else {
      console.error('Failed to verify Facebook webhook');
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
    
    if (!providers || providers.length === 0) {
      console.log('No users found with this Facebook ID');
      return;
    }
    
    // 2. Delete user data for each matched user
    for (const provider of providers) {
      const userId = provider.user_id;
      console.log(`Deleting data for user ID: ${userId}`);
      
      // Delete user's content (reels, etc.)
      await supabase
        .from('reels')
        .delete()
        .eq('user_id', userId);
      
      // Delete from auth_providers
      await supabase
        .from('auth_providers')
        .delete()
        .eq('user_id', userId);
      
      // Delete profile/avatar from storage
      try {
        // Remove user's profile pictures from storage
        const { data: storageObjects } = await supabase
          .storage
          .from('user-content')
          .list(`profile-pictures/${userId}`);
          
        if (storageObjects && storageObjects.length > 0) {
          const filePaths = storageObjects.map(obj => `profile-pictures/${userId}/${obj.name}`);
          await supabase.storage.from('user-content').remove(filePaths);
        }
      } catch (storageError) {
        console.error(`Error deleting storage for user ${userId}:`, storageError);
      }
      
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

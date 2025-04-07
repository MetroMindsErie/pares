import { createClient } from '@supabase/supabase-js';
// Fix the relative import path
import { processReelsForUser } from '../../../../scripts/process-reels';

export default async function handler(req, res) {
  console.log('API: Reels fetch endpoint called');
  
  // Initialize Supabase client with the request context
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
    {
      global: { 
        headers: { cookie: req.headers.cookie } 
      }
    }
  );

  try {
    // Get user from session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Session error:", sessionError);
      return res.status(401).json({ error: 'Session error', details: sessionError.message });
    }
    
    let userId;
    
    if (!session?.user) {
      // Try getting user from Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Create admin client to verify token
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
        );
        const { data: userData, error: verifyError } = await adminClient.auth.getUser(token);
        if (verifyError || !userData?.user) {
          console.error("Token verification failed:", verifyError);
          return res.status(401).json({ error: 'Not authenticated' });
        }
        
        userId = userData.user.id;
        console.log("User ID from auth header:", userId);
      } else {
        return res.status(401).json({ error: 'Not authenticated' });
      }
    } else {
      // Standard path - use session user
      userId = session.user.id;
      console.log("User ID from session:", userId);
    }
    
    // Get Facebook token and user ID
    const { data: authData, error: authError } = await supabase
      .from('auth_providers')
      .select('access_token, provider_user_id')
      .eq('user_id', userId)
      .eq('provider', 'facebook')
      .single();
    
    let fbToken, fbUserId;
    
    if (authError || !authData?.access_token) {
      // Fallback to users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('facebook_access_token, facebook_user_id')
        .eq('id', userId)
        .single();
        
      if (userError || !userData?.facebook_access_token) {
        return res.status(404).json({
          error: 'Facebook access token not found',
          action: 'connect_facebook'
        });
      }
      
      fbToken = userData.facebook_access_token;
      fbUserId = userData.facebook_user_id || 'me';
    } else {
      fbToken = authData.access_token;
      fbUserId = authData.provider_user_id || 'me';
    }
    
    // Now directly use the processReelsForUser function from our script
    console.log(`Calling processReelsForUser for user ${userId} with Facebook ID ${fbUserId}`);
    console.log(`Facebook token available: ${!!fbToken}`);
    console.log(`Facebook token length: ${fbToken?.length || 0}`);
    
    if (!fbToken) {
      return res.status(400).json({ 
        error: 'Missing Facebook access token',
        action: 'connect_facebook'
      });
    }
    
    const result = await processReelsForUser(userId, fbToken, fbUserId);
    
    if (!result.success) {
      console.error('Failed to process content:', result.error);
      
      // Handle token expiration specially
      if (result.errorCode === 'token_invalid') {
        return res.status(401).json({
          error: 'Facebook authorization expired',
          action: 'reconnect_facebook'
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to process Facebook content',
        details: result.error
      });
    }
    
    console.log(`Returning ${result.count} content items from Facebook`);
    
    // Return the content directly from the process function
    return res.status(200).json({
      reels: result.reels,
      count: result.count,
      source: 'facebook_api',
      realEstateCount: result.reels.length // All returned content is real estate related
    });
  } catch (error) {
    console.error('Error in reels fetch handler:', error);
    return res.status(500).json({ error: 'Failed to fetch reels', details: error.message });
  }
}



import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from auth token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }
    
    const token = authHeader.substring(7);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User auth error:', userError?.message);
      return res.status(401).json({ error: 'Authentication failed' });
    }

    console.log(`Processing reels refresh for user: ${user.id}`);
    
    // Check if user has Facebook token
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('facebook_access_token, facebook_user_id')
      .eq('id', user.id)
      .single();
      
    if (userDataError) {
      console.error('Error fetching user data:', userDataError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }
    
    // Also check auth_providers table
    const { data: providerData, error: providerError } = await supabase
      .from('auth_providers')
      .select('access_token, provider_user_id')
      .eq('user_id', user.id)
      .eq('provider', 'facebook')
      .maybeSingle();

    // If no Facebook token, return appropriate response
    if ((!userData?.facebook_access_token && !providerData?.access_token)) {
      console.log('No Facebook token found for user');
      
      // If the user authenticated via Facebook but has no token, they need to reconnect
      if (user.app_metadata?.provider === 'facebook') {
        return res.status(400).json({
          error: 'Facebook token missing',
          details: 'Your Facebook connection needs to be updated',
          action: 'reconnect_facebook'
        });
      } else {
        // User hasn't connected Facebook yet
        return res.status(400).json({
          error: 'No Facebook account connected',
          details: 'Please connect your Facebook account to access your reels',
          action: 'connect_facebook'
        });
      }
    }
    
    // If we reach here, user has a Facebook token
    // Update facebook_token_valid field if it's inconsistent
    if (!userData?.facebook_access_token && providerData?.access_token) {
      await supabase.from('users').update({
        facebook_access_token: providerData.access_token,
        facebook_user_id: providerData.provider_user_id,
        facebook_token_updated_at: new Date().toISOString()
      }).eq('id', user.id);
      
      console.log('Updated user record with token from auth_providers');
    }

    // Would normally fetch reels from Facebook API here
    // For now, return a placeholder success message
    return res.status(200).json({
      message: 'Reels refresh initialized',
      count: 0,
      debug: { 
        hasToken: !!userData?.facebook_access_token || !!providerData?.access_token,
        tokenSource: userData?.facebook_access_token ? 'users_table' : 'auth_providers_table'
      }
    });
  } catch (error) {
    console.error('Error processing reels refresh:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

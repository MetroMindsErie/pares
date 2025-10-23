import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Apply CORS middleware
  await corsMiddleware(req, res);

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
      
    if (!token) {
      console.error('No authorization token provided');
      return res.status(401).json({ error: 'Authorization token required' });
    }

    // Initialize Supabase admin client to verify token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error or no user found:', authError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = user.id;


    // Check auth_providers table
    const { data: providerData, error: providerError } = await supabase
      .from('auth_providers')
      .select('id, access_token')
      .eq('user_id', userId)
      .eq('provider', 'facebook')
      .single();

    if (!providerError && providerData) {

      return res.status(200).json({ 
        connected: true, 
        source: 'auth_providers',
        hasValidToken: !!providerData.access_token
      });
    }

    // Check users table as fallback
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('facebook_access_token')
      .eq('id', userId)
      .single();

    if (!userError && userData?.facebook_access_token) {

      return res.status(200).json({ 
        connected: true, 
        source: 'users'
      });
    }


    return res.status(200).json({ connected: false });
    
  } catch (error) {
    console.error('Error checking Facebook connection:', error);
    return res.status(500).json({ 
      error: 'Failed to check Facebook connection', 
      details: error.message 
    });
  }
}

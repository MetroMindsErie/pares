import { createClient } from '@supabase/supabase-js';
import { corsMiddleware } from '../cors-middleware';

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
    console.log(`Debugging Facebook connection for user: ${userId}`);
    
    // Get ALL relevant data
    const results = await Promise.all([
      // Check users table
      supabase
        .from('users')
        .select('facebook_access_token, facebook_user_id, facebook_token_updated_at, facebook_token_valid')
        .eq('id', userId)
        .single(),
      
      // Check auth_providers table
      supabase
        .from('auth_providers')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'facebook')
    ]);
    
    const [usersResult, providersResult] = results;
    
    // Return diagnostic information
    return res.status(200).json({
      userId: userId,
      userTableConnection: {
        hasFacebookToken: !!usersResult.data?.facebook_access_token,
        data: usersResult.data || null,
        error: usersResult.error || null
      },
      providersTableConnection: {
        hasProvider: providersResult.data && providersResult.data.length > 0,
        data: providersResult.data || null,
        error: providersResult.error || null,
        count: providersResult.data?.length || 0
      },
      recommendation: !usersResult.data?.facebook_access_token && 
                     (!providersResult.data || providersResult.data.length === 0) 
                     ? "User needs to connect Facebook account" 
                     : "Check tokens for validity"
    });
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ error: 'Debug error', details: error.message });
  }
}

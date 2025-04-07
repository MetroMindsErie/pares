import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Supabase client with auth context from request
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
      {
        global: { 
          headers: { cookie: req.headers.cookie } 
        }
      }
    );

    // Get session data
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session error:', error);
      return res.status(401).json({ error: 'Authentication error', details: error.message });
    }
    
    if (!session) {
      return res.status(401).json({ error: 'No session found' });
    }
    
    // Return minimal session data needed by the client
    return res.status(200).json({
      token: session.access_token,
      user: {
        id: session.user.id,
        email: session.user.email
      }
    });
  } catch (error) {
    console.error('Error in session handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

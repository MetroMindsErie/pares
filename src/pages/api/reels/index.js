import { createClient } from '@supabase/supabase-js';
import { getCachedReels, processUserReels, getFacebookToken } from '../../../services/facebookServices';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Debug info object to collect information
  const debug = {
    timestamp: new Date().toISOString(),
    steps: []
  };

  // Check if user is authenticated
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data.user) {
    debug.steps.push({ 
      step: 'auth', 
      status: 'error', 
      error: error?.message || 'Invalid token' 
    });
    console.error('Auth error in reels API:', error);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      details: error?.message || 'Invalid token',
      debug
    });
  }

  const user = data.user;
  debug.steps.push({ step: 'auth', status: 'success', userId: user.id });

  try {
    // Get cached reels first for quick response
    debug.steps.push({ step: 'check_cache', status: 'started' });
    const cachedReels = await getCachedReels(user.id);
    debug.steps.push({ 
      step: 'check_cache', 
      status: 'completed', 
      reelsFound: cachedReels?.length || 0 
    });

    // If we have cached reels, return them immediately
    if (cachedReels && cachedReels.length > 0) {
      return res.status(200).json({ 
        reels: cachedReels,
        cached: true,
        count: cachedReels.length,
        debug
      });
    }

    // Check if user has Facebook connected
    debug.steps.push({ step: 'get_token', status: 'started' });
    const tokenData = await getFacebookToken(user.id);

    if (!tokenData) {
      debug.steps.push({ 
        step: 'get_token', 
        status: 'error', 
        error: 'No Facebook token found' 
      });
      return res.status(400).json({ 
        error: 'Facebook account not connected',
        debug
      });
    }

    debug.steps.push({ 
      step: 'get_token', 
      status: 'success', 
      hasFacebookId: !!tokenData.providerId
    });

    // Process reels in the request
    debug.steps.push({ step: 'process_reels', status: 'started' });
    
    // Process and refresh reels
    const reels = await processUserReels(user.id);
    
    debug.steps.push({ 
      step: 'process_reels', 
      status: 'completed',
      count: reels.length
    });

    return res.status(200).json({
      reels,
      cached: false,
      count: reels.length,
      debug
    });
  } catch (error) {
    console.error('Error fetching reels:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch reels', 
      details: error.message,
      debug: {
        ...debug,
        error: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      }
    });
  }
}

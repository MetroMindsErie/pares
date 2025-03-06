import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, limit = 10, offset = 0 } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id parameter' });
    }

    // Get reels from database
    const { data: reels, error, count } = await supabase
      .from('reels')
      .select('*', { count: 'exact' })
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }

    return res.status(200).json({ 
      reels,
      count,
      page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
      total_pages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching reels:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}




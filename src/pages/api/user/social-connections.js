import supabase from "../../../lib/supabase-setup";
import { createClient } from '@supabase/supabase-js';
import { edgeHandler } from '../../../lib/edgeHandler';


export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the user from the Supabase auth token in the request
    const token = (req.headers.authorization || '').replace('Bearer ', '') ||
      req.cookies?.['sb-access-token'] || req.cookies?.['supabase-auth-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: { user }, error: authError } = await sb.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;

    // Query the user's social connections from the database
    const { data, error } = await supabase
      .from('user_social_connections')
      .select('provider, is_connected, last_connected_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch social connections' });
    }

    // Transform to object format {facebook: true/false, instagram: true/false, etc.}
    const connections = {};
    data?.forEach(conn => {
      connections[conn.provider] = conn.is_connected;
    });

    // If no Facebook connection record exists, assume it's false
    if (connections.facebook === undefined) {
      connections.facebook = false;
    }

    return res.status(200).json(connections);
  } catch (error) {
    console.error('Social connections API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

);

export const runtime = 'edge';

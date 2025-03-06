import { getServerSession } from "next-auth/next";
import supabase from "../../../lib/supabase-setup";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the user's session
    const session = await getServerSession(req, res);
    
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;

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

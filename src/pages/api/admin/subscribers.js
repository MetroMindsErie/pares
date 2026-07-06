import { createClient } from '@supabase/supabase-js';
import { edgeHandler } from '../../../lib/edgeHandler';
import { getCallerRole } from '../../../lib/apiAuth';


export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const role = await getCallerRole(req.headers['authorization']);
  if (role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const tableCandidates = ['newsletter_subscribers', 'subscribers'];
  let data = null;
  let error = null;

  for (const table of tableCandidates) {
    const primary = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });

    if (!primary.error) {
      data = primary.data || [];
      error = null;
      break;
    }

    // If created_at doesn't exist, retry without ordering.
    if (primary.error.message?.toLowerCase().includes('created_at')) {
      const fallbackNoOrder = await supabase.from(table).select('*');
      if (!fallbackNoOrder.error) {
        data = fallbackNoOrder.data || [];
        error = null;
        break;
      }
      error = fallbackNoOrder.error;
      continue;
    }

    error = primary.error;
  }

  if (error) {
    console.error('Admin subscribers fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch subscribers.' });
  }

  return res.status(200).json({ data });
});

export const runtime = 'edge';

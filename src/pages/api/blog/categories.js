import { supabase } from '../../../utils/supabaseClient';
import { edgeHandler } from '../../../lib/edgeHandler';


export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .order('name');

    if (error) throw error;
    
    const categories = data.map(row => row.name);
    
    return res.status(200).json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ error: 'Failed to retrieve categories', categories: [] });
  }
}

);

export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { edgeHandler } from '../../../lib/edgeHandler';

async function getCallerRole(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  return data?.role || null;
}

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
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
  );

  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Admin contacts fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch contact messages.' });
  }

  return res.status(200).json({ data });
});

export const runtime = 'edge';

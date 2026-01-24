import { getTrestleToken } from '../../lib/trestleServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const token = await getTrestleToken();
    return res.status(200).json({ 
      access_token: token,
      expires_in: 3600
    });
  } catch (error) {
    console.error('Error fetching token:', error?.message || String(error));
    return res.status(500).json({
      error: 'Failed to fetch token',
      details: error?.message || String(error)
    });
  }
}
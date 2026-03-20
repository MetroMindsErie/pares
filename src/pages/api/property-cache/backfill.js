/**
 * /api/property-cache/backfill — receives listings from client and upserts to cache.
 */

import { upsertListingsToCache } from '../../../lib/propertyCache';
import { edgeHandler } from '../../../lib/edgeHandler';


export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { listings } = req.body;
    if (!Array.isArray(listings) || !listings.length) {
      return res.status(200).json({ ok: true, upserted: 0 });
    }

    // Limit to 500 per request to prevent abuse
    const batch = listings.slice(0, 500);
    await upsertListingsToCache(batch);

    return res.status(200).json({ ok: true, upserted: batch.length });
  } catch (err) {
    console.error('Backfill error:', err.message);
    return res.status(500).json({ error: 'Backfill failed' });
  }
}

);

export const runtime = 'edge';

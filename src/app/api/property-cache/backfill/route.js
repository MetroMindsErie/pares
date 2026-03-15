/**
 * /api/property-cache/backfill — receives listings from client and upserts to cache.
 * Called fire-and-forget from trestleServices after every search.
 */

import { NextResponse } from 'next/server';
import { upsertListingsToCache } from '@/lib/propertyCache';

export async function POST(request) {
  try {
    const { listings } = await request.json();
    if (!Array.isArray(listings) || !listings.length) {
      return NextResponse.json({ ok: true, upserted: 0 });
    }

    // Limit to 500 per request to prevent abuse
    const batch = listings.slice(0, 500);
    await upsertListingsToCache(batch);

    return NextResponse.json({ ok: true, upserted: batch.length });
  } catch (err) {
    console.error('Backfill error:', err.message);
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 });
  }
}

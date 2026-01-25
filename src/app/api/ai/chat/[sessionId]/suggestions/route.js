import { NextResponse } from 'next/server';

// Ensure this route is always dynamic (no static optimization) so params are available at runtime.
export const dynamic = 'force-dynamic';

export async function GET(request, context) {
  const { sessionId } = (await Promise.resolve(context?.params)) || {};
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  try {
    const baseUrl = process.env.AI_SUGGEST_BASE_URL || process.env.NEXT_PUBLIC_AI_SUGGEST_BASE_URL || 'http://localhost:8000';
    const apiKey = process.env.AI_SERVICE_API_KEY || null;

    const res = await fetch(`${baseUrl}/chat/${sessionId}/suggestions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {})
      }
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'AI suggestions fetch failed', details: e?.message || String(e) }, { status: 500 });
  }
}

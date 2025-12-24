import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();

    const baseUrl = process.env.AI_SUGGEST_BASE_URL || process.env.NEXT_PUBLIC_AI_SUGGEST_BASE_URL || 'http://localhost:8000';
    const apiKey = process.env.AI_SERVICE_API_KEY || null;

    const res = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {})
      },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json'
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'AI proxy failed', details: e?.message || String(e) }, { status: 500 });
  }
}

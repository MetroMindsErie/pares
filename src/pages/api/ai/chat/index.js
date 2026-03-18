export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    const baseUrl = process.env.AI_SUGGEST_BASE_URL || process.env.NEXT_PUBLIC_AI_SUGGEST_BASE_URL || 'http://localhost:8000';
    const apiKey = process.env.AI_SERVICE_API_KEY || null;

    const upstream = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {})
      },
      body: JSON.stringify(body)
    });

    const text = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(upstream.status).send(text);
  } catch (e) {
    return res.status(500).json({ error: 'AI proxy failed', details: e?.message || String(e) });
  }
}

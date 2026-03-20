import { edgeHandler } from '../../../lib/edgeHandler';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Turnstile not configured — allow through (mirrors dev-bypass on client)
    return res.status(200).json({ success: true });
  }

  const { token } = req.body || {};

  // Dev bypass token sent by client component when no site key is set
  if (token === '__dev_bypass__') {
    return res.status(200).json({ success: true });
  }

  if (!token) {
    return res.status(400).json({ success: false, error: 'Missing Turnstile token' });
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);
    // Optionally include the user's IP for stricter verification
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
    if (ip) formData.append('remoteip', ip);

    const verifyRes = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const result = await verifyRes.json();

    if (result.success) {
      return res.status(200).json({ success: true });
    }

    return res.status(403).json({ success: false, error: 'Turnstile verification failed', codes: result['error-codes'] });
  } catch (err) {
    console.error('Turnstile verify error:', err);
    return res.status(500).json({ success: false, error: 'Verification service error' });
  }
}

);

export const runtime = 'edge';

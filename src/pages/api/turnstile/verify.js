import { edgeHandler } from '../../../lib/edgeHandler';
import { evaluateTurnstilePolicy, verifyTurnstileToken } from '../../../lib/security/turnstile';

export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, action } = req.body || {};
  const pathname = action ? `/api/${String(action).replace(/^\/+/, '')}` : '/api/unknown';
  const policy = evaluateTurnstilePolicy({ pathname, method: 'POST', headers: req.headers });

  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
    const result = await verifyTurnstileToken({ token, ip });

    if (result.success) {
      return res.status(200).json({
        success: true,
        requireTurnstile: policy.requireTurnstile,
      });
    }

    return res.status(403).json({
      success: false,
      error: 'Turnstile verification failed',
      requireTurnstile: policy.requireTurnstile,
    });
  } catch (err) {
    console.error('Turnstile verify error:', err);
    return res.status(500).json({ success: false, error: 'Verification service error' });
  }
}

);

export const runtime = 'edge';

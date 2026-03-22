import { edgeHandler } from '../../../lib/edgeHandler';
import { evaluateTurnstilePolicy } from '../../../lib/security/turnstile';

export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body || {};
  const pathname = action ? `/api/${String(action).replace(/^\/+/, '')}` : '/api/unknown';

  const policy = evaluateTurnstilePolicy({
    pathname,
    method: 'POST',
    headers: req.headers,
  });

  return res.status(200).json({
    requireTurnstile: policy.requireTurnstile,
    riskScore: policy.risk.score,
    reasons: policy.risk.reasons,
    rateLimited: policy.risk.rateLimited,
  });
});

export const runtime = 'edge';

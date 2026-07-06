import { edgeHandler } from '../../../lib/edgeHandler';
import { enforceRiskBasedTurnstile } from '../../../lib/security/turnstile';

export default edgeHandler(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { turnstileToken, payload } = req.body || {};

  const security = await enforceRiskBasedTurnstile({
    req,
    res,
    pathname: '/api/examples/protected-form',
    token: turnstileToken,
  });
  if (!security.ok) return security.response;

  return res.status(200).json({
    message: 'Protected request accepted',
    payload: payload || null,
    turnstileRequired: security.policy.requireTurnstile,
  });
});

export const runtime = 'edge';

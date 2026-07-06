import { SECURITY_CONFIG } from './config';
import { assessRisk, shouldBlockRequest, shouldRequireTurnstile } from './risk';
import { getClientIp } from './request';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken({ token, ip }) {
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (isProduction) {
      console.warn('[security] TURNSTILE_SECRET_KEY not set in production — verification bypassed');
    }
    return { success: true, bypassed: true };
  }

  // Dev-only escape hatch; never honored in production.
  if (!isProduction && token === '__dev_bypass__') {
    return { success: true, bypassed: true };
  }

  if (!token) {
    return { success: false, error: 'missing_token', codes: ['missing-input-response'] };
  }

  const formData = new URLSearchParams();
  formData.append('secret', secret);
  formData.append('response', token);
  if (ip && ip !== 'unknown') formData.append('remoteip', ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const data = await res.json();
    return {
      success: Boolean(data?.success),
      codes: data?.['error-codes'] || [],
      raw: data,
    };
  } catch (err) {
    return { success: false, error: 'verification_request_failed', details: String(err?.message || err) };
  }
}

export function evaluateTurnstilePolicy({ pathname, method, headers }) {
  const risk = assessRisk({ pathname, method, headers });
  return {
    risk,
    requireTurnstile: shouldRequireTurnstile(risk),
    block: shouldBlockRequest(risk),
  };
}

export async function enforceRiskBasedTurnstile({ req, res, pathname, token }) {
  const policy = evaluateTurnstilePolicy({
    pathname,
    method: req.method,
    headers: req.headers,
  });

  if (policy.block) {
    return {
      ok: false,
      response: res.status(429).json({
        error: 'Too many requests. Please slow down and try again shortly.',
      }),
      policy,
    };
  }

  if (!policy.requireTurnstile) {
    return { ok: true, policy, turnstile: { success: true, skipped: true } };
  }

  const ip = getClientIp(req.headers);
  const verification = await verifyTurnstileToken({ token, ip });

  if (!verification.success) {
    if (SECURITY_CONFIG.logEnabled) {
      console.warn('[security] turnstile.failed', {
        path: pathname,
        riskScore: policy.risk.score,
        reasons: policy.risk.reasons,
        verificationCodes: verification.codes,
        verificationError: verification.error,
      });
    }

    return {
      ok: false,
      response: res.status(403).json({
        error: 'Turnstile challenge required or failed.',
        challengeRequired: true,
      }),
      policy,
      turnstile: verification,
    };
  }

  if (SECURITY_CONFIG.logEnabled) {
    console.info('[security] turnstile.passed', {
      path: pathname,
      riskScore: policy.risk.score,
      reasons: policy.risk.reasons,
      required: true,
    });
  }

  return { ok: true, policy, turnstile: verification };
}

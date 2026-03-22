import { SECURITY_CONFIG, getPolicyForPath } from './config';
import { buildRequestFacts } from './request';
import { incrementCounter } from './store';

function logSecurity(event, payload) {
  if (!SECURITY_CONFIG.logEnabled) return;
  try {
    console.info(`[security] ${event}`, payload);
  } catch {
    // ignore logging failures
  }
}

export function assessRisk({ pathname = '', method = 'GET', headers }) {
  const facts = buildRequestFacts({ pathname, method, headers });
  const policy = getPolicyForPath(facts.pathname);
  const reasons = [];
  let score = 0;

  const ipMinute = incrementCounter(`ip:${facts.ip}:minute`, 60_000);
  const endpointMinute = incrementCounter(`ip:${facts.ip}:ep:${facts.pathname}:minute`, 60_000);

  const rateLimit = policy.rateLimitPerMin;

  if (facts.suspiciousUa) {
    score += 30;
    reasons.push('suspicious_or_missing_user_agent');
  }

  if (!facts.hasCookies) {
    score += 10;
    reasons.push('no_session_cookie');
  }

  if (facts.sensitivePath) {
    score += 15;
    reasons.push('sensitive_path');
  }

  if (ipMinute.count > rateLimit) {
    score += 40;
    reasons.push('ip_rate_exceeded');
  } else if (ipMinute.count > Math.floor(rateLimit * 0.75)) {
    score += 15;
    reasons.push('ip_rate_high');
  }

  if (endpointMinute.count > Math.max(6, Math.floor(rateLimit / 2))) {
    score += 20;
    reasons.push('endpoint_repetition_high');
  }

  const rateLimited = ipMinute.count > rateLimit;

  const result = {
    score,
    reasons,
    rateLimited,
    facts,
    policy,
    counters: {
      ipMinute: ipMinute.count,
      endpointMinute: endpointMinute.count,
      limit: rateLimit,
    },
  };

  logSecurity('risk.assessed', {
    path: facts.pathname,
    method: facts.method,
    ip: facts.ip,
    score,
    rateLimited,
    reasons,
    counters: result.counters,
  });

  return result;
}

export function shouldRequireTurnstile(riskResult) {
  const threshold = riskResult.policy?.riskThreshold ?? SECURITY_CONFIG.riskThreshold;
  return riskResult.score >= threshold;
}

export function shouldBlockRequest(riskResult) {
  const blockThreshold = riskResult.policy?.blockRiskThreshold ?? SECURITY_CONFIG.blockRiskThreshold;
  return riskResult.rateLimited || riskResult.score >= blockThreshold;
}

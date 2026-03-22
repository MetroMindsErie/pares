function parseIntOr(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export const SECURITY_CONFIG = {
  riskThreshold: parseIntOr(process.env.TURNSTILE_RISK_THRESHOLD, 45),
  sensitiveRiskThreshold: parseIntOr(process.env.TURNSTILE_SENSITIVE_RISK_THRESHOLD, 25),
  blockRiskThreshold: parseIntOr(process.env.TURNSTILE_BLOCK_RISK_THRESHOLD, 90),
  generalRateLimitPerMin: parseIntOr(process.env.RATE_LIMIT_GENERAL_PER_MIN, 90),
  sensitiveRateLimitPerMin: parseIntOr(process.env.RATE_LIMIT_SENSITIVE_PER_MIN, 20),
  logEnabled: process.env.SECURITY_LOG_ENABLED !== 'false',
  protectedPaths: [
    '/api/contact',
    '/api/subscribe',
    '/api/admin/contacts',
    '/api/admin/subscribers',
    '/api/auth',
    '/login',
    '/register',
  ],
  suspiciousUaPatterns: [
    'curl',
    'wget',
    'python-requests',
    'scrapy',
    'httpclient',
    'headless',
    'phantomjs',
    'playwright',
    'selenium',
    'bot',
    'spider',
    'crawler',
  ],
  endpointPolicies: [
    {
      prefix: '/api/admin',
      riskThreshold: parseIntOr(process.env.RATE_LIMIT_ADMIN_RISK_THRESHOLD, 20),
      blockRiskThreshold: parseIntOr(process.env.RATE_LIMIT_ADMIN_BLOCK_THRESHOLD, 80),
      rateLimitPerMin: parseIntOr(process.env.RATE_LIMIT_ADMIN_PER_MIN, 12),
    },
    {
      prefix: '/api/contact',
      riskThreshold: parseIntOr(process.env.RATE_LIMIT_CONTACT_RISK_THRESHOLD, 28),
      blockRiskThreshold: parseIntOr(process.env.RATE_LIMIT_CONTACT_BLOCK_THRESHOLD, 85),
      rateLimitPerMin: parseIntOr(process.env.RATE_LIMIT_CONTACT_PER_MIN, 18),
    },
    {
      prefix: '/api/subscribe',
      riskThreshold: parseIntOr(process.env.RATE_LIMIT_SUBSCRIBE_RISK_THRESHOLD, 58),
      blockRiskThreshold: parseIntOr(process.env.RATE_LIMIT_SUBSCRIBE_BLOCK_THRESHOLD, 92),
      rateLimitPerMin: parseIntOr(process.env.RATE_LIMIT_SUBSCRIBE_PER_MIN, 40),
    },
    {
      prefix: '/api/signup',
      riskThreshold: parseIntOr(process.env.RATE_LIMIT_SIGNUP_RISK_THRESHOLD, 40),
      blockRiskThreshold: parseIntOr(process.env.RATE_LIMIT_SIGNUP_BLOCK_THRESHOLD, 86),
      rateLimitPerMin: parseIntOr(process.env.RATE_LIMIT_SIGNUP_PER_MIN, 24),
    },
  ],
};

export function isSensitivePath(pathname = '') {
  return SECURITY_CONFIG.protectedPaths.some((p) => pathname.startsWith(p));
}

export function getPolicyForPath(pathname = '') {
  const matched = SECURITY_CONFIG.endpointPolicies.find((rule) => pathname.startsWith(rule.prefix));

  if (matched) {
    return {
      riskThreshold: matched.riskThreshold,
      blockRiskThreshold: matched.blockRiskThreshold,
      rateLimitPerMin: matched.rateLimitPerMin,
    };
  }

  const sensitive = isSensitivePath(pathname);
  return {
    riskThreshold: sensitive ? SECURITY_CONFIG.sensitiveRiskThreshold : SECURITY_CONFIG.riskThreshold,
    blockRiskThreshold: SECURITY_CONFIG.blockRiskThreshold,
    rateLimitPerMin: sensitive ? SECURITY_CONFIG.sensitiveRateLimitPerMin : SECURITY_CONFIG.generalRateLimitPerMin,
  };
}

import { SECURITY_CONFIG, isSensitivePath } from './config';

function getHeaderValue(headers, name) {
  if (!headers) return '';

  if (typeof headers.get === 'function') {
    return headers.get(name) || headers.get(name.toLowerCase()) || '';
  }

  const lower = name.toLowerCase();
  return headers[lower] || headers[name] || '';
}

export function getClientIp(headers) {
  const forwarded = getHeaderValue(headers, 'x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return (
    getHeaderValue(headers, 'cf-connecting-ip') ||
    getHeaderValue(headers, 'x-real-ip') ||
    'unknown'
  );
}

export function getUserAgent(headers) {
  return String(getHeaderValue(headers, 'user-agent') || '').trim();
}

export function hasSessionCookies(headers) {
  const cookie = String(getHeaderValue(headers, 'cookie') || '');
  if (!cookie) return false;

  // Supabase cookies + app session hints.
  return (
    cookie.includes('sb-') ||
    cookie.includes('pares-auth') ||
    cookie.includes('next-auth.session-token') ||
    cookie.includes('__session')
  );
}

export function isSuspiciousUserAgent(userAgent = '') {
  if (!userAgent) return true;
  const ua = userAgent.toLowerCase();
  return SECURITY_CONFIG.suspiciousUaPatterns.some((p) => ua.includes(p));
}

export function buildRequestFacts({ pathname = '', method = 'GET', headers }) {
  const ip = getClientIp(headers);
  const userAgent = getUserAgent(headers);
  const hasCookies = hasSessionCookies(headers);
  const sensitivePath = isSensitivePath(pathname);

  return {
    ip,
    userAgent,
    hasCookies,
    sensitivePath,
    method,
    pathname,
    suspiciousUa: isSuspiciousUserAgent(userAgent),
  };
}

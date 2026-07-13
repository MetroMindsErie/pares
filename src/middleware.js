import { NextResponse } from 'next/server';
import { evaluateTurnstilePolicy } from './lib/security/turnstile';

function isSkippablePath(pathname) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/sitemap') ||
    pathname.startsWith('/robots.txt')
  );
}

const IS_PROD = process.env.NODE_ENV === 'production';

// Full CSP. 'unsafe-inline' for scripts is required by the GTM/GA bootstrap and
// Next's inline runtime — migrating to nonces would tighten this further.
// Dev additionally needs 'unsafe-eval' (react-refresh) and ws: (HMR).
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${IS_PROD ? '' : " 'unsafe-eval'"} https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${IS_PROD ? '' : ' ws:'} https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://graph.facebook.com https://cdn.contentful.com https://api.coingecko.com https://nominatim.openstreetmap.org`,
  "frame-src https://challenges.cloudflare.com https://www.googletagmanager.com https://www.facebook.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'",
].join('; ');

// Baseline security headers applied to every response.
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'Content-Security-Policy': CSP,
};

function withSecurityHeaders(res) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (isSkippablePath(pathname)) return NextResponse.next();

  const policy = evaluateTurnstilePolicy({
    pathname,
    method: req.method,
    headers: req.headers,
  });

  if (policy.block && pathname.startsWith('/api/')) {
    // Deliberately generic: never expose risk scores or reasons to callers.
    return withSecurityHeaders(
      NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    );
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

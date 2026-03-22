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

export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (isSkippablePath(pathname)) return NextResponse.next();

  const policy = evaluateTurnstilePolicy({
    pathname,
    method: req.method,
    headers: req.headers,
  });

  if (policy.block && pathname.startsWith('/api/')) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        riskScore: policy.risk.score,
        reasons: policy.risk.reasons,
      },
      { status: 429 }
    );
  }

  const res = NextResponse.next();
  // Lightweight observability headers for debugging and tuning.
  res.headers.set('x-risk-score', String(policy.risk.score));
  res.headers.set('x-turnstile-required', policy.requireTurnstile ? '1' : '0');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

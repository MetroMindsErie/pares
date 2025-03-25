// middleware.js
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh the session if it exists
  const { data: { session } } = await supabase.auth.getSession();

  // Authentication logic - adjust protected routes as needed
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  const isProtectedRoute = 
    req.nextUrl.pathname.startsWith('/dashboard') || 
    req.nextUrl.pathname.startsWith('/create-profile') ||
    req.nextUrl.pathname.startsWith('/admin');
  
  // Special handling for admin routes
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');

  // Redirect if accessing auth pages while logged in
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Redirect if accessing protected routes while not logged in
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // For API routes, return 401 if not authenticated
  if (isApiRoute && !session && req.nextUrl.pathname !== '/api/auth/callback') {
    return new NextResponse(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // For admin routes, check if user has admin role
  if (isAdminRoute && session) {
    // Make a database query to check role
    const { data: userData } = await supabase
      .from('user_profiles')
      .select('roles')
      .eq('id', session.user.id)
      .single();
    
    const isAdmin = userData?.roles?.includes('super_admin');
    
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    '/auth/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/api/:path*',
  ],
};

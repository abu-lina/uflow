import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // For debugging
  console.log('Middleware executing for path:', req.nextUrl.pathname);
  
  // Create a Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // This is used for setting cookies during auth operations
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // This is used for removing cookies during auth operations like sign-out
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );
  
  // Get the session
  const { data: { session } } = await supabase.auth.getSession();

  // For debugging - log session data
  console.log('Middleware - Session exists:', !!session);
  if (session) {
    console.log('Middleware - User:', session.user.email);
  }

  // TEMPORARY: Allow direct access to profile page for debugging
  if (req.nextUrl.pathname === '/profile') {
    console.log('Middleware - Allowing direct access to profile page');
    return res;
  }

  // Check if this is a protected route (excluding profile for now)
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard');
  
  // Check if this is an auth route (login/signup)
  const isAuthRoute = req.nextUrl.pathname.startsWith('/auth/login') || 
                      req.nextUrl.pathname.startsWith('/auth/signup');

  // If user is not logged in and tries to access protected route, redirect to login
  if (!session && isProtectedRoute) {
    const redirectUrl = new URL('/auth/login', req.url);
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is logged in and tries to access auth routes, redirect to profile
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/profile', req.url));
  }

  return res;
}

// Specify which routes this middleware should run on (but we're now ignoring profile)
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/login',
    '/auth/signup',
  ],
}; 
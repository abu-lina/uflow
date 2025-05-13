import { NextResponse, type NextRequest } from 'next/server';

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const currentPath = req.nextUrl.pathname;
    const isAuthPage = ['/login', '/register'].includes(currentPath);

    // Check if the route is in the public group or is a public route
    const isPublicRoute =
      currentPath === '/' || // Home page
      currentPath.startsWith('/souks') || // Souks page
      currentPath.startsWith('/(public)') || // Public route group
      currentPath.includes('/_next') || // Next.js internal routes
      currentPath.includes('/api'); // API routes

    // If user is not signed in and trying to access a protected route,
    // redirect to login
    if (!session && !isAuthPage && !isPublicRoute) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // If user is signed in and trying to access auth pages,
    // redirect to dashboard
    if (session && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - offline.html (PWA offline page)
     * - icons (PWA icons)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|offline.html|icons).*)',
  ],
};

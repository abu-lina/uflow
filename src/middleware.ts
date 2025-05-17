import { NextResponse, type NextRequest } from 'next/server';

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  try {
    const supabase = createMiddlewareClient({ req, res });

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return res;
    }

    const currentPath = req.nextUrl.pathname;

    // Only protect admin routes
    const isAdminRoute = currentPath.startsWith('/(admin)');

    // If trying to access admin routes without session, redirect to home
    if (isAdminRoute && !session) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return res;
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

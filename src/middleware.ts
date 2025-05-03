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

    // If user is not signed in and the current path is not /login or /register,
    // redirect the user to /login
    if (!session && !isAuthPage) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // If user is signed in and the current path is /login or /register,
    // redirect the user to /dashboard
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
  matcher: ['/((?!api|_next|favicon.ico|manifest.json|offline.html|icons).*)'],
};

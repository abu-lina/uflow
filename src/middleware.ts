import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Create response
  const response = NextResponse.next();
  
  // Check authentication only for protected routes
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard') || 
                          req.nextUrl.pathname.startsWith('/admin');
  
  if (isProtectedRoute) {
    const accessToken = req.cookies.get('sb-access-token')?.value;
    if (!accessToken) {
      // Not authenticated, redirect to home
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Validate the token with Supabase
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
    });

    if (!res.ok) {
      // Token invalid or expired
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except API routes and static files
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

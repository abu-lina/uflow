import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Check authentication only for protected routes
  // Role-based authorization is handled in the layout component
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard') || 
                          req.nextUrl.pathname.startsWith('/admin');
  
  if (isProtectedRoute) {
    // Check for authentication token in cookies
    const accessToken = req.cookies.get('sb-access-token')?.value;
    
    if (!accessToken) {
      // Not authenticated, redirect to home
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Validate the token with Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!res.ok) {
      // Check if token is expired (403) - allow page to load so AuthSyncer can refresh
      if (res.status === 403) {
        try {
          const errorData = await res.json();
          // If it's a JWT expiration error, let the page load
          // AuthSyncer will detect the session and sync fresh tokens
          if (errorData.error_code === 'bad_jwt' || errorData.msg?.includes('expired')) {
            return NextResponse.next();
          }
        } catch {
          // If we can't parse the error, treat as expired and allow through
          return NextResponse.next();
        }
      }
      
      // For other errors (401, invalid token, etc.), redirect to home
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to all routes except API routes and static files
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

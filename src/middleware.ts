import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
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

  // User is authenticated, allow request
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect these routes
    '/(dashboard)/(.*)',
    '/(admin)/(.*)',
    // ...add more as needed
  ],
};

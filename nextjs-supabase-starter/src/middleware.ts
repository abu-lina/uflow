import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard');

  if (isProtectedRoute) {
    const accessToken = req.cookies.get('sb-access-token')?.value;

    if (!accessToken) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!res.ok) {
      if (res.status === 403) {
        try {
          const errorData = await res.json();
          if (errorData.error_code === 'bad_jwt' || errorData.msg?.includes('expired')) {
            return NextResponse.next();
          }
        } catch {
          return NextResponse.next();
        }
      }

      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};




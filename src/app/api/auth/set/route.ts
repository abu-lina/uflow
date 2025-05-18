import { NextResponse, type NextRequest } from 'next/server';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

export async function POST(req: NextRequest) {
  const { access_token, refresh_token } = (await req.json()) as TokenResponse;

  const res = NextResponse.json({ ok: true });
  res.cookies.set('sb-access-token', access_token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  res.cookies.set('sb-refresh-token', refresh_token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

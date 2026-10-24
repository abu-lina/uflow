import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
} as const;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { access_token, refresh_token } = (body ?? {}) as Record<string, unknown>;
  if (!isNonEmptyString(access_token) || !isNonEmptyString(refresh_token)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('sb-access-token', access_token, COOKIE_OPTIONS);
  res.cookies.set('sb-refresh-token', refresh_token, COOKIE_OPTIONS);
  return res;
}

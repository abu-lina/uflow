import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import type { NextResponse } from 'next/server';

/**
 * Server-issued capability proving the caller went through signup, or logged in
 * with valid credentials to an unconfirmed account. It is bound to one email,
 * HMAC-signed and short-lived, so the resend endpoints never act on a bare
 * email address.
 *
 * No dedicated secret exists for this, so the signing key is derived from
 * SUPABASE_SERVICE_ROLE_KEY: key = HMAC-SHA256(serviceRoleKey, RESEND_KEY_LABEL),
 * signature = HMAC-SHA256(key, payload). The label separates this use from every
 * other use of the secret, so a signature minted here is worthless elsewhere.
 * Rotating the service-role key invalidates outstanding capabilities (1h TTL),
 * which only means a resend needs a fresh signup or login. Bump the label
 * version to revoke all capabilities without rotating the secret.
 */
const RESEND_KEY_LABEL = 'ummahflow:resend-capability:v1';
export const RESEND_CAPABILITY_COOKIE = 'signup-resend';
export const RESEND_CAPABILITY_HEADER = 'x-resend-capability';
export const RESEND_CAPABILITY_TTL_MS = 60 * 60 * 1000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sign(payload: string): Buffer | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  const key = createHmac('sha256', secret).update(RESEND_KEY_LABEL).digest();
  return createHmac('sha256', key).update(payload).digest();
}

export function issueResendCapability(email: string, now: number = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ e: normalizeEmail(email), x: now + RESEND_CAPABILITY_TTL_MS }),
  ).toString('base64url');
  const signature = sign(payload);
  if (!signature) throw new Error('Resend capability signing key is not configured');
  return `${payload}.${signature.toString('base64url')}`;
}

export function verifyResendCapability(
  capability: string | null | undefined,
  email: string,
  now: number = Date.now(),
): boolean {
  if (!capability || !email) return false;
  const [payload, signature, ...rest] = capability.split('.');
  if (!payload || !signature || rest.length > 0) return false;

  const expected = sign(payload);
  const given = Buffer.from(signature, 'base64url');
  if (!expected || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return false;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return claims.e === normalizeEmail(email) && typeof claims.x === 'number' && claims.x > now;
  } catch {
    return false;
  }
}

export function readResendCapability(request: Request): string | null {
  const fromHeader = request.headers.get(RESEND_CAPABILITY_HEADER);
  if (fromHeader) return fromHeader;

  const cookies = request.headers.get('cookie') ?? '';
  for (const part of cookies.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === RESEND_CAPABILITY_COOKIE) return value.join('=');
  }
  return null;
}

export function setResendCapabilityCookie(response: NextResponse, email: string): void {
  response.cookies.set(RESEND_CAPABILITY_COOKIE, issueResendCapability(email), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api',
    maxAge: RESEND_CAPABILITY_TTL_MS / 1000,
  });
}

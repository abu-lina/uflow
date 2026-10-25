import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { maskEmail, redactError } from '@/lib/logging/redact-pii';
import { isAuthEmailLanguage } from '@/lib/auth-email-language';
import {
  normalizeEmail,
  readResendCapability,
  verifyResendCapability,
} from '@/lib/auth/resend-capability';
import { sendAuthEmail } from '@/services/emailService';

const HOUR_MS = 60 * 60 * 1000;
const TOKEN_TTL_MS = 24 * HOUR_MS;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TokenType = 'signup' | 'password_reset';

const FLOWS: Record<
  TokenType,
  {
    mail: 'confirmSignup' | 'resetPassword';
    path: string;
    eligible: (confirmed: boolean) => boolean;
  }
> = {
  signup: { mail: 'confirmSignup', path: '/auth/confirm', eligible: (confirmed) => !confirmed },
  password_reset: {
    mail: 'resetPassword',
    path: '/reset-password',
    eligible: (confirmed) => confirmed,
  },
};

function isTokenType(value: unknown): value is TokenType {
  return value === 'signup' || value === 'password_reset';
}

// Every request that passes validation gets this exact response, whether or not
// the account exists, so the endpoint cannot be used as an enumeration oracle.
const accepted = () => NextResponse.json({ success: true });

async function findUserByEmail(email: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const user = data.users.find((u) => normalizeEmail(u.email ?? '') === email);
    if (user || data.users.length < perPage) return user ?? null;
  }
}

export async function POST(request: Request) {
  try {
    // F-049-02: rate limit per IP (5 per hour)
    if (!checkRateLimit(getClientIdentifier(request), 5, HOUR_MS, 'generate-confirmation-token')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 },
      );
    }

    const { email: rawEmail, type, language } = await request.json();

    if (
      typeof rawEmail !== 'string' ||
      !EMAIL_PATTERN.test(rawEmail) ||
      !isTokenType(type) ||
      !isAuthEmailLanguage(language)
    ) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const email = normalizeEmail(rawEmail);

    if (type === 'signup' && !verifyResendCapability(readResendCapability(request), email)) {
      console.warn('[TOKEN] Signup token request without a valid capability');
      return NextResponse.json({ error: 'Request not allowed' }, { status: 403 });
    }

    // Per-email limit on top of the per-IP one, so distributed clients cannot flood one inbox
    if (!checkRateLimit(`${type}:${email}`, 3, HOUR_MS, 'generate-confirmation-token-email')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 },
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[TOKEN] Missing Supabase credentials');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    let user;
    try {
      user = await findUserByEmail(email);
    } catch (lookupError) {
      console.error('[TOKEN] Error listing users:', redactError(lookupError));
      return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }

    const flow = FLOWS[type];
    if (!user || !flow.eligible(Boolean(user.email_confirmed_at))) {
      console.log('[TOKEN] No token issued:', { type, email: maskEmail(email) });
      return accepted();
    }

    // Failures past this point are logged only; surfacing them would reveal that the account exists.
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const { error: insertError } = await getSupabaseAdmin()
        .from('email_confirmation_tokens')
        .insert({
          user_id: user.id,
          email,
          token,
          type,
          expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
          used: false,
          created_at: new Date().toISOString(),
        });
      if (insertError) throw insertError;

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ummahflow.com';
      const url = `${siteUrl}${flow.path}?token=${token}&email=${encodeURIComponent(email)}`;
      await sendAuthEmail(email, flow.mail, language, url);
      console.log('[TOKEN] Token issued:', { type, email: maskEmail(email) });
    } catch (issueError) {
      console.error('[TOKEN] Failed to issue token:', redactError(issueError));
    }

    return accepted();
  } catch (error) {
    console.error('[TOKEN] Unexpected error:', redactError(error));
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

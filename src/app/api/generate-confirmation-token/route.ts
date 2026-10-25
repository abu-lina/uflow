import { after, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { maskEmail, redactError } from '@/lib/logging/redact-pii';
import { isAuthEmailLanguage, type AuthEmailLanguage } from '@/lib/auth-email-language';
import {
  normalizeEmail,
  readResendCapability,
  verifyResendCapability,
} from '@/lib/auth/resend-capability';
import { sendAuthEmail } from '@/services/emailService';

const HOUR_MS = 60 * 60 * 1000;
const TOKEN_TTL_MS = 24 * HOUR_MS;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SIGNUP_EMAIL_STORE = 'generate-confirmation-token-signup-email';
const RESET_EMAIL_STORE = 'generate-confirmation-token-reset-email';

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

// public.users mirrors auth.users (handle_new_user trigger, unique indexed lowercase email; owner
// verified it matches lower(auth.users.email) for every row), so this is an O(1) lookup.
// `email` is already normalized (trimmed, lowercased) by the caller.
async function findUserByEmail(email: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: row, error } = await supabaseAdmin
    .from('users')
    .select('user_id')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const { data, error: userError } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
  if (userError) throw userError;
  return data.user ?? null;
}

// after() keeps the work alive on serverless hosts. It throws outside a Next request scope
// (unit tests), where a plain fire-and-forget is fine on the long-lived Node server we run.
function defer(task: () => Promise<void>) {
  try {
    after(task);
  } catch {
    void task();
  }
}

async function issueToken(email: string, type: TokenType, language: AuthEmailLanguage) {
  const flow = FLOWS[type];
  const user = await findUserByEmail(email);
  if (!user || !flow.eligible(Boolean(user.email_confirmed_at))) {
    console.log('[TOKEN] No token issued:', { type, email: maskEmail(email) });
    return;
  }

  // Reset mail is unauthenticated, so the per-email cap only counts mail that is really sent.
  // Counting requests would let anyone exhaust a victim's budget and block their real reset.
  if (type === 'password_reset' && !checkRateLimit(email, 3, HOUR_MS, RESET_EMAIL_STORE)) {
    console.warn('[TOKEN] Reset mail limit reached:', { email: maskEmail(email) });
    return;
  }

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

    if (type === 'signup') {
      if (!verifyResendCapability(readResendCapability(request), email)) {
        console.warn('[TOKEN] Signup token request without a valid capability');
        return NextResponse.json({ error: 'Request not allowed' }, { status: 403 });
      }
      // The capability proves the caller owns this flow, so a per-email 429 leaks nothing.
      if (!checkRateLimit(email, 3, HOUR_MS, SIGNUP_EMAIL_STORE)) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 },
        );
      }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[TOKEN] Missing Supabase credentials');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Lookup, insert and send run after the response so latency is the same for every account.
    // Failures are logged only; surfacing them would reveal that the account exists.
    defer(() =>
      issueToken(email, type, language).catch((issueError) => {
        console.error('[TOKEN] Failed to issue token:', redactError(issueError));
      }),
    );

    return accepted();
  } catch (error) {
    console.error('[TOKEN] Unexpected error:', redactError(error));
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

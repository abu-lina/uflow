import { NextResponse } from 'next/server';
import { sendAuthEmail } from '@/services/emailService';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { isAuthEmailLanguage } from '@/lib/auth-email-language';
import { redactError } from '@/lib/logging/redact-pii';
import {
  normalizeEmail,
  readResendCapability,
  verifyResendCapability,
} from '@/lib/auth/resend-capability';

const HOUR_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    // F-049-02: rate limit per IP (5 per hour)
    if (!checkRateLimit(getClientIdentifier(request), 5, HOUR_MS, 'send-auth-email')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 },
      );
    }

    const { to, type, language, confirmationUrl: _clientUrl } = await request.json();

    if (typeof to !== 'string' || !to || !type || !language) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // The resend capability only covers signup confirmation mail
    if (type !== 'confirmSignup') {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    if (!isAuthEmailLanguage(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    if (!verifyResendCapability(readResendCapability(request), to)) {
      return NextResponse.json({ error: 'Request not allowed' }, { status: 403 });
    }

    // Per-recipient limit on top of the per-IP one, so distributed clients cannot flood one inbox
    if (!checkRateLimit(normalizeEmail(to), 3, HOUR_MS, 'send-auth-email-recipient')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 },
      );
    }

    // F-049-02: Derive confirmationUrl from trusted server config only.
    // Use URL parsing to strip the client-supplied origin and replace with server-authoritative
    // siteUrl. This prevents phishing via branded emails regardless of URI scheme.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ummahflow.com';
    let confirmationUrl = siteUrl;
    if (_clientUrl) {
      try {
        const parsed = new URL(_clientUrl);
        const trustedOrigin = new URL(siteUrl).origin;
        confirmationUrl = trustedOrigin + parsed.pathname + parsed.search + parsed.hash;
      } catch {
        // Unparseable URL — fall back to siteUrl
      }
    }

    await sendAuthEmail(to, type, language, confirmationUrl);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to send auth email:', redactError(error));
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

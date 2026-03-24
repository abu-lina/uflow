import { NextResponse } from 'next/server';
import { sendAuthEmail } from '@/services/emailService';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // F-049-02: Rate limit email dispatch (5 per hour per IP)
    const identifier = getClientIdentifier(request);
    if (!checkRateLimit(identifier, 5, 60 * 60 * 1000, 'send-auth-email')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { to, type, language, confirmationUrl: _clientUrl } = await request.json();
    
    // Validate inputs (confirmationUrl no longer required from client)
    if (!to || !type || !language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate email type
    if (type !== 'confirmSignup' && type !== 'resetPassword' && type !== 'magicLink') {
      return NextResponse.json(
        { error: 'Invalid email type' },
        { status: 400 }
      );
    }
    
    // Validate language
    if (language !== 'en' && language !== 'de' && language !== 'ar' && language !== 'tr') {
      return NextResponse.json(
        { error: 'Invalid language' },
        { status: 400 }
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
    
    // Send email
    const result = await sendAuthEmail(to, type, language, confirmationUrl);
    
    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    console.error('Failed to send auth email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}


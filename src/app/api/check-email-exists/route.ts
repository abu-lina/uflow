import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // 5 attempts per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = ip;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (current.count >= RATE_LIMIT) {
    return false;
  }

  current.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { email } = await request.json();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // F-049-12: Log security event without PII
    console.log(`[SECURITY] Email check attempt from IP: ${ip}`);

    // Use admin API to check user existence and metadata
    // Use pagination to handle large user lists (same approach as login route)
    const supabaseAdmin = getSupabaseAdmin();
    let user = null;
    let page = 1;
    const perPage = 1000;
    let error: { message: string } | null = null;

    while (user === null) {
      const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      });

      if (listError) {
        error = listError;
        break;
      }

      user = data.users.find(u => u.email === email);

      // If found or reached end of list, break
      if (user || data.users.length < perPage) {
        break;
      }

      page++;
    }

    if (error) {
      console.error('[SECURITY] Database error during email check:', error);
      return NextResponse.json(
        { error: 'Failed to check email' },
        { status: 500 }
      );
    }

    // F-049-04: Reduce user enumeration.
    // Unify "not found" and "found but not confirmed" into the same response
    // so attackers cannot distinguish unregistered from unconfirmed accounts.
    // Only confirmed accounts are distinguishable (required for login flow).
    // userId is never returned to prevent data leakage.
    if (!user) {
      return NextResponse.json({ 
        confirmed: false,
        message: 'If this email is registered, you will receive further instructions.'
      });
    }

    const emailConfirmed = 
      user.email_confirmed_at !== null || 
      user.user_metadata?.email_confirmed === true;

    if (!emailConfirmed) {
      // Same response as "not found" to prevent enumeration
      return NextResponse.json({ 
        confirmed: false,
        message: 'If this email is registered, you will receive further instructions.'
      });
    }
    
    return NextResponse.json({ 
      confirmed: true,
      message: 'If this email is registered, you will receive further instructions.'
    });
  } catch (error) {
    console.error('[SECURITY] Check email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization - only creates client when first accessed
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

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

    // Log security event
    console.log(`[SECURITY] Email check attempt for: ${email} from IP: ${ip}`);

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

    // Always return same response to prevent email enumeration
    if (!user) {
      // Log potential enumeration attempt
      console.log(`[SECURITY] Email not found: ${email} from IP: ${ip}`);
      
      return NextResponse.json({ 
        exists: false,
        confirmed: false,
        message: 'Email not found'
      });
    }

    // Log successful lookup
    console.log(`[SECURITY] Email found: ${email} from IP: ${ip}`);
    
    // Check both Supabase's email_confirmed_at and our custom metadata field
    // User is confirmed if either field indicates confirmation
    const emailConfirmed = 
      user.email_confirmed_at !== null || 
      user.user_metadata?.email_confirmed === true;
    
    return NextResponse.json({ 
      exists: true,
      confirmed: emailConfirmed,
      userId: user.id
    });
  } catch (error) {
    console.error('[SECURITY] Check email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
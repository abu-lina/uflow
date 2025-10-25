import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Rate limiting storage (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const current = rateLimitMap.get(ip);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxAttempts) {
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
        { error: 'Too many password reset attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { token, email, password } = await request.json();
    
    if (!token || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Log security event
    console.log(`[SECURITY] Password reset attempt for: ${email} from IP: ${ip}`);

    // Validate token from database
    console.log(`[RESET] Validating token for email: ${email}`);
    
    const supabaseAdmin = getSupabaseAdmin();
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('email_confirmation_tokens')
      .select('*')
      .eq('token', token)
      .eq('email', email)
      .eq('type', 'password_reset')
      .eq('used', false)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error(`[RESET] Token validation failed:`, {
        email,
        tokenError: tokenError ? {
          message: tokenError.message,
          details: tokenError.details,
          hint: tokenError.hint,
          code: tokenError.code
        } : null,
        hasTokenData: !!tokenData
      });
      return NextResponse.json(
        { 
          error: 'Invalid or expired reset link',
          details: tokenError?.message || 'Token not found'
        },
        { status: 400 }
      );
    }
    
    console.log(`[RESET] Token found, checking expiration and usage status`);

    // Check if token is expired
    if (new Date() > new Date(tokenData.expires_at)) {
      console.log(`[SECURITY] Expired token attempt for: ${email} from IP: ${ip}`);
      return NextResponse.json(
        { error: 'Reset link has expired' },
        { status: 400 }
      );
    }

    // Check if token is already used
    if (tokenData.used) {
      console.log(`[SECURITY] Already used token attempt for: ${email} from IP: ${ip}`);
      return NextResponse.json(
        { error: 'Reset link has already been used' },
        { status: 400 }
      );
    }

    // Mark token as used
    const { error: updateTokenError } = await supabaseAdmin
      .from('email_confirmation_tokens')
      .update({ used: true, updated_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    if (updateTokenError) {
      console.error('Error updating token:', updateTokenError);
      return NextResponse.json(
        { error: 'Failed to process reset request' },
        { status: 500 }
      );
    }

    // Update user password in Supabase auth system
    const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      {
        password: password
      }
    );

    if (updateUserError) {
      console.error('[SECURITY] Error updating password:', updateUserError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Log successful password reset
    console.log(`[SECURITY] Password successfully reset for: ${email} from IP: ${ip}`);

    return NextResponse.json({ 
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

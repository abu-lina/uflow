import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Rate limiting for confirmation attempts
const confirmationRateLimit = new Map<string, { count: number; resetTime: number }>();
const CONFIRMATION_RATE_LIMIT = 3; // 3 attempts per hour
const CONFIRMATION_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkConfirmationRateLimit(ip: string): boolean {
  const now = Date.now();
  const current = confirmationRateLimit.get(ip);

  if (!current || now > current.resetTime) {
    confirmationRateLimit.set(ip, { count: 1, resetTime: now + CONFIRMATION_RATE_WINDOW });
    return true;
  }

  if (current.count >= CONFIRMATION_RATE_LIMIT) {
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
    if (!checkConfirmationRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many confirmation attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { token, email } = await request.json();
    
    if (!token || !email) {
      return NextResponse.json(
        { error: 'Missing token or email' },
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

    // Log security event
    console.log(`[SECURITY] Email confirmation attempt for: ${email} from IP: ${ip}`);

    // Validate token from database
    console.log(`[CONFIRM] Validating token for email: ${email}`);
    
    const supabaseAdmin = getSupabaseAdmin();
    
    // First try to find token in our custom email_confirmation_tokens table
    let { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('email_confirmation_tokens')
      .select('*')
      .eq('token', token)
      .eq('email', email)
      .eq('used', false)
      .maybeSingle();
    
    // If not found in custom table, try Supabase auth system
    if (!tokenData && !tokenError) {
      console.log(`[CONFIRM] Token not found in custom table, checking Supabase auth system`);
      
      // For Supabase auth system, we need to verify the token_hash with Supabase
      try {
        // Use the correct Supabase method to verify the token
        const { data: authData, error: authError } = await supabaseAdmin.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        });
        
        if (authError || !authData.user) {
          console.log(`[CONFIRM] Supabase auth verification failed:`, authError);
          // Convert AuthError to a format that matches our error handling
          tokenError = {
            name: 'AuthError',
            message: authError?.message || 'Authentication failed',
            details: authError?.message || 'Token verification failed',
            hint: authError?.message || 'Token verification failed',
            code: authError?.status?.toString() || '400',
            toJSON() {
              return { name: this.name, message: this.message, details: this.details, hint: this.hint, code: this.code };
            }
          };
        } else {
          console.log(`[CONFIRM] Supabase auth verification successful for user:`, authData.user.email);
          // Create a mock tokenData object for the Supabase flow
          tokenData = {
            id: 'supabase-auth',
            user_id: authData.user.id,
            email: authData.user.email,
            token: token,
            type: 'signup',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
            used: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
      } catch (authVerifyError) {
        console.error(`[CONFIRM] Error verifying Supabase auth token:`, authVerifyError);
        tokenError = {
          name: 'AuthVerifyError',
          message: authVerifyError instanceof Error ? authVerifyError.message : 'Token verification failed',
          details: authVerifyError instanceof Error ? authVerifyError.message : 'Token verification failed',
          hint: authVerifyError instanceof Error ? authVerifyError.message : 'Token verification failed',
          code: '500',
          toJSON() {
            return { name: this.name, message: this.message, details: this.details, hint: this.hint, code: this.code };
          }
        };
      }
    }

    if (tokenError || !tokenData) {
      console.error(`[CONFIRM] Token validation failed:`, {
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
          error: 'Invalid or expired confirmation link',
          details: tokenError?.message || 'Token not found'
        },
        { status: 400 }
      );
    }
    
    console.log(`[CONFIRM] Token found, checking expiration and usage status`);

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log(`[SECURITY] Expired token attempt for: ${email} from IP: ${ip}`);
      return NextResponse.json(
        { error: 'Confirmation link has expired' },
        { status: 400 }
      );
    }

    // Check if token is already used
    if (tokenData.used) {
      console.log(`[SECURITY] Already used token attempt for: ${email} from IP: ${ip}`);
      return NextResponse.json(
        { error: 'Confirmation link has already been used' },
        { status: 400 }
      );
    }

    // Mark token as used (only for custom tokens, not Supabase auth tokens)
    if (tokenData.id !== 'supabase-auth') {
      const { error: updateTokenError } = await supabaseAdmin
        .from('email_confirmation_tokens')
        .update({ used: true, updated_at: new Date().toISOString() })
        .eq('id', tokenData.id);

      if (updateTokenError) {
        console.error('Error updating token:', updateTokenError);
        return NextResponse.json(
          { error: 'Failed to process confirmation' },
          { status: 500 }
        );
      }
    }

    // Confirm email in Supabase auth system
    const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      {
        email_confirm: true, // This sets email_confirmed_at in auth.users
        user_metadata: {
          email_confirmed: true,
          email_confirmed_at: new Date().toISOString()
        }
      }
    );

    if (updateUserError) {
      console.error('[SECURITY] Error updating user:', updateUserError);
      return NextResponse.json(
        { error: 'Failed to confirm email' },
        { status: 500 }
      );
    }

    // Log successful confirmation
    console.log(`[SECURITY] Email successfully confirmed for: ${email} from IP: ${ip}`);

    return NextResponse.json({ 
      success: true,
      message: 'Email confirmed successfully'
    });
  } catch (error) {
    console.error('Email confirmation error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm email' },
      { status: 500 }
    );
  }
}

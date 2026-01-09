import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getClientIP,
  checkIPBlocked,
} from '@/utils/security';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

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

/**
 * Check if request is in test mode (bypasses rate limiting)
 */
function isTestMode(request: Request): boolean {
  const testApiKey = request.headers.get('x-test-api-key');
  const expectedKey = process.env.TEST_API_KEY;
  
  if (testApiKey && expectedKey && testApiKey === expectedKey) {
    return true;
  }
  
  return process.env.NODE_ENV === 'test';
}

export async function POST(request: Request) {
  const ip = getClientIP(request);
  
  console.log('[VERIFY MAGIC LINK API] ========================================');
  console.log('[VERIFY MAGIC LINK API] Magic link verification request received');
  console.log('[VERIFY MAGIC LINK API] IP:', ip);
  console.log('[VERIFY MAGIC LINK API] ========================================');
  
  try {
    const isTest = isTestMode(request);
    
    // 1. Check if IP is blocked (unless test mode)
    if (!isTest && checkIPBlocked(ip)) {
      console.log('[VERIFY MAGIC LINK API] Blocked IP attempted verification:', ip);
      return NextResponse.json(
        { error: 'Access temporarily restricted. Please try again later.' },
        { status: 403 }
      );
    }
    
    // 2. Rate limiting: 10 verification attempts per hour per IP
    const identifier = getClientIdentifier(request);
    const rateLimit = isTest ? 1000 : 10;
    const rateLimitWindow = isTest ? 60 * 1000 : 60 * 60 * 1000;
    
    if (!checkRateLimit(identifier, rateLimit, rateLimitWindow, 'verify-magic-link')) {
      console.log('[VERIFY MAGIC LINK API] Rate limit exceeded for IP:', ip);
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    const body = await request.json();
    const { token, email } = body;
    
    // 3. Validate input
    if (!token || !email) {
      console.error('[VERIFY MAGIC LINK API] Missing token or email');
      return NextResponse.json(
        { error: 'Missing token or email' },
        { status: 400 }
      );
    }
    
    // 4. Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('[VERIFY MAGIC LINK API] Invalid email format:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    console.log('[VERIFY MAGIC LINK API] Verifying token for email:', email);
    
    // 5. Verify token from database
    const supabaseAdmin = getSupabaseAdmin();
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('email_confirmation_tokens')
      .select('*')
      .eq('token', token)
      .eq('email', email)
      .eq('type', 'magic_link')
      .eq('used', false)
      .maybeSingle();
    
    if (tokenError) {
      console.error('[VERIFY MAGIC LINK API] Database error:', tokenError);
      return NextResponse.json(
        { error: 'Failed to verify token' },
        { status: 500 }
      );
    }
    
    if (!tokenData) {
      console.log('[VERIFY MAGIC LINK API] Token not found or already used');
      return NextResponse.json(
        { error: 'Invalid or expired magic link. Please request a new one.' },
        { status: 400 }
      );
    }
    
    // 6. Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log('[VERIFY MAGIC LINK API] Token expired');
      return NextResponse.json(
        { error: 'Magic link has expired. Please request a new one.' },
        { status: 400 }
      );
    }
    
    // 7. Mark token as used
    const { error: updateError } = await supabaseAdmin
      .from('email_confirmation_tokens')
      .update({ used: true, updated_at: new Date().toISOString() })
      .eq('id', tokenData.id);
    
    if (updateError) {
      console.error('[VERIFY MAGIC LINK API] Error marking token as used:', updateError);
      // Continue anyway - token verification succeeded
    }
    
    console.log('[VERIFY MAGIC LINK API] ✅ Token verified successfully');
    
    // 8. Get user to check if they need email confirmation
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('[VERIFY MAGIC LINK API] Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      );
    }
    
    const user = users.find(u => u.id === tokenData.user_id);
    
    if (!user) {
      console.error('[VERIFY MAGIC LINK API] User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (!user.email) {
      console.error('[VERIFY MAGIC LINK API] User email not found');
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }
    
    // 9. Confirm email if not already confirmed
    const isConfirmed = user.email_confirmed_at !== null || user.user_metadata?.email_confirmed === true;
    
    if (!isConfirmed) {
      console.log('[VERIFY MAGIC LINK API] Confirming email for user');
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
          email_confirm: true,
          user_metadata: {
            ...user.user_metadata,
            email_confirmed: true,
            email_confirmed_at: new Date().toISOString()
          }
        }
      );
      
      if (confirmError) {
        console.error('[VERIFY MAGIC LINK API] Error confirming email:', confirmError);
        // Continue anyway - we can still create a session
      } else {
        console.log('[VERIFY MAGIC LINK API] ✅ Email confirmed');
      }
    }
    
    // 10. Create a session using Supabase Admin API
    // Generate a Supabase magic link to get a hashed_token for session creation
    const requestOrigin = request.headers.get('origin') || 
                         request.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
                         process.env.NEXT_PUBLIC_SITE_URL || 
                         'http://localhost:3000';
    
    // Generate a Supabase magic link (this creates a proper hashed_token)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: {
        redirectTo: `${requestOrigin}/auth/callback`,
      }
    });
    
    if (linkError) {
      console.error('[VERIFY MAGIC LINK API] Error generating session link:', linkError);
      return NextResponse.json(
        { error: 'Failed to create session. Please try again.' },
        { status: 500 }
      );
    }
    
    // Extract the hashed_token from the link data
    // generateLink returns properties.hashed_token which we can use with verifyOtp
    const hashedToken = linkData.properties?.hashed_token;
    
    if (!hashedToken) {
      console.error('[VERIFY MAGIC LINK API] No hashed_token in response');
      console.error('[VERIFY MAGIC LINK API] Link data:', JSON.stringify(linkData, null, 2));
      return NextResponse.json(
        { error: 'Failed to generate session token' },
        { status: 500 }
      );
    }
    
    console.log('[VERIFY MAGIC LINK API] ✅ Generated hashed token for session');
    
    // Return the hashed token and user info
    // The client will use this hashed_token with verifyOtp to create the session
    return NextResponse.json({
      success: true,
      hashedToken,
      user: {
        id: user.id,
        email: user.email,
      }
    });
    
  } catch (error) {
    console.error('[VERIFY MAGIC LINK API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

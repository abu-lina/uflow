import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getClientIP,
  checkIPBlocked,
} from '@/utils/security';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logAuth } from '@/lib/logger';

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
  const startTime = Date.now();
  const ip = getClientIP(request);
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify-magic-link/route.ts:45',message:'POST request received',data:{ip,startTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
  // #endregion
  
  logAuth('info', {
    event: 'token_verification_request',
    ip,
  });
  
  try {
    const isTest = isTestMode(request);
    
    const body = await request.json();
    const { token, email } = body;
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify-magic-link/route.ts:58',message:'Request body parsed',data:{hasToken:!!token,tokenLength:token?.length,hasEmail:!!email,email,isTest},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
    // #endregion
    
    // 1. Validate input first
    if (!token || !email) {
      logAuth('warn', {
        event: 'token_verification_missing_input',
        ip,
      });
      return NextResponse.json(
        { error: 'Missing token or email' },
        { status: 400 }
      );
    }
    
    // 2. Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      logAuth('warn', {
        event: 'token_verification_invalid_email',
        ip,
        email,
      });
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // 3. Verify token from database FIRST
    // If token is valid, we allow verification even if IP is blocked
    // because the token itself proves legitimacy
    const supabaseAdmin = getSupabaseAdmin();
    
    // #region agent log
    console.log('[VERIFY MAGIC LINK] Before database query:', {
      token: token?.substring(0, 8) + '...',
      tokenLength: token?.length,
      email,
      emailLower: email.toLowerCase(),
      emailTrimmed: email.trim(),
    });
    // #endregion
    
    // First, check if token exists at all (regardless of email) for debugging
    const { data: tokenByTokenOnly } = await supabaseAdmin
      .from('email_confirmation_tokens')
      .select('*')
      .eq('token', token)
      .eq('type', 'magic_link')
      .maybeSingle();
    
    console.log('[VERIFY MAGIC LINK] Token lookup (token only):', {
      found: !!tokenByTokenOnly,
      storedEmail: tokenByTokenOnly?.email,
      providedEmail: email,
      emailsMatch: tokenByTokenOnly?.email?.toLowerCase() === email.toLowerCase(),
      used: tokenByTokenOnly?.used,
      expiresAt: tokenByTokenOnly?.expires_at,
    });
    
    // Try exact match first
    let { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('email_confirmation_tokens')
      .select('*')
      .eq('token', token)
      .eq('email', email)
      .eq('type', 'magic_link')
      .eq('used', false)
      .maybeSingle();
    
    // #region agent log
    console.log('[VERIFY MAGIC LINK] Query result (exact match):', {
      hasTokenData: !!tokenData,
      hasTokenError: !!tokenError,
      tokenError: tokenError?.message,
      tokenDataId: tokenData?.id,
      tokenDataEmail: tokenData?.email,
      tokenDataUsed: tokenData?.used,
      tokenDataExpiresAt: tokenData?.expires_at,
    });
    // #endregion
    
    // If not found, try case-insensitive email match (email might be stored differently)
    if (!tokenData && !tokenError) {
      console.log('[VERIFY MAGIC LINK] Trying case-insensitive email match...');
      const { data: tokenDataCaseInsensitive } = await supabaseAdmin
        .from('email_confirmation_tokens')
        .select('*')
        .eq('token', token)
        .ilike('email', email)
        .eq('type', 'magic_link')
        .eq('used', false)
        .maybeSingle();
      
      if (tokenDataCaseInsensitive) {
        console.log('[VERIFY MAGIC LINK] Found token with case-insensitive match:', {
          storedEmail: tokenDataCaseInsensitive.email,
          providedEmail: email,
        });
        tokenData = tokenDataCaseInsensitive;
      }
    }
    
    // #region agent log
    console.log('[VERIFY MAGIC LINK] Final token data after all queries:', {
      hasTokenData: !!tokenData,
      tokenDataEmail: tokenData?.email,
    });
    // #endregion
    
    if (tokenError) {
      logAuth('error', {
        event: 'token_verification_database_error',
        ip,
        email,
        error: tokenError.message || 'Database error',
        duration: Date.now() - startTime,
      });
      return NextResponse.json(
        { error: 'Failed to verify token' },
        { status: 500 }
      );
    }
    
    // 4. Check if token is valid
    // If token is valid, allow verification even if IP is blocked
    // because the token itself proves legitimacy
    const now = new Date();
    const expiresAt = tokenData ? new Date(tokenData.expires_at) : null;
    const isTokenValid = tokenData && expiresAt && expiresAt >= now;
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify-magic-link/route.ts:115',message:'Token validity check',data:{isTokenValid,hasTokenData:!!tokenData,expiresAt:expiresAt?.toISOString(),now:now.toISOString(),isExpired:expiresAt?expiresAt<now:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    
    if (!isTokenValid) {
      // Token is invalid - apply rate limiting and IP blocking to prevent brute force
      const identifier = getClientIdentifier(request);
      const rateLimit = isTest ? 1000 : 10;
      const rateLimitWindow = isTest ? 60 * 1000 : 60 * 60 * 1000;
      
      if (!checkRateLimit(identifier, rateLimit, rateLimitWindow, 'verify-magic-link')) {
        logAuth('warn', {
          event: 'token_verification_rate_limit_exceeded',
          ip,
          email,
          duration: Date.now() - startTime,
        });
        return NextResponse.json(
          { error: 'Too many verification attempts. Please try again later.' },
          { status: 429 }
        );
      }
      
      // Check IP blocking for invalid tokens
      const ipBlocked = !isTest && checkIPBlocked(ip);
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify-magic-link/route.ts:137',message:'IP blocking check for invalid token',data:{ip,isTest,ipBlocked,isTokenValid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      if (ipBlocked) {
        logAuth('warn', {
          event: 'token_verification_blocked_ip',
          ip,
          email,
          tokenValid: false,
          ipBlocked: true,
          duration: Date.now() - startTime,
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify-magic-link/route.ts:148',message:'Returning IP blocked error',data:{ip,email,error:'Access temporarily restricted'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
        return NextResponse.json(
          { error: 'Access temporarily restricted. Please try again later.' },
          { status: 403 }
        );
      }
      
      // Token invalid but IP not blocked - return token error
      if (!tokenData) {
        logAuth('warn', {
          event: 'token_verification_not_found',
          ip,
          email,
          tokenValid: false,
          duration: Date.now() - startTime,
        });
        return NextResponse.json(
          { error: 'Invalid or expired magic link. Please request a new one.' },
          { status: 400 }
        );
      }
      
      logAuth('warn', {
        event: 'token_verification_expired',
        ip,
        email,
        tokenValid: false,
        duration: Date.now() - startTime,
      });
      return NextResponse.json(
        { error: 'Magic link has expired. Please request a new one.' },
        { status: 400 }
      );
    }
    
    // Token is valid - proceed with verification even if IP is blocked
    // The valid token proves the user is legitimate, so we bypass IP blocking
    const ipBlocked = !isTest && checkIPBlocked(ip);
    if (ipBlocked) {
      logAuth('info', {
        event: 'token_verification_bypass_ip_block',
        ip,
        email,
        tokenValid: true,
        ipBlocked: true,
        bypassed: true,
      });
    }
    
    // 7. Mark token as used
    const { error: updateError } = await supabaseAdmin
      .from('email_confirmation_tokens')
      .update({ used: true, updated_at: new Date().toISOString() })
      .eq('id', tokenData.id);
    
    if (updateError) {
      logAuth('warn', {
        event: 'token_verification_update_error',
        ip,
        email,
        error: updateError.message || 'Failed to mark token as used',
        // Continue anyway - token verification succeeded
      });
    }
    
    // 8. Get user to check if they need email confirmation
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      logAuth('error', {
        event: 'token_verification_user_fetch_error',
        ip,
        email,
        error: userError.message || 'Failed to fetch user',
        duration: Date.now() - startTime,
      });
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      );
    }
    
    const user = users.find(u => u.id === tokenData.user_id);
    
    if (!user) {
      logAuth('error', {
        event: 'token_verification_user_not_found',
        ip,
        email,
        duration: Date.now() - startTime,
      });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (!user.email) {
      logAuth('error', {
        event: 'token_verification_user_email_missing',
        ip,
        email,
        duration: Date.now() - startTime,
      });
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }
    
    // 9. Confirm email if not already confirmed
    const isConfirmed = user.email_confirmed_at !== null || user.user_metadata?.email_confirmed === true;
    
    if (!isConfirmed) {
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
        logAuth('warn', {
          event: 'token_verification_email_confirm_error',
          ip,
          email,
          error: confirmError.message || 'Failed to confirm email',
          // Continue anyway - we can still create a session
        });
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
      logAuth('error', {
        event: 'token_verification_session_link_error',
        ip,
        email,
        error: linkError.message || 'Failed to generate session link',
        duration: Date.now() - startTime,
      });
      return NextResponse.json(
        { error: 'Failed to create session. Please try again.' },
        { status: 500 }
      );
    }
    
    // Extract the hashed_token from the link data
    // generateLink returns properties.hashed_token which we can use with verifyOtp
    const hashedToken = linkData.properties?.hashed_token;
    
    if (!hashedToken) {
      logAuth('error', {
        event: 'token_verification_missing_hashed_token',
        ip,
        email,
        error: 'No hashed_token in generateLink response',
        duration: Date.now() - startTime,
      });
      return NextResponse.json(
        { error: 'Failed to generate session token' },
        { status: 500 }
      );
    }
    
    const duration = Date.now() - startTime;
    logAuth('info', {
      event: 'token_verification_success',
      ip,
      email,
      tokenValid: true,
      ipBlocked: ipBlocked,
      bypassed: ipBlocked,
      duration,
    });
    
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
    logAuth('error', {
      event: 'token_verification_unexpected_error',
      ip,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

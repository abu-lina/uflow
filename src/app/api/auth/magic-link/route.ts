import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  checkRateLimit,
  getClientIdentifier,
} from '@/lib/rate-limit';
import {
  getClientIP,
  checkIPBlocked,
  markSuspiciousIP,
  isDisposableEmail,
  isSuspiciousTiming,
} from '@/utils/security';
import { sendAuthEmail } from '@/services/emailService';

/**
 * Check if request is in test mode (bypasses rate limiting)
 */
function isTestMode(request: Request): boolean {
  const testApiKey = request.headers.get('x-test-api-key');
  const expectedKey = process.env.TEST_API_KEY;
  
  if (testApiKey && expectedKey && testApiKey === expectedKey) {
    return true;
  }
  
  // Also check NODE_ENV for test mode
  return process.env.NODE_ENV === 'test';
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const ip = getClientIP(request);
  
  console.log('[MAGIC LINK API] ========================================');
  console.log('[MAGIC LINK API] Magic link request received');
  console.log('[MAGIC LINK API] IP:', ip);
  console.log('[MAGIC LINK API] NODE_ENV:', process.env.NODE_ENV);
  console.log('[MAGIC LINK API] Using Resend for branded emails');
  console.log('[MAGIC LINK API] ========================================');
  
  try {
    const isTest = isTestMode(request);
    const identifier = getClientIdentifier(request);
    
    // Parse request body early for use in diagnostic URLs (before early returns)
    // Store the parsed body so we can reuse it later
    let body: { email?: string; language?: string } = {};
    let email = '';
    try {
      body = await request.json();
      email = body.email || '';
    } catch {
      // Request body parsing failed or missing - body and email will remain empty
      // This is OK for early returns where we just need it for diagnostic URLs
    }
    
    // 1. Check if IP is blocked (unless test mode or localhost in development)
    // NOTE: For magic links, we're more lenient - only block if explicitly marked as suspicious
    // This prevents false positives from rate limiting
    const ipBlocked = !isTest && checkIPBlocked(ip);
    
    // Log IP blocking status for debugging (will show in server logs)
    if (ipBlocked) {
      console.error('[MAGIC LINK API] ⚠️ BLOCKED IP attempted magic link:', ip);
      console.error('[MAGIC LINK API] Identifier:', identifier);
      console.error('[MAGIC LINK API] This IP was previously marked as suspicious');
      console.error('[MAGIC LINK API] To unblock, contact admin or wait for block to expire');
    } else {
      console.log('[MAGIC LINK API] ✅ IP not blocked:', ip);
    }
    
    // TEMPORARY: For UAT debugging, log but don't block if it's a magic link request
    // This helps identify if IP blocking is the issue
    // TODO: Remove this after identifying root cause
    const shouldBlock = ipBlocked && process.env.NODE_ENV === 'production';
    
    if (shouldBlock) {
      return NextResponse.json(
        { 
          error: 'Access temporarily restricted. Please try again later.',
          code: 'IP_BLOCKED',
          ip,
          identifier,
          message: 'Your IP address has been temporarily blocked due to suspicious activity. Please contact support if you believe this is an error.',
          diagnosticUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://uat.ummahflow.com'}/api/auth/magic-link-diagnostic?email=${encodeURIComponent(email || '')}`,
          debug: process.env.NODE_ENV !== 'production' ? { ipBlocked, identifier } : undefined
        },
        { status: 403 }
      );
    } else if (ipBlocked) {
      // In non-production, log but allow (for debugging)
      console.warn('[MAGIC LINK API] ⚠️ IP would be blocked in production, but allowing in', process.env.NODE_ENV);
    }
    
    console.log('[MAGIC LINK API] IP blocking check passed');

    // 2. Rate limiting: 10 magic links per hour per IP (bypassed in test mode)
    const rateLimit = isTest ? 1000 : 10; // Higher limit than signup since it's passwordless
    const rateLimitWindow = isTest ? 60 * 1000 : 60 * 60 * 1000; // 1 min in test, 1 hour in prod
    const rateLimitAllowed = checkRateLimit(identifier, rateLimit, rateLimitWindow, 'magic-link');
    
    if (!rateLimitAllowed) {
      if (!isTest) {
        markSuspiciousIP(ip, 0.25); // Block for 15 minutes
      }
      console.log('[MAGIC LINK API] Rate limit exceeded for IP:', ip);
      console.log('[MAGIC LINK API] Identifier:', identifier);
      const requestOrigin = request.headers.get('origin') || 
                           request.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
                           process.env.NEXT_PUBLIC_SITE_URL || 
                           'https://uat.ummahflow.com';
      
      return NextResponse.json(
        { 
          error: 'Too many magic link requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          ip,
          limit: rateLimit,
          window: `${rateLimitWindow / 1000 / 60} minutes`,
          diagnosticUrl: `${requestOrigin}/api/auth/magic-link-diagnostic?email=${encodeURIComponent(email || '')}`,
          message: `You have exceeded the limit of ${rateLimit} requests per ${rateLimitWindow / 1000 / 60} minutes. Please wait before trying again.`
        },
        { status: 429 }
      );
    }

    // Extract language from already-parsed body (email already extracted above)
    const { language } = body;
    
    // 3. Validate input
    if (!email) {
      console.error('[MAGIC LINK API] Missing email');
      return NextResponse.json(
        { error: 'Missing email' },
        { status: 400 }
      );
    }
    
    // 4. Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('[MAGIC LINK API] Invalid email format:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // 5. Disposable email check
    if (isDisposableEmail(email)) {
      console.log('[MAGIC LINK API] Disposable email blocked:', email);
      return NextResponse.json(
        { error: 'Disposable email addresses are not allowed' },
        { status: 400 }
      );
    }
    
    // 6. Request timing check (too fast = likely bot) - skip in test mode
    if (!isTest && isSuspiciousTiming(startTime)) {
      markSuspiciousIP(ip, 1);
      console.log('[MAGIC LINK API] Suspiciously fast request from IP:', ip);
    }
    
    console.log('[MAGIC LINK API] Received magic link request:', { email, language });
    
    // 7. Check if user exists, create if not
    // Use pagination to find user (handles large user lists)
    const supabaseAdmin = getSupabaseAdmin();
    let user = null;
    let page = 1;
    const perPage = 1000;
    
    while (user === null) {
      const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      });
      
      if (listError) {
        console.error('[MAGIC LINK API] Error checking existing users:', listError);
        return NextResponse.json(
          { error: 'Failed to verify user' },
          { status: 500 }
        );
      }
      
      user = data.users.find(u => u.email === email);
      
      // If found or reached end of list, break
      if (user || data.users.length < perPage) {
        break;
      }
      
      page++;
    }
    
    // If user doesn't exist, create them automatically (passwordless signup)
    if (!user) {
      console.log('[MAGIC LINK API] User not found, creating new user:', email);
      
      // Generate a random password (required by Supabase, but user won't use it)
      const randomPassword = crypto.randomBytes(32).toString('hex');
      
      // For magic link signup, don't auto-confirm - let the magic link confirm the email
      // This ensures Supabase generates a proper magic link token
      // Auto-confirm only in test mode for convenience
      const emailConfirm = isTest ? true : false;
      
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: emailConfirm,
        user_metadata: {
          language: language || 'en',
          preferred_language: language || 'en',
          email_confirmed: emailConfirm,
          email_only_signup: true, // Track that user signed up via magic link
        }
      });
      
      if (createError) {
        console.error('[MAGIC LINK API] Error creating user:', createError);
        return NextResponse.json(
          { error: createError.message || 'Failed to create user' },
          { status: 500 }
        );
      }
      
      if (!newUserData.user) {
        console.error('[MAGIC LINK API] No user data returned after creation');
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
      
      user = newUserData.user;
      console.log('[MAGIC LINK API] ✅ New user created successfully:', email);
      console.log('[MAGIC LINK API] User email confirmed:', user.email_confirmed_at !== null);
      
      // Log consent for magic link signup (GDPR compliance)
      const userAgent = request.headers.get('user-agent') || null;
      const consentLogs = [
        {
          user_id: user.id,
          consent_type: 'terms_of_service',
          accepted: true,
          accepted_at: new Date().toISOString(),
          ip_address: ip,
          user_agent: userAgent,
        },
        {
          user_id: user.id,
          consent_type: 'privacy_policy',
          accepted: true,
          accepted_at: new Date().toISOString(),
          ip_address: ip,
          user_agent: userAgent,
        },
      ];

      const { error: consentError } = await supabaseAdmin
        .from('consent_logs')
        .insert(consentLogs);

      if (consentError) {
        console.error('[MAGIC LINK API] Error logging consent:', consentError);
        // Continue anyway - user creation succeeded
      } else {
        console.log('[MAGIC LINK API] ✅ Consent logged for new user');
      }
    }

    // 8. Magic links work for both confirmed and unconfirmed users
    // For unconfirmed users, the magic link will confirm the email
    // For confirmed users, the magic link will sign them in
    const isConfirmed = user.email_confirmed_at !== null || user.user_metadata?.email_confirmed === true;
    console.log('[MAGIC LINK API] User email confirmed status:', isConfirmed);
    
    // 9. Generate custom magic link token (bypasses PKCE flow issues)
    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration
    
    console.log('[MAGIC LINK API] Generated custom magic link token');
    console.log('[MAGIC LINK API] Token expires at:', expiresAt.toISOString());
    
    // Store token in database
    const { error: tokenError } = await supabaseAdmin
      .from('email_confirmation_tokens')
      .insert({
        user_id: user.id,
        email,
        token,
        type: 'magic_link',
        expires_at: expiresAt.toISOString(),
        used: false
      })
      .select()
      .single();
    
    if (tokenError) {
      console.error('[MAGIC LINK API] Error storing token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate magic link token' },
        { status: 500 }
      );
    }
    
    console.log('[MAGIC LINK API] ✅ Token stored successfully');
    
    // 10. Build callback URL pointing to our app (not Supabase)
    // Use request origin for redirect URL to match the current environment
    // Priority: origin header > referer header > NEXT_PUBLIC_SITE_URL > localhost:3000
    let requestOrigin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    
    if (!requestOrigin) {
      if (referer) {
        try {
          const refererUrl = new URL(referer);
          requestOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
        } catch {
          // Invalid referer, fall through
        }
      }
    }
    
    if (!requestOrigin) {
      requestOrigin = process.env.NEXT_PUBLIC_SITE_URL || null;
    }
    
    if (!requestOrigin) {
      // Default to localhost:3000 for development
      requestOrigin = 'http://localhost:3000';
    }
    
    // Use our custom callback endpoint with token parameter
    const magicLinkUrl = `${requestOrigin}/auth/callback?magic_token=${token}&email=${encodeURIComponent(email)}`;
    
    console.log('[MAGIC LINK API] Generated magic link URL');
    console.log('[MAGIC LINK API] Request origin:', requestOrigin);
    console.log('[MAGIC LINK API] Magic link URL (first 100 chars):', magicLinkUrl.substring(0, 100));
    
    // 11. Send branded email via Resend
    const emailLanguage = (language === 'en' || language === 'de' || language === 'ar' || language === 'tr') 
      ? language 
      : 'de'; // Default to German
    
    try {
      console.log('[MAGIC LINK API] Sending magic link email via Resend...');
      console.log('[MAGIC LINK API] Magic link URL:', magicLinkUrl.substring(0, 100) + '...');
      
      const emailResult = await sendAuthEmail(
        email,
        'magicLink',
        emailLanguage,
        magicLinkUrl
      );
      
      // Extract error to help TypeScript with type narrowing
      const emailError = emailResult.error as { message?: string } | null | undefined;
      
      // Helper to safely get error message
      const getErrorMessage = (err: unknown): string | undefined => {
        if (err && typeof err === 'object' && 'message' in err) {
          return String(err.message);
        }
        return undefined;
      };
      
      // Check if Resend returned an error even though no exception was thrown
      if (emailError) {
        console.error('[MAGIC LINK API] ❌ Resend returned error in response:', emailError);
        const errorDetails = getErrorMessage(emailError) || JSON.stringify(emailError);
        return NextResponse.json(
          { 
            error: 'Failed to send magic link email.',
            code: 'RESEND_API_ERROR',
            details: errorDetails
          },
          { status: 500 }
        );
      }
      
      console.log('[MAGIC LINK API] ✅ Magic link email sent successfully via Resend');
      console.log('[MAGIC LINK API] Resend email ID:', emailResult.data?.id);
    } catch (emailError) {
      console.error('[MAGIC LINK API] ❌ Failed to send email via Resend:', emailError);
      console.error('[MAGIC LINK API] Error details:', {
        message: emailError instanceof Error ? emailError.message : String(emailError),
        stack: emailError instanceof Error ? emailError.stack : undefined
      });
      // Return error - don't silently fail
      const requestOrigin = request.headers.get('origin') || 
                           request.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
                           process.env.NEXT_PUBLIC_SITE_URL || 
                           'https://uat.ummahflow.com';
      
      return NextResponse.json(
        { 
          error: 'Failed to send magic link email. Please check Resend configuration.',
          code: 'EMAIL_SEND_FAILED',
          details: emailError instanceof Error ? emailError.message : String(emailError),
          diagnosticUrl: `${requestOrigin}/api/auth/magic-link-diagnostic?email=${encodeURIComponent(email || '')}`,
          message: 'We were unable to send the magic link email. Please try again or contact support if the problem persists.'
        },
        { status: 500 }
      );
    }
    
    console.log('[MAGIC LINK API] Magic link request complete for:', email);
    
    return NextResponse.json({ 
      success: true,
      message: 'Magic link sent successfully',
      debug: {
        ip,
        identifier,
        email,
        requestOrigin,
        timestamp: new Date().toISOString(),
        diagnosticUrl: `${requestOrigin}/api/auth/magic-link-diagnostic?email=${encodeURIComponent(email)}`
      }
    });
    
  } catch (error) {
    console.error('[MAGIC LINK API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

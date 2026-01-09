import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { 
  checkRateLimit, 
  getClientIdentifier 
} from '@/lib/rate-limit';
import {
  getClientIP,
  checkIPBlocked,
  markSuspiciousIP,
  isDisposableEmail,
  validatePasswordComplexity,
  isSuspiciousTiming,
} from '@/utils/security';

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
  
  // Also check NODE_ENV for test mode
  return process.env.NODE_ENV === 'test';
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const ip = getClientIP(request);
  
  try {
    // Debug: Log header values
    const testApiKeyHeader = request.headers.get('x-test-api-key') || request.headers.get('X-Test-API-Key');
    const expectedKey = process.env.TEST_API_KEY;
    
    const isTest = isTestMode(request);
    
    // Enhanced debug logging
    if (testApiKeyHeader) {
      console.log('[SIGNUP API] Test API key header received:', testApiKeyHeader.substring(0, 10) + '...');
      console.log('[SIGNUP API] Expected key set:', expectedKey ? 'YES' : 'NO');
      console.log('[SIGNUP API] Test mode active:', isTest);
    }
    
    // 1. Check if IP is blocked (unless test mode)
    if (!isTest && checkIPBlocked(ip)) {
      console.log('[SIGNUP API] Blocked IP attempted signup:', ip, '(test mode:', isTest, ')');
      if (testApiKeyHeader && !expectedKey) {
        console.error('[SIGNUP API] ⚠️ TEST_API_KEY not set in server environment!');
      }
      return NextResponse.json(
        { error: 'Access temporarily restricted. Please try again later.' },
        { status: 403 }
      );
    }
    
    // Log test mode status for debugging
    if (isTest) {
      console.log('[SIGNUP API] ✅ Test mode enabled, bypassing security checks for IP:', ip);
    } else if (testApiKeyHeader) {
      console.warn('[SIGNUP API] ⚠️ Test API key provided but test mode not active. Check TEST_API_KEY env var.');
    }

    // 2. Rate limiting: 3 signups per hour per IP (bypassed in test mode)
    const identifier = getClientIdentifier(request);
    const rateLimit = isTest ? 1000 : 3; // Much higher limit in test mode
    const rateLimitWindow = isTest ? 60 * 1000 : 60 * 60 * 1000; // 1 min in test, 1 hour in prod
    
    if (!checkRateLimit(identifier, rateLimit, rateLimitWindow, 'signup')) {
      if (!isTest) {
        markSuspiciousIP(ip, 1); // Block for 1 hour
      }
      console.log('[SIGNUP API] Rate limit exceeded for IP:', ip);
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, language, honeypot, termsAccepted, privacyAccepted, emailOnly } = body;
    
    // 3. Validate consent (GDPR requirement)
    if (termsAccepted !== true || privacyAccepted !== true) {
      console.error('[SIGNUP API] Consent not accepted:', { termsAccepted, privacyAccepted });
      return NextResponse.json(
        { error: 'You must accept the Terms of Service and Privacy Policy to create an account' },
        { status: 400 }
      );
    }
    
    // 4. Honeypot check (should be empty) - skip in test mode
    if (!isTest && honeypot && honeypot.trim() !== '') {
      markSuspiciousIP(ip, 24); // Block for 24 hours
      console.log('[SIGNUP API] Honeypot triggered for IP:', ip);
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // 5. Request timing check (too fast = likely bot) - skip in test mode
    if (!isTest && isSuspiciousTiming(startTime)) {
      markSuspiciousIP(ip, 1);
      console.log('[SIGNUP API] Suspiciously fast request from IP:', ip);
    }
    
    // 6. Validate input
    if (!email) {
      console.error('[SIGNUP API] Missing email');
      return NextResponse.json(
        { error: 'Missing email' },
        { status: 400 }
      );
    }

    // For email-only signup (Stage 2), password is optional
    if (!emailOnly && !password) {
      console.error('[SIGNUP API] Missing password (required for password-based signup)');
      return NextResponse.json(
        { error: 'Missing password' },
        { status: 400 }
      );
    }
    
    // 7. Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('[SIGNUP API] Invalid email format:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // 8. Disposable email check
    if (isDisposableEmail(email)) {
      console.log('[SIGNUP API] Disposable email blocked:', email);
      return NextResponse.json(
        { error: 'Disposable email addresses are not allowed' },
        { status: 400 }
      );
    }
    
    // 9. Enhanced password validation (only if password is provided)
    if (password) {
      const passwordValidation = validatePasswordComplexity(password);
      if (!passwordValidation.valid) {
        console.error('[SIGNUP API] Password validation failed:', passwordValidation.error);
        return NextResponse.json(
          { error: passwordValidation.error || 'Password does not meet requirements' },
          { status: 400 }
        );
      }
    }
    
    console.log('[SIGNUP API] Received signup request:', { email, language });
    
    // Check if user already exists
    console.log('[SIGNUP API] Checking if user exists...');
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[SIGNUP API] Error checking existing users:', listError);
      return NextResponse.json(
        { error: 'Failed to check user existence' },
        { status: 500 }
      );
    }
    
    if (users.some(u => u.email === email)) {
      console.log('[SIGNUP API] User already exists:', email);
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Create user via Admin API - NO auto-login!
    console.log('[SIGNUP API] Creating user with Admin API...');
    // In test mode, auto-confirm email for convenience
    const emailConfirm = isTest ? true : false;
    
    // For email-only signup, generate a random password (user won't use it)
    // Supabase requires a password, but we'll use magic links for authentication
    const userPassword = password || crypto.randomBytes(32).toString('hex');
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: emailConfirm, // Auto-confirm in test mode
      user_metadata: {
        language: language || 'en',
        preferred_language: language || 'en',
        email_confirmed: emailConfirm,
        email_only_signup: emailOnly === true, // Track if user signed up without password
      }
    });
    
    if (error) {
      console.error('[SIGNUP API] Error creating user:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create user' },
        { status: 500 }
      );
    }
    
    if (!data.user) {
      console.error('[SIGNUP API] No user data returned');
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }
    
    console.log('[SIGNUP API] ✅ User created successfully (no session):', email);
    
    // Log consent to consent_logs table (GDPR requirement)
    const userAgent = request.headers.get('user-agent') || null;
    const consentLogs = [
      {
        user_id: data.user.id,
        consent_type: 'terms_of_service',
        accepted: true,
        accepted_at: new Date().toISOString(),
        ip_address: ip,
        user_agent: userAgent,
      },
      {
        user_id: data.user.id,
        consent_type: 'privacy_policy',
        accepted: true,
        accepted_at: new Date().toISOString(),
        ip_address: ip,
        user_agent: userAgent,
      },
    ];

    const { error: consentError } = await getSupabaseAdmin()
      .from('consent_logs')
      .insert(consentLogs);

    if (consentError) {
      console.error('[SIGNUP API] Error logging consent:', consentError);
      // Don't fail signup if consent logging fails, but log the error
    } else {
      console.log('[SIGNUP API] ✅ Consent logged successfully');
    }
    
    // Generate confirmation token
    console.log('[SIGNUP API] Generating confirmation token...');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const { error: tokenError } = await getSupabaseAdmin()
      .from('email_confirmation_tokens')
      .insert({
        user_id: data.user.id,
        email,
        token,
        type: 'signup',
        expires_at: expiresAt.toISOString(),
        used: false
      });
    
    if (tokenError) {
      console.error('[SIGNUP API] Error storing token:', tokenError);
      // User is created but token failed - should still return success
      // User can request resend later
    } else {
      console.log('[SIGNUP API] ✅ Token generated and stored');
    }
    
    // Send confirmation email (skip in test mode)
    if (!isTest) {
      console.log('[SIGNUP API] Sending confirmation email...');
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
      const confirmationUrl = `${siteUrl}/auth/confirm?token=${token}&email=${encodeURIComponent(email)}`;
      
      try {
        const emailResponse = await fetch(`${siteUrl}/api/send-auth-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            type: 'confirmSignup',
            language: language || 'en',
            confirmationUrl
          })
        });
        
        if (emailResponse.ok) {
          console.log('[SIGNUP API] ✅ Confirmation email sent successfully');
        } else {
          const errorText = await emailResponse.text();
          console.error('[SIGNUP API] Failed to send email:', errorText);
          // Don't fail signup if email fails - user can resend later
        }
      } catch (emailError) {
        console.error('[SIGNUP API] Exception sending email:', emailError);
        // Don't fail signup if email fails
      }
    } else {
      console.log('[SIGNUP API] Skipping confirmation email in test mode');
    }
    
    console.log('[SIGNUP API] Signup complete for:', email);
    
    return NextResponse.json({ 
      success: true,
      userId: data.user.id,
      email: data.user.email
    });
    
  } catch (error) {
    console.error('[SIGNUP API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during signup' },
      { status: 500 }
    );
  }
}


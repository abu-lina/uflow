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
  isSuspiciousTiming,
} from '@/utils/security';
import { sendAuthEmail } from '@/services/emailService';

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
  
  console.log('[MAGIC LINK API] ========================================');
  console.log('[MAGIC LINK API] Magic link request received');
  console.log('[MAGIC LINK API] IP:', ip);
  console.log('[MAGIC LINK API] NODE_ENV:', process.env.NODE_ENV);
  console.log('[MAGIC LINK API] Using Resend for branded emails');
  console.log('[MAGIC LINK API] ========================================');
  
  try {
    const isTest = isTestMode(request);
    
    // 1. Check if IP is blocked (unless test mode or localhost in development)
    if (!isTest && checkIPBlocked(ip)) {
      console.log('[MAGIC LINK API] Blocked IP attempted magic link:', ip);
      console.log('[MAGIC LINK API] IP blocking check result: BLOCKED');
      return NextResponse.json(
        { error: 'Access temporarily restricted. Please try again later.' },
        { status: 403 }
      );
    }
    
    console.log('[MAGIC LINK API] IP blocking check passed');

    // 2. Rate limiting: 5 magic links per hour per IP (bypassed in test mode)
    const identifier = getClientIdentifier(request);
    const rateLimit = isTest ? 1000 : 5; // Higher limit than signup since it's passwordless
    const rateLimitWindow = isTest ? 60 * 1000 : 60 * 60 * 1000; // 1 min in test, 1 hour in prod
    
    if (!checkRateLimit(identifier, rateLimit, rateLimitWindow, 'magic-link')) {
      if (!isTest) {
        markSuspiciousIP(ip, 1); // Block for 1 hour
      }
      console.log('[MAGIC LINK API] Rate limit exceeded for IP:', ip);
      return NextResponse.json(
        { error: 'Too many magic link requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, language } = body;
    
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
      });
    
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
    
    if (!requestOrigin) {
      const referer = request.headers.get('referer');
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
      console.log('[MAGIC LINK API] ✅ Magic link email sent successfully via Resend');
      console.log('[MAGIC LINK API] Resend response:', emailResult);
    } catch (emailError) {
      console.error('[MAGIC LINK API] ❌ Failed to send email via Resend:', emailError);
      console.error('[MAGIC LINK API] Error details:', {
        message: emailError instanceof Error ? emailError.message : String(emailError),
        stack: emailError instanceof Error ? emailError.stack : undefined
      });
      // Return error - don't silently fail
      return NextResponse.json(
        { 
          error: 'Failed to send magic link email. Please check Resend configuration.',
          details: emailError instanceof Error ? emailError.message : String(emailError)
        },
        { status: 500 }
      );
    }
    
    console.log('[MAGIC LINK API] Magic link request complete for:', email);
    
    return NextResponse.json({ 
      success: true,
      message: 'Magic link sent successfully'
    });
    
  } catch (error) {
    console.error('[MAGIC LINK API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

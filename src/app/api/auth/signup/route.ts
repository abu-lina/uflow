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

export async function POST(request: Request) {
  const startTime = Date.now();
  const ip = getClientIP(request);
  
  try {
    // 1. Check if IP is blocked
    if (checkIPBlocked(ip)) {
      console.log('[SIGNUP API] Blocked IP attempted signup:', ip);
      return NextResponse.json(
        { error: 'Access temporarily restricted. Please try again later.' },
        { status: 403 }
      );
    }

    // 2. Rate limiting: 3 signups per hour per IP
    const identifier = getClientIdentifier(request);
    if (!checkRateLimit(identifier, 3, 60 * 60 * 1000, 'signup')) {
      markSuspiciousIP(ip, 1); // Block for 1 hour
      console.log('[SIGNUP API] Rate limit exceeded for IP:', ip);
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, language, honeypot } = body;
    
    // 3. Honeypot check (should be empty)
    if (honeypot && honeypot.trim() !== '') {
      markSuspiciousIP(ip, 24); // Block for 24 hours
      console.log('[SIGNUP API] Honeypot triggered for IP:', ip);
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // 4. Request timing check (too fast = likely bot)
    if (isSuspiciousTiming(startTime)) {
      markSuspiciousIP(ip, 1);
      console.log('[SIGNUP API] Suspiciously fast request from IP:', ip);
    }
    
    // 5. Validate input
    if (!email || !password) {
      console.error('[SIGNUP API] Missing email or password');
      return NextResponse.json(
        { error: 'Missing email or password' },
        { status: 400 }
      );
    }
    
    // 6. Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('[SIGNUP API] Invalid email format:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // 7. Disposable email check
    if (isDisposableEmail(email)) {
      console.log('[SIGNUP API] Disposable email blocked:', email);
      return NextResponse.json(
        { error: 'Disposable email addresses are not allowed' },
        { status: 400 }
      );
    }
    
    // 8. Enhanced password validation
    const passwordValidation = validatePasswordComplexity(password);
    if (!passwordValidation.valid) {
      console.error('[SIGNUP API] Password validation failed:', passwordValidation.error);
      return NextResponse.json(
        { error: passwordValidation.error || 'Password does not meet requirements' },
        { status: 400 }
      );
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
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Must confirm email first
      user_metadata: {
        language: language || 'en',
        preferred_language: language || 'en',
        email_confirmed: false
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
    
    // Send confirmation email
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


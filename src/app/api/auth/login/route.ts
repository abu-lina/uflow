import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  checkRateLimit, 
  getClientIdentifier 
} from '@/lib/rate-limit';
import {
  getClientIP,
  checkIPBlocked,
  markSuspiciousIP,
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
  const ip = getClientIP(request);
  
  try {
    const isTest = isTestMode(request);
    
    // 1. Check if IP is blocked (unless test mode)
    if (!isTest && checkIPBlocked(ip)) {
      console.log('[LOGIN API] Blocked IP attempted login:', ip);
      return NextResponse.json(
        { error: 'Access temporarily restricted. Please try again later.' },
        { status: 403 }
      );
    }

    // 2. Rate limiting: 10 login attempts per 15 minutes per IP (higher for testing)
    const identifier = getClientIdentifier(request);
    const rateLimit = isTest ? 1000 : 10; // Much higher limit in test mode
    const rateLimitWindow = isTest ? 60 * 1000 : 15 * 60 * 1000; // 1 min in test, 15 min in prod
    
    if (!checkRateLimit(identifier, rateLimit, rateLimitWindow, 'login')) {
      if (!isTest) {
        markSuspiciousIP(ip, 1); // Block for 1 hour
      }
      console.log('[LOGIN API] Rate limit exceeded for IP:', ip);
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;
    
    // 3. Validate input
    if (!email || !password) {
      console.error('[LOGIN API] Missing email or password');
      return NextResponse.json(
        { error: 'Missing email or password' },
        { status: 400 }
      );
    }
    
    // 4. Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('[LOGIN API] Invalid email format:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    console.log('[LOGIN API] Received login request:', { email });
    
    // Check if user exists and is confirmed
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[LOGIN API] Error checking existing users:', listError);
      return NextResponse.json(
        { error: 'Failed to check user existence' },
        { status: 500 }
      );
    }
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.log('[LOGIN API] User not found:', email);
      // Don't reveal if user exists for security
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Check email confirmation status
    const emailConfirmed = user.email_confirmed_at !== null && 
                          user.user_metadata?.email_confirmed === true;
    
    if (!emailConfirmed && !isTest) {
      console.log('[LOGIN API] Email not confirmed:', email);
      return NextResponse.json(
        { error: 'Please confirm your email before logging in' },
        { status: 403 }
      );
    }
    
    // Verify password by attempting to sign in
    // Create a temporary client to verify credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[LOGIN API] Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    const tempClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    const { data: sessionData, error: signInError } = await tempClient.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError) {
      console.error('[LOGIN API] Sign in error:', signInError);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    if (!sessionData.session) {
      console.error('[LOGIN API] No session created');
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }
    
    console.log('[LOGIN API] ✅ Login successful for:', email);
    
    // Return tokens in the format expected by the test script
    return NextResponse.json({ 
      accessToken: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
      user: {
        id: sessionData.user.id,
        email: sessionData.user.email
      }
    });
    
  } catch (error) {
    console.error('[LOGIN API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login' },
      { status: 500 }
    );
  }
}


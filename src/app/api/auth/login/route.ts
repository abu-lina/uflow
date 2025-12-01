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
  unblockIP,
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
  
  // Check if test API key matches
  if (testApiKey && expectedKey && testApiKey === expectedKey) {
    return true;
  }
  
  // Also check NODE_ENV for test mode
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  
  // Debug logging (only log if key is provided but doesn't match)
  if (testApiKey && !expectedKey) {
    console.warn('[LOGIN API] Test API key provided but TEST_API_KEY env var not set');
  } else if (testApiKey && expectedKey && testApiKey !== expectedKey) {
    console.warn('[LOGIN API] Test API key provided but does not match expected key');
  }
  
  return false;
}

export async function POST(request: Request) {
  const ip = getClientIP(request);
  
  try {
    // Debug: Log header values
    const testApiKeyHeader = request.headers.get('x-test-api-key') || request.headers.get('X-Test-API-Key');
    const expectedKey = process.env.TEST_API_KEY;
    
    const isTest = isTestMode(request);
    
    // Enhanced debug logging
    if (testApiKeyHeader) {
      console.log('[LOGIN API] Test API key header received:', testApiKeyHeader.substring(0, 10) + '...');
      console.log('[LOGIN API] Expected key set:', expectedKey ? 'YES' : 'NO');
      console.log('[LOGIN API] Test mode active:', isTest);
    }
    
    // 1. Check if IP is blocked (unless test mode)
    // In test mode, we bypass IP blocking entirely
    if (!isTest && checkIPBlocked(ip)) {
      console.log('[LOGIN API] Blocked IP attempted login:', ip, '(test mode:', isTest, ')');
      if (testApiKeyHeader && !expectedKey) {
        console.error('[LOGIN API] ⚠️ TEST_API_KEY not set in server environment!');
      }
      return NextResponse.json(
        { error: 'Access temporarily restricted. Please try again later.' },
        { status: 403 }
      );
    }
    
    // Log test mode status for debugging
    if (isTest) {
      console.log('[LOGIN API] ✅ Test mode enabled, bypassing security checks for IP:', ip);
      // Clear any existing IP blocks for this IP in test mode
      if (checkIPBlocked(ip)) {
        unblockIP(ip);
        console.log('[LOGIN API] Cleared IP block for test mode:', ip);
      }
    } else if (testApiKeyHeader) {
      console.warn('[LOGIN API] ⚠️ Test API key provided but test mode not active. Check TEST_API_KEY env var.');
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
    
    console.log('[LOGIN API] Received login request:', { email, isTest });
    
    // Get Supabase credentials for sign-in
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[LOGIN API] Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Create client for sign-in
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
    
    // Attempt to sign in - this will verify credentials
    const { data: sessionData, error: signInError } = await tempClient.auth.signInWithPassword({
      email,
      password,
    });
    
    // Handle sign-in errors
    if (signInError) {
      console.error('[LOGIN API] Sign in error:', signInError.message);
      
      // Check if it's an email confirmation error
      const isEmailNotConfirmed = signInError.message.includes('Email not confirmed') || 
                                   signInError.message.includes('email_not_confirmed') ||
                                   signInError.message.includes('email_not_verified');
      
      if (isEmailNotConfirmed) {
        if (!isTest) {
          return NextResponse.json(
            { error: 'Please confirm your email before logging in' },
            { status: 403 }
          );
        }
        
        // In test mode, auto-confirm the email and retry
        console.log('[LOGIN API] Auto-confirming email in test mode for:', email);
        try {
          const supabaseAdmin = getSupabaseAdmin();
          
          // Use pagination to find user (handles large user lists)
          let user = null;
          let page = 1;
          const perPage = 1000;
          
          while (user === null) {
            const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
              page,
              perPage
            });
            
            if (listError) {
              throw listError;
            }
            
            user = data.users.find(u => u.email === email);
            
            // If found or reached end of list, break
            if (user || data.users.length < perPage) {
              break;
            }
            
            page++;
          }
          
          if (user) {
            // Update user to confirm email
            await supabaseAdmin.auth.admin.updateUserById(user.id, {
              email_confirm: true,
              user_metadata: { 
                ...(user.user_metadata || {}), 
                email_confirmed: true 
              }
            });
            
            // Retry sign-in after confirming
            const { data: retryData, error: retryError } = await tempClient.auth.signInWithPassword({
              email,
              password,
            });
            
            if (retryError) {
              console.error('[LOGIN API] Retry sign in error after auto-confirm:', retryError.message);
              return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
              );
            }
            
            if (!retryData.session) {
              return NextResponse.json(
                { error: 'Failed to create session' },
                { status: 500 }
              );
            }
            
            console.log('[LOGIN API] ✅ Login successful (after auto-confirm) for:', email);
            return NextResponse.json({ 
              accessToken: retryData.session.access_token,
              refreshToken: retryData.session.refresh_token,
              user: {
                id: retryData.user.id,
                email: retryData.user.email
              }
            });
          } else {
            console.error('[LOGIN API] User not found for auto-confirm:', email);
          }
        } catch (confirmError) {
          console.error('[LOGIN API] Error during auto-confirm:', confirmError);
        }
      }
      
      // Generic invalid credentials error
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


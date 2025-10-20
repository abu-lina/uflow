import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
  try {
    const { email, password, language } = await request.json();
    
    console.log('[SIGNUP API] Received signup request:', { email, language });
    
    // Validate input
    if (!email || !password) {
      console.error('[SIGNUP API] Missing email or password');
      return NextResponse.json(
        { error: 'Missing email or password' },
        { status: 400 }
      );
    }
    
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('[SIGNUP API] Invalid email format:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate password length
    if (password.length < 6) {
      console.error('[SIGNUP API] Password too short');
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }
    
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


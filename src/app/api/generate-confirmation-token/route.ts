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
    const { userId, email, type } = await request.json();
    
    console.log('[TOKEN] Generation request:', { userId, email, type });
    
    if (!userId || !email || !type) {
      console.error('[TOKEN] Missing required fields:', { userId, email, type });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[TOKEN] Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    console.log('[TOKEN] Attempting to store token in database');

    // Store token in database for validation
    const supabaseAdmin = getSupabaseAdmin();
    const { error: insertError } = await supabaseAdmin
      .from('email_confirmation_tokens')
      .insert({
        user_id: userId,
        email: email,
        token: token,
        type: type,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('[TOKEN] Database error:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      return NextResponse.json(
        { 
          error: 'Failed to generate confirmation token',
          details: insertError.message 
        },
        { status: 500 }
      );
    }

    console.log('[TOKEN] Token generated successfully');

    return NextResponse.json({ 
      token,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('[TOKEN] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate confirmation token',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

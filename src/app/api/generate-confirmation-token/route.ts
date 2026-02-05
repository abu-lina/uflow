import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { userId, email, type } = await request.json();
    
    console.log('[TOKEN] Generation request:', { userId, email, type });
    
    if (!email || !type) {
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

    // Resolve user id if not provided by looking up via email
    // Applies to both email confirmation and password reset flows
    let finalUserId = userId;
    if (!finalUserId) {
      const supabaseAdmin = getSupabaseAdmin();
      // Fallback to listUsers when getUserByEmail is unavailable in this SDK version
      const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (userError) {
        console.error('[TOKEN] Error listing users:', userError);
        return NextResponse.json({ error: 'Failed to find user' }, { status: 500 });
      }
      const normalized = email.trim().toLowerCase();
      const user = users.find(u => (u.email || '').trim().toLowerCase() === normalized);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      finalUserId = user.id;
    }

    // Store token in database for validation
    const supabaseAdmin = getSupabaseAdmin();
    const { error: insertError } = await supabaseAdmin
      .from('email_confirmation_tokens')
      .insert({
        user_id: finalUserId,
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

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Check magic link status for a specific email
 * GET /api/auth/magic-link-status?email=user@example.com
 *
 * Shows:
 * - Recent magic link tokens created
 * - Token status (used, expired, valid)
 * - Email sending status (if available)
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  
  if (!email) {
    return NextResponse.json(
      { error: 'Email parameter is required' },
      { status: 400 }
    );
  }
  
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Get recent magic link tokens for this email
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('email_confirmation_tokens')
      .select('*')
      .ilike('email', email)
      .eq('type', 'magic_link')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (tokensError) {
      return NextResponse.json(
        { error: 'Failed to fetch tokens', details: tokensError.message },
        { status: 500 }
      );
    }
    
    // Check if user exists
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      return NextResponse.json(
        { error: 'Failed to fetch users', details: userError.message },
        { status: 500 }
      );
    }
    
    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    const now = new Date();
    const status = {
      email,
      userExists: !!user,
      userId: user?.id,
      userEmailConfirmed: user?.email_confirmed_at !== null,
      recentTokens: tokens?.map(token => {
        const expiresAt = new Date(token.expires_at);
        const isExpired = expiresAt < now;
        const isValid = !token.used && !isExpired;
        
        return {
          id: token.id,
          created_at: token.created_at,
          expires_at: token.expires_at,
          used: token.used,
          isExpired,
          isValid,
          timeUntilExpiry: isExpired ? 'expired' : `${Math.round((expiresAt.getTime() - now.getTime()) / 1000 / 60)} minutes`,
          age: `${Math.round((now.getTime() - new Date(token.created_at).getTime()) / 1000 / 60)} minutes ago`
        };
      }) || [],
      summary: {
        totalTokens: tokens?.length || 0,
        validTokens: tokens?.filter(t => {
          const expiresAt = new Date(t.expires_at);
          return !t.used && expiresAt >= now;
        }).length || 0,
        usedTokens: tokens?.filter(t => t.used).length || 0,
        expiredTokens: tokens?.filter(t => {
          const expiresAt = new Date(t.expires_at);
          return !t.used && expiresAt < now;
        }).length || 0,
      },
      recommendations: [] as string[]
    };
    
    // Add recommendations
    if (!user) {
      status.recommendations.push('User does not exist. They need to sign up first.');
    } else if (!user.email_confirmed_at) {
      status.recommendations.push('User email is not confirmed. Magic link should work to confirm it.');
    }
    
    if (status.summary.validTokens === 0 && status.summary.totalTokens > 0) {
      status.recommendations.push('No valid tokens found. All tokens are either used or expired. User needs to request a new magic link.');
    }
    
    if (status.summary.validTokens > 0) {
      status.recommendations.push(`Found ${status.summary.validTokens} valid token(s). If the link is not working, check token verification logs.`);
    }
    
    if (status.summary.totalTokens === 0) {
      status.recommendations.push('No magic link tokens found for this email. Either no requests were made, or tokens were created but not stored properly.');
    }
    
    return NextResponse.json(status);
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

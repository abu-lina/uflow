import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cookies as nextCookies } from 'next/headers';
import { isAdminOrModerator } from '@/lib/auth/roles';

/**
 * GET /api/admin/debug-auth
 * 
 * Debug endpoint to check authentication and role status
 * This helps diagnose why admin access might be failing
 * Requires admin or moderator role
 */
export async function GET() {
  try {
    // Security: Require authentication
    const user = await getUserFromCookie();
    
    // Also check cookies directly
    const cookieStore = await nextCookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!user) {
      // Try to validate the token manually to get more error details
      let tokenValidationError = null;
      if (accessToken) {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          
          if (supabaseUrl && supabaseAnonKey) {
            const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: supabaseAnonKey,
              },
            });
            
            if (!res.ok) {
              const errorText = await res.text();
              tokenValidationError = {
                status: res.status,
                statusText: res.statusText,
                error: errorText,
              };
            }
          }
        } catch (e) {
          tokenValidationError = {
            error: e instanceof Error ? e.message : String(e),
          };
        }
      }

      return NextResponse.json({
        authenticated: false,
        error: 'No user found',
        message: 'You need to be logged in to access this endpoint',
        debug: {
          hasAccessTokenCookie: !!accessToken,
          hasRefreshTokenCookie: !!refreshToken,
          accessTokenLength: accessToken?.length || 0,
          cookieNames: cookieStore.getAll().map(c => c.name).filter(n => n.startsWith('sb-')),
          tokenValidationError,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
          supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
        },
      }, { status: 401 });
    }

    // Security: Require admin or moderator role
    const hasAccess = await isAdminOrModerator(user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { 
          authenticated: true,
          error: 'Forbidden',
          message: 'Admin or Moderator access required to use this diagnostic endpoint',
        },
        { status: 403 }
      );
    }

    // Try to get user from database using regular client (with RLS)
    const supabase = createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, email, role, created_at')
      .eq('user_id', user.id)
      .single();

    // Also try with admin client to bypass RLS
    let adminUserData = null;
    let adminError = null;
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('user_id, email, role, created_at')
        .eq('user_id', user.id)
        .single();

      adminUserData = data;
      adminError = error;
    } catch (e) {
      adminError = e instanceof Error ? e : new Error(String(e));
    }

    // Check all users with admin role (using admin client)
    let allAdmins = null;
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data } = await supabaseAdmin
        .from('users')
        .select('user_id, email, role')
        .in('role', ['admin', 'moderator'])
        .limit(10);

      allAdmins = data;
    } catch {
      // Ignore errors for this check
    }

    return NextResponse.json({
      authenticated: true,
      authUser: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      },
      databaseCheck: {
        withRLS: {
          found: !!userData,
          data: userData,
          error: userError?.message || null,
          errorCode: userError?.code || null,
        },
        withoutRLS: {
          found: !!adminUserData,
          data: adminUserData,
          error: adminError?.message || null,
        },
      },
      allAdminsInDatabase: allAdmins,
      diagnosis: {
        userExistsInDatabase: !!adminUserData,
        hasAdminRole: adminUserData?.role === 'admin',
        hasModeratorRole: adminUserData?.role === 'moderator',
        hasAccess: adminUserData?.role === 'admin' || adminUserData?.role === 'moderator',
        userIdMatch: adminUserData?.user_id === user.id,
        recommendation: !adminUserData
          ? 'User not found in users table. Create a record with INSERT INTO users (user_id, email, role) VALUES (...)'
          : adminUserData.role !== 'admin' && adminUserData.role !== 'moderator'
          ? `User role is '${adminUserData.role}'. Update with: UPDATE users SET role = 'admin' WHERE user_id = '${user.id}'`
          : adminUserData.user_id !== user.id
          ? `user_id mismatch. Database has '${adminUserData.user_id}' but auth has '${user.id}'`
          : 'User should have access. Check RLS policies or server-side session handling.',
      },
    });
  } catch (error) {
    console.error('Error in debug-auth:', error);
    return NextResponse.json(
      {
        error: 'Failed to debug auth',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


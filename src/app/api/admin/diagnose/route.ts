import { NextResponse } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getUserRole, isAdminOrModerator } from '@/lib/auth/roles';

/**
 * GET /api/admin/diagnose
 * 
 * Complete diagnostic check for auth issues
 * Requires admin or moderator role
 */
export async function GET() {
  // Security: Require authentication
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'You must be logged in to access this endpoint' },
      { status: 401 }
    );
  }

  // Security: Require admin or moderator role
  const hasAccess = await isAdminOrModerator(user.id);
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin or Moderator access required' },
      { status: 403 }
    );
  }

  const diagnostic: Record<string, unknown> = {};

  try {
    // 1. Check cookies
    const cookieStore = await nextCookies();
    const allCookies = cookieStore.getAll();
    diagnostic.cookies = {
      all: allCookies.map(c => ({ name: c.name, hasValue: !!c.value, length: c.value?.length })),
      hasAccessToken: !!cookieStore.get('sb-access-token')?.value,
      hasRefreshToken: !!cookieStore.get('sb-refresh-token')?.value,
      accessTokenLength: cookieStore.get('sb-access-token')?.value?.length,
      refreshTokenLength: cookieStore.get('sb-refresh-token')?.value?.length,
    };

    // 2. Try getUserFromCookie
    try {
      const user = await getUserFromCookie();
      diagnostic.getUserFromCookie = {
        success: !!user,
        userId: user?.id,
        email: user?.email,
      };

      if (user) {
        // 3. Try getting role
        try {
          const role = await getUserRole(user.id);
          diagnostic.role = {
            success: true,
            role,
          };

          // 4. Check database directly (without .single() to see all rows)
          // Use both regular client (respects RLS) and admin client (bypasses RLS)
          const supabase = createSupabaseServerClient();
          const supabaseAdmin = getSupabaseAdmin();
          
          // Get all matching rows with regular client (respects RLS)
          const { data: allUserData, error: allError } = await supabase
            .from('users')
            .select('user_id, email, role, created_at')
            .eq('user_id', user.id);

          // Get all matching rows with admin client (bypasses RLS)
          const { data: adminUserData, error: adminError } = await supabaseAdmin
            .from('users')
            .select('user_id, email, role, created_at')
            .eq('user_id', user.id);

          // Try single query with regular client
          const { data: singleUserData, error: singleError } = await supabase
            .from('users')
            .select('user_id, email, role')
            .eq('user_id', user.id)
            .single();

          diagnostic.database = {
            regularClient: {
              count: allUserData?.length || 0,
              data: allUserData,
              error: allError?.message,
              note: 'Uses anon key, respects RLS',
            },
            adminClient: {
              count: adminUserData?.length || 0,
              data: adminUserData,
              error: adminError?.message,
              note: 'Uses service role, bypasses RLS',
            },
            singleQuery: {
              success: !singleError,
              error: singleError?.message,
              errorCode: singleError?.code,
              data: singleUserData,
            },
          };
        } catch (error) {
          diagnostic.role = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    } catch (error) {
      diagnostic.getUserFromCookie = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // 5. Try SSR client directly
    try {
      const supabase = createSupabaseServerClient();
      const { data: { user: ssrUser }, error: ssrError } = await supabase.auth.getUser();
      diagnostic.ssrClient = {
        success: !!ssrUser,
        error: ssrError?.message,
        userId: ssrUser?.id,
        email: ssrUser?.email,
      };
    } catch (error) {
      diagnostic.ssrClient = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // 6. Environment check
    diagnostic.environment = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
    };

    return NextResponse.json({
      success: true,
      diagnostic,
      summary: {
        hasCookies: diagnostic.cookies && (diagnostic.cookies as { hasAccessToken: boolean }).hasAccessToken,
        canGetUser: diagnostic.getUserFromCookie && (diagnostic.getUserFromCookie as { success: boolean }).success,
        hasRole: diagnostic.role && (diagnostic.role as { success: boolean }).success,
        isAdmin: diagnostic.role && (diagnostic.role as { role: string }).role === 'admin',
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      diagnostic,
    }, { status: 500 });
  }
}


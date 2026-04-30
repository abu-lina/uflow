import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserRole, isAdminOrModerator } from '@/lib/auth/roles';

/**
 * GET /api/admin/check-role
 * 
 * Check the current user's role (for debugging)
 * This endpoint helps verify if a user has the correct role set in the database
 * Requires admin or moderator role
 */
export async function GET() {
  try {
    // Security: Require authentication
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { 
          error: 'Not authenticated',
          debug: {
            message: 'No user found from sb-access-token cookie',
            hint: 'Make sure you are logged in and the cookie is set',
          },
        },
        { status: 401 }
      );
    }

    // Security: Require admin or moderator role
    const hasAccess = await isAdminOrModerator(user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'Admin or Moderator access required to use this diagnostic endpoint',
        },
        { status: 403 }
      );
    }

    // Get role from database
    const role = await getUserRole(user.id);

    // Also check if user exists in users table
    const supabase = createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, email, role')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      authenticated: true,
      authUser: {
        id: user.id,
        email: user.email,
      },
      databaseRole: role,
      userInDatabase: !!userData,
      userData: userData || null,
      error: userError?.message || null,
      message: userData 
        ? `Your role is: ${role}. ${role === 'admin' || role === 'moderator' ? 'You should have access to the dashboard.' : 'You need admin or moderator role to access the dashboard.'}`
        : 'User not found in users table. You need to create a user record with admin or moderator role.',
    });
  } catch (error) {
    console.error('Error checking role:', error);
    return NextResponse.json(
      {
        error: 'Failed to check role',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


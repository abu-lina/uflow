import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminOrModerator } from '@/lib/auth/roles';

/**
 * POST /api/admin/set-role
 * 
 * Set a user's role (admin/moderator only)
 * 
 * Request body:
 * {
 *   userId?: string (optional - defaults to current user)
 *   email?: string (optional - to find user by email)
 *   role: 'user' | 'owner' | 'admin' | 'moderator' (required)
 * }
 */
export async function POST(request: Request) {
  try {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // F-049-01: Require admin/moderator role (DB-backed) for privilege escalation
    const hasAccess = await isAdminOrModerator(user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden. Only admin or moderator can set roles.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, email, role } = body;

    if (!role || !['user', 'owner', 'admin', 'moderator'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: user, owner, admin, moderator' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = getSupabaseAdmin();
    let targetUserId = userId || user.id;

    // If email is provided, find the user by email
    if (email && !userId) {
      // Use listUsers and filter by email (getUserByEmail not available in this SDK version)
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) {
        return NextResponse.json(
          { error: 'Failed to search for user', details: listError.message },
          { status: 500 }
        );
      }
      const userByEmail = users.find(u => u.email === email);
      if (!userByEmail) {
        return NextResponse.json(
          { error: 'User not found with that email' },
          { status: 404 }
        );
      }
      targetUserId = userByEmail.id;
    }

    // Get auth user data for email
    const { data: authUserData, error: authError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (authError || !authUserData?.user) {
      return NextResponse.json(
        { error: 'User not found in auth system', details: authError?.message },
        { status: 404 }
      );
    }

    // Check if user exists in users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('user_id, email, role')
      .eq('user_id', targetUserId)
      .single();

    if (existingUser) {
      // Update existing user
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ role })
        .eq('user_id', targetUserId)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update role', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Role updated to ${role}`,
        user: data,
      });
    } else {
      // Create new user record
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          user_id: targetUserId,
          email: authUserData.user.email || '',
          role,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Failed to create user record', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `User record created with role ${role}`,
        user: data,
      });
    }
  } catch (error) {
    console.error('Error setting role:', error);
    return NextResponse.json(
      {
        error: 'Failed to set role',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


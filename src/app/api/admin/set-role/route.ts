import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getUserRole } from '@/lib/auth/roles';

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
    const callerRole = await getUserRole(user.id);
    if (callerRole !== 'admin' && callerRole !== 'moderator') {
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

    // Prevent self-role-changes (after email resolution so both paths are covered)
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role.' },
        { status: 403 }
      );
    }

    // Only admins can assign the admin role
    if (role === 'admin' && callerRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can grant admin role.' },
        { status: 403 }
      );
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

    // Moderators cannot modify admin users
    if (callerRole !== 'admin' && existingUser?.role === 'admin') {
      return NextResponse.json(
        { error: 'Only admins can modify admin users.' },
        { status: 403 }
      );
    }

    let responseUser: unknown;
    let successMessage = '';

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

      responseUser = data;
      successMessage = `Role updated to ${role}`;
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

      responseUser = data;
      successMessage = `User record created with role ${role}`;
    }

    const mergedMetadata = {
      ...(authUserData.user.user_metadata || {}),
      role,
    };

    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      user_metadata: mergedMetadata,
    });

    if (metadataError) {
      console.warn('[set-role] Role updated in DB but metadata sync failed:', {
        targetUserId,
        role,
        error: metadataError.message,
      });
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
      user: responseUser,
    });
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


import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * DELETE /api/user/delete-account
 *
 * Permanently deletes the signed-in user's account and associated data.
 * The user id comes from the session only.
 */
export async function DELETE(request: Request) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { userId?: unknown } | null;
  if (body?.userId !== undefined && body.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const steps: [table: string, column: string][] = [
    // Owned providers only, as the RLS-bound browser delete and the RPC did; recommendations
    // stay (user_created_id is set null) so a listing claimed by someone else survives.
    ['providers', 'provider_owner_id'],
    ['bookmarks', 'user_id'],
    ['users', 'user_id'],
  ];

  for (const [table, column] of steps) {
    const { error } = await admin.from(table).delete().eq(column, user.id);
    if (error) {
      console.error(`[DELETE ACCOUNT] Failed to delete ${table}:`, error);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }
  }

  const { error: authError } = await admin.auth.admin.deleteUser(user.id);
  if (authError) {
    console.error('[DELETE ACCOUNT] Failed to delete auth user:', authError);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

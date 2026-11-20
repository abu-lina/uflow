import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

function isCrossOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/**
 * DELETE /api/user/delete-account
 *
 * Permanently deletes the signed-in user's account. The user id comes from the
 * session only. Owned providers (provider_owner_id), bookmarks and the users row
 * cascade from auth.users, so one auth delete removes everything at once.
 */
export async function DELETE(request: Request) {
  if (isCrossOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkRateLimit(getClientIdentifier(request, user.id), 3, 60 * 60 * 1000, 'account-delete')) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const admin = getSupabaseAdmin();

    // Best-effort audit row, as the old RPC wrote; user_id is set null once the auth user is gone.
    const { error: logError } = await admin
      .from('deletion_logs')
      .insert({ user_id: user.id, reason: 'User requested account deletion' });
    if (logError) {
      console.error('[DELETE ACCOUNT] Failed to write deletion log:', logError);
    }

    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) {
      console.error('[DELETE ACCOUNT] Failed to delete auth user:', authError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }
  } catch (error) {
    console.error('[DELETE ACCOUNT] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('sb-access-token', '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set('sb-refresh-token', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

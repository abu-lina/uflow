import { redirect } from 'next/navigation';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Use getUserFromCookie which reads from sb-access-token cookie
  const user = await getUserFromCookie();

  // Check authentication
  if (!user) {
    redirect('/');
  }

  // Check authorization - only admin and moderator can access dashboard
  const hasAccess = await isAdminOrModerator(user.id);
  
  if (!hasAccess) {
    // Enhanced debug logging in development
    if (process.env.NODE_ENV === 'development') {
      const { getUserRole } = await import('@/lib/auth/roles');
      const role = await getUserRole(user.id);
      
      // Also check directly in database
      const supabase = createSupabaseServerClient();
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('id, user_id, email, role')
        .eq('user_id', user.id)
        .single();
      
      console.log('[Dashboard] Access denied - Debug info:', {
        authUserId: user.id,
        authUserEmail: user.email,
        databaseRole: role,
        userInDatabase: !!userData,
        databaseUserData: userData,
        databaseError: dbError?.message,
        hasAccess,
        suggestion: !userData 
          ? `User not in database. Run: INSERT INTO users (user_id, email, role) VALUES ('${user.id}', '${user.email}', 'admin');`
          : role !== 'admin' && role !== 'moderator'
          ? `User role is '${role}'. Run: UPDATE users SET role = 'admin' WHERE user_id = '${user.id}';`
          : 'Role should grant access. Try refreshing the page to sync tokens.',
      });
      
      console.warn(
        `\n🚫 Dashboard Access Denied\n` +
        `User: ${user.email}\n` +
        `Role: ${role}\n` +
        `${!userData ? '❌ User not found in database\n' : ''}` +
        `${userData && role !== 'admin' && role !== 'moderator' ? `❌ Role '${role}' does not have admin access\n` : ''}` +
        `\n💡 Quick Fix: ${!userData 
          ? 'Add user to database with admin role'
          : role !== 'admin' && role !== 'moderator'
          ? `Update user role to 'admin' or 'moderator'`
          : 'Refresh page to sync tokens'
        }\n`
      );
    }
    redirect('/');
  }

  return <>{children}</>;
}

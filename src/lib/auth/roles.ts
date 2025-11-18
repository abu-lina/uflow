import { createSupabaseServerClient } from '@/lib/supabase/server';

export type UserRole = 'user' | 'owner' | 'admin' | 'moderator';

/**
 * Get user role from database
 * Returns the role from the users table, or 'user' as default
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // If user doesn't exist in users table, default to 'user'
    return 'user';
  }

  return (data.role as UserRole) || 'user';
}

/**
 * Check if user has admin role
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin';
}

/**
 * Check if user has moderator role
 */
export async function isModerator(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'moderator';
}

/**
 * Check if user has admin or moderator role
 */
export async function isAdminOrModerator(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin' || role === 'moderator';
}

/**
 * Check if user has required role
 */
export async function hasRole(userId: string, requiredRole: UserRole | UserRole[]): Promise<boolean> {
  const userRole = await getUserRole(userId);
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }
  
  return userRole === requiredRole;
}

/**
 * Get user role from auth user metadata (fallback)
 * This checks user_metadata.role as a fallback if database lookup fails
 */
export function getRoleFromMetadata(user: { user_metadata?: { role?: string } }): UserRole {
  const role = user.user_metadata?.role;
  if (role && ['user', 'owner', 'admin', 'moderator'].includes(role)) {
    return role as UserRole;
  }
  return 'user';
}


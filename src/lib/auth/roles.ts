import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type UserRole = 'user' | 'owner' | 'admin' | 'moderator';

/**
 * Get user role from database
 * Returns the role from the users table, or 'user' as default
 * Uses admin client to bypass RLS policies
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  // Use admin client to bypass RLS
  const supabase = getSupabaseAdmin();
  
  // First, try to get all rows to see if there are duplicates
  const { data: allRows, error: queryError } = await supabase
    .from('users')
    .select('role, user_id, email')
    .eq('user_id', userId);

  if (process.env.NODE_ENV === 'development') {
    console.log('[getUserRole] Query result:', {
      userId,
      rowCount: allRows?.length || 0,
      rows: allRows,
      error: queryError?.message,
    });
  }

  // If we found rows, return the role from the first one
  if (allRows && allRows.length > 0) {
    const role = (allRows[0].role as UserRole) || 'user';
    
    if (allRows.length > 1) {
      console.warn(`[getUserRole] Found ${allRows.length} rows for user ${userId}. This should not happen! Using first row.`);
    }
    
    return role;
  }

  // Try the original query with .single() as fallback
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', userId)
    .single();

  // Log errors in development for debugging
  if (process.env.NODE_ENV === 'development' && error) {
    console.log('[getUserRole] Single query error:', {
      userId,
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }

  if (error || !data) {
    // If user doesn't exist in users table, default to 'user'
    console.warn(`[getUserRole] Defaulting to 'user' role for ${userId}`);
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


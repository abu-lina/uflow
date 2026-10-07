import { useAuth } from '@/providers/auth-provider';

/**
 * Client-side hook to check if the current user is an admin or moderator.
 * Reads the authoritative role from public.users carried by AuthProvider —
 * never user_metadata.role, which users can write themselves via
 * supabase.auth.updateUser() (#567). Server-side protection is still
 * enforced on all admin API routes and the dashboard layout.
 */
export function useIsAdmin() {
  const { role, isLoading } = useAuth();

  const isAdmin = role === 'admin' || role === 'moderator';

  return { isAdmin, isLoading };
}

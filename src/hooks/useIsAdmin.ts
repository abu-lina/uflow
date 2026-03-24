import { useAuth } from '@/providers/auth-provider';

/**
 * Client-side hook to check if the current user is an admin or moderator.
 * Uses user_metadata.role as a UI visibility hint only — server-side
 * protection is enforced on all admin API routes and dashboard layout.
 */
export function useIsAdmin() {
  const { user, isLoading } = useAuth();

  const role = user?.user_metadata?.role;
  const isAdmin = role === 'admin' || role === 'moderator';

  return { isAdmin, isLoading };
}

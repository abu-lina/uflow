import { useAuth as useAuthContext } from '@/providers/AuthProvider'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const { user, loading, signOut } = useAuthContext()

  const isAuthenticated = !!user
  const userRole = user?.user_metadata?.role as
    | 'customer'
    | 'souk_owner'
    | 'halal_reviewer'
    | 'admin'
    | undefined

  return {
    user,
    loading,
    isAuthenticated,
    userRole,
    signOut,
  }
} 
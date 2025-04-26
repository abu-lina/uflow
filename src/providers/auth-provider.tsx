/**
 * @fileoverview Authentication provider for the application
 * @module providers/auth
 */

'use client'

import { createContext, useContext, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { useAuth } from '@/hooks/auth/useAuth'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

/**
 * Hook to access the auth context
 * @returns AuthContextType
 * @throws Error if used outside of AuthProvider
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * Provider component that wraps the application with auth context
 * @param children - React children
 * @returns JSX.Element
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { user, loading } = useAuth()

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      user,
      loading,
    }),
    [user, loading]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 
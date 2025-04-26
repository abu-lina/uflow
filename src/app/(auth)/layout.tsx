'use client'

import { redirect } from 'next/navigation'
import { useAuthContext } from '@/providers/auth-provider'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuthContext()

  if (loading) {
    return null
  }

  // If user is already authenticated, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      {children}
    </div>
  )
} 
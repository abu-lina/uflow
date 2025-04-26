'use client'

import { redirect } from 'next/navigation'
import { useAuthContext } from '@/providers/auth-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuthContext()

  if (loading) {
    return null
  }

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
} 
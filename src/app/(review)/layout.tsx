'use client'

import { redirect } from 'next/navigation'
import { useAuthContext } from '@/providers/auth-provider'
import { Navbar } from '@/components/layout/navbar'

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuthContext()

  if (loading) {
    return null
  }

  if (!user || user.role !== 'reviewer') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  )
} 
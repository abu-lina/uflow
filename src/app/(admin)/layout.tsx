'use client';

import { redirect } from 'next/navigation';

import { useAuthContext } from '@/providers/auth-provider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();

  if (loading) {
    return null;
  }

  // Check if user has admin role
  if (!user?.user_metadata?.role?.includes('admin')) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">{children}</div>
    </div>
  );
}

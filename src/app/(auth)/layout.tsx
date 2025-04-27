'use client';

import { redirect } from 'next/navigation';

import { useAuthContext } from '@/providers/auth-provider';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();

  if (loading) {
    return null;
  }

  // If user is already authenticated, redirect to dashboard
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">{children}</div>
  );
}

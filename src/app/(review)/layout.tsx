'use client';

import { redirect } from 'next/navigation';

import { Navbar } from '@/components/layout/navbar';
import { useAuthContext } from '@/providers/auth-provider';

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();

  if (loading) {
    return null;
  }

  if (!user || user.role !== 'reviewer') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

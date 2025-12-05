'use client';

import { useAuth } from '@/providers/auth-provider';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { User, Mail, Calendar } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-content-heading">Dashboard</h1>
          <p className="mt-2 text-content-muted">Welcome back to your account</p>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="text-primary" size={24} />
              </div>
              <h2 className="ml-4 text-xl font-semibold text-content-heading">
                Profile Information
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center border-b border-border pb-4">
                <Mail className="text-content-muted" size={20} />
                <div className="ml-4">
                  <p className="text-sm text-content-muted">Email</p>
                  <p className="font-medium text-content">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center border-b border-border pb-4">
                <User className="text-content-muted" size={20} />
                <div className="ml-4">
                  <p className="text-sm text-content-muted">User ID</p>
                  <p className="font-mono text-sm text-content">{user.id}</p>
                </div>
              </div>

              <div className="flex items-center pb-2">
                <Calendar className="text-content-muted" size={20} />
                <div className="ml-4">
                  <p className="text-sm text-content-muted">Member Since</p>
                  <p className="font-medium text-content">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-content-heading">Quick Actions</h2>
            <div className="space-y-3">
              <Button fullWidth variant="outline">
                Edit Profile
              </Button>
              <Button fullWidth variant="outline">
                Settings
              </Button>
              <Button fullWidth variant="danger" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-info/20 bg-info-soft p-6">
            <h3 className="mb-2 font-semibold text-info-dark">Getting Started</h3>
            <p className="text-sm text-content">
              This is a sample dashboard page. You can customize it to fit your application's needs.
              Add your own components, fetch data from Supabase, and build amazing features!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}




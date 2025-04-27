'use client';

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useAuthContext } from '@/providers/auth-provider';

export default function ForceLoginPage() {
  const { user } = useAuthContext();
  const [status, setStatus] = useState('Checking authentication state...');
  const [working, setWorking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAndFixAuth = async () => {
      setWorking(true);
      setStatus('Checking authentication...');

      try {
        if (user) {
          setStatus('User is authenticated, redirecting...');
          router.push('/dashboard');
          return;
        }

        setStatus('No active session found, redirecting to login...');
        router.push('/login');
      } catch (error) {
        console.error('Error checking auth:', error);
        setStatus('Error checking authentication state');
      } finally {
        setWorking(false);
      }
    };

    checkAndFixAuth();
  }, [user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Authentication Check</h1>
        <p className="text-muted-foreground">{status}</p>
        {working && (
          <div className="mt-4">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

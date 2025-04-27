'use client';

import { useEffect } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';

export default function AuthLogger() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    console.log('Auth state changed:');
    console.log('User:', user);
    console.log('Is Loading:', isLoading);
  }, [user, isLoading]);

  return null; // This component doesn't render anything
}

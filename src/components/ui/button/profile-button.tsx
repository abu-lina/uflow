'use client';

import Link from 'next/link';

import { useAuth } from '@/features/auth/context/AuthContext';

export default function ProfileButton() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Link
        className="flex items-center space-x-2 rounded-full bg-emerald-600 px-4 py-3 text-white shadow-lg hover:bg-emerald-700"
        href="/profile"
      >
        <span className="font-medium">My Profile</span>
      </Link>
    </div>
  );
}

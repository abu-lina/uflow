'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function ProfileButton() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Link 
        href="/profile" 
        className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-3 rounded-full shadow-lg flex items-center space-x-2"
      >
        <span className="font-medium">My Profile</span>
      </Link>
    </div>
  );
} 
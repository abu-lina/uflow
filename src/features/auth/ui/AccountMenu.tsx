'use client';

import { useState } from 'react';

import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';

export function AccountMenu() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      <button
        className="flex items-center space-x-2 rounded-full bg-gray-100 p-2 hover:bg-gray-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-sm font-medium">{user.email}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5">
          <button
            className="block w-full px-4 py-2 text-left text-sm text-content hover:bg-gray-100"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

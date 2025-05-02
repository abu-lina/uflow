'use client';

import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function AccountMenu() {
  const { user } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-4">
      <span className="text-gray-700">{user.email}</span>
      <button
        onClick={handleSignOut}
        className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
      >
        Sign out
      </button>
    </div>
  );
} 
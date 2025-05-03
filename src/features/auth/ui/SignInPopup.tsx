'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { XMarkIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

import { Logo } from '@/components/ui/Logo';
import { supabase } from '@/lib/supabase/client';

interface SignInPopupProps {
  onClose: () => void;
}

export function SignInPopup({ onClose }: SignInPopupProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast.success('Signed in successfully!');
      router.push('/dashboard');
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An error occurred during sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-8">
        <button
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <XMarkIcon className="size-6" />
        </button>

        <div className="mb-8 flex justify-center">
          <Logo className="h-12" />
        </div>

        <h2 className="mb-6 text-center text-2xl font-semibold text-gray-900">
          Sign in to your account
        </h2>

        <form onSubmit={handleSignIn}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="email">
              Email
            </label>
            <input
              required
              className="w-full rounded-lg border border-gray-300 p-2 focus:border-primary focus:ring-0"
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="password">
              Password
            </label>
            <input
              required
              className="w-full rounded-lg border border-gray-300 p-2 focus:border-primary focus:ring-0"
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            className="flex h-14 w-full items-center justify-center rounded-[16.8px] bg-primary text-[20px] font-medium text-white"
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <>
                <div className="mr-2 size-6 animate-spin rounded-full border-2 border-white border-t-[#DBF7F4]" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <button
          className="mt-2 w-full text-right text-[16px] font-light text-black underline"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

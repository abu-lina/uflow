'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/features/auth/context/AuthContext';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase } = useAuth();

  useEffect(() => {
    // Check if we have a valid reset token
    const token = searchParams.get('token');
    if (!token) {
      router.push('/auth/login?message=Invalid or expired reset link');
    }
  }, [searchParams, router]);

  const validatePasswords = () => {
    if (password.length < 8) return false;
    if (password !== confirmPassword) return false;
    return true;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    if (e.target.name === 'password') {
      setPassword(newPassword);
    } else {
      setConfirmPassword(newPassword);
    }
    setIsValid(validatePasswords());
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login?message=Password updated successfully');
      }, 3000);
    } catch (error) {
      console.error('Error updating password:', error);
      setError(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter your new password below.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          {success && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
              Password updated successfully! Redirecting to login...
            </div>
          )}

          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label className="sr-only" htmlFor="password">
                New password
              </label>
              <input
                required
                className="relative block w-full appearance-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                disabled={success}
                id="password"
                name="password"
                placeholder="New password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <input
                required
                className="relative block w-full appearance-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                disabled={success}
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={handlePasswordChange}
              />
            </div>
          </div>

          <div className="flex flex-col items-center">
            <button
              className={`flex h-[40px] w-[263px] items-center justify-center rounded-[15px] text-[17.54px] font-medium leading-[31px] tracking-[0.153846px] shadow-[0px_6.15385px_12.3077px_4.61538px_rgba(0,0,0,0.15),0px_1.53846px_4.61538px_rgba(0,0,0,0.3)] ${
                isValid && !success
                  ? 'bg-[#BFDBD8] text-[#232323] hover:bg-[#A8C9C5]'
                  : 'cursor-not-allowed bg-[#EEEEEE] text-[#CDCDCD]'
              }`}
              disabled={!isValid || isSubmitting || success}
              type="submit"
            >
              Bismillah
            </button>
          </div>

          <div className="text-center text-sm">
            <Link className="font-medium text-primary hover:text-primary-dark" href="/auth/login">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

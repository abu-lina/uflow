'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

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
        password: password
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter your new password below.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm">
              Password updated successfully! Redirecting to login...
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="password" className="sr-only">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="New password"
                value={password}
                onChange={handlePasswordChange}
                disabled={success}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={handlePasswordChange}
                disabled={success}
              />
            </div>
          </div>

          <div className="flex flex-col items-center">
            <button
              type="submit"
              disabled={!isValid || isSubmitting || success}
              className={`w-[263px] h-[40px] rounded-[15px] flex items-center justify-center text-[17.54px] font-medium leading-[31px] tracking-[0.153846px] shadow-[0px_6.15385px_12.3077px_4.61538px_rgba(0,0,0,0.15),0px_1.53846px_4.61538px_rgba(0,0,0,0.3)] ${
                isValid && !success
                  ? 'bg-[#BFDBD8] text-[#232323] hover:bg-[#A8C9C5]'
                  : 'bg-[#EEEEEE] text-[#CDCDCD] cursor-not-allowed'
              }`}
            >
              Bismillah
            </button>
          </div>

          <div className="text-sm text-center">
            <Link
              href="/auth/login"
              className="font-medium text-primary hover:text-primary-dark"
            >
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
} 
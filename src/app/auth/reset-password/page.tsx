'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { BismillahButton } from '@/components/ui/bismillah-button';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { supabase } = useAuth();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setIsValid(validateEmail(newEmail));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('Sending password reset request for email:', email);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`
      });
      
      console.log('Supabase response:', { 
        data, 
        error,
        email,
        redirectUrl: `${window.location.origin}/auth/update-password`
      });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      // Even if data is null, if there's no error, the request was successful
      setSuccess(true);
      // Don't redirect immediately to show success message
    } catch (error) {
      console.error('Error resetting password:', error);
      setError(error instanceof Error ? error.message : 'Failed to send reset instructions');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we&apos;ll send you instructions to reset your password.
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
              Check your email for password reset instructions. You can close this window.
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={handleEmailChange}
                disabled={success}
              />
            </div>
          </div>

          <div className="flex flex-col items-center">
            <BismillahButton
              type="submit"
              disabled={!isValid || isSubmitting || success}
              isActive={isValid && !success}
            />
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
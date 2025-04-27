'use client';

import { useState } from 'react';

import Link from 'next/link';

import { FilledButton } from '@/components/ui/button/filled';
import { useAuth } from '@/features/auth/context/AuthContext';

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
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      console.log('Supabase response:', {
        data,
        error,
        email,
        redirectUrl: `${window.location.origin}/auth/update-password`,
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we&apos;ll send you instructions to reset your password.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          {success && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
              Check your email for password reset instructions. You can close this window.
            </div>
          )}

          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label className="sr-only" htmlFor="email">
                Email address
              </label>
              <input
                required
                autoComplete="email"
                className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                disabled={success}
                id="email"
                name="email"
                placeholder="Email address"
                type="email"
                value={email}
                onChange={handleEmailChange}
              />
            </div>
          </div>

          <div className="flex flex-col items-center">
            <FilledButton
              className="w-full"
              disabled={!isValid || isSubmitting || success}
              type="submit"
            >
              {isSubmitting ? 'Senden...' : 'Passwort zurücksetzen'}
            </FilledButton>
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

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error('Failed to send reset email', {
          description: error.message,
        });
        return;
      }

      setEmailSent(true);
      toast.success('Reset email sent', {
        description: 'Check your email for the password reset link.',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-muted to-white px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-content-heading">Reset Password</h1>
          <p className="mt-2 text-content-muted">
            {emailSent
              ? 'Check your email for the reset link'
              : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {!emailSent ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-content" htmlFor="email">
                Email
              </label>
              <input
                required
                className="mt-1 block w-full rounded-lg border border-border px-4 py-3 text-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                id="email"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button fullWidth loading={isLoading} type="submit" variant="primary">
              Send Reset Link
            </Button>

            <p className="text-center text-sm text-content-muted">
              Remember your password?{' '}
              <Link className="text-primary hover:text-primary-dark" href="/login">
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <div className="mt-8 text-center">
            <Button fullWidth variant="primary" onClick={() => (window.location.href = '/login')}>
              Back to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}












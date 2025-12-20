'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) {
        toast.error('Failed to reset password', {
          description: error.message,
        });
        return;
      }

      toast.success('Password reset successful');
      router.push('/login');
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
          <h1 className="text-3xl font-bold text-content-heading">Set New Password</h1>
          <p className="mt-2 text-content-muted">Enter your new password</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-content" htmlFor="password">
                New Password
              </label>
              <div className="relative mt-1">
                <input
                  required
                  className="block w-full rounded-lg border border-border px-4 py-3 pr-12 text-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-content" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                required
                className="mt-1 block w-full rounded-lg border border-border px-4 py-3 text-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                id="confirmPassword"
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          <Button fullWidth loading={isLoading} type="submit" variant="primary">
            Reset Password
          </Button>
        </form>
      </div>
    </div>
  );
}












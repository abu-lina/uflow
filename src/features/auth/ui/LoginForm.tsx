'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';
import { z } from 'zod';

import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary';
import { FormSkeleton } from '@/components/ui/skeleton/Skeleton';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase/client';
import { type LoginFormData, loginSchema } from '@/lib/validations/auth';

export function LoginForm() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const validateField = (name: keyof LoginFormData, value: string) => {
    try {
      loginSchema.shape[name].parse(value);
      setErrors((prev) => ({ ...prev, [name]: undefined }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, [name]: error.errors[0].message }));
      }
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name as keyof LoginFormData, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validData = loginSchema.parse(formData);
      const { error } = await supabase.auth.signInWithPassword({
        email: validData.email,
        password: validData.password,
      });

      if (error) {
        throw error;
      }

      toast.success('Successfully signed in!');
      router.push('/dashboard');
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          if (err.path[0]) {
            setErrors((prev) => ({ ...prev, [err.path[0]]: err.message }));
          }
        });
      } else if (error instanceof Error) {
        toast.error(`Authentication failed: ${error.message}`);
      } else {
        toast.error('An unknown error occurred during sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    router.push('/dashboard');
    return null;
  }

  if (loading) {
    return <FormSkeleton />;
  }

  return (
    <ErrorBoundary>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="email">
            Email
          </label>
          <input
            aria-invalid={!!errors.email}
            className={`mt-1 block w-full rounded-md border ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            } px-3 py-2 shadow-sm focus:border-primary focus:outline-none 
              focus:ring-1 focus:ring-primary`}
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="password">
            Password
          </label>
          <input
            aria-invalid={!!errors.password}
            className={`mt-1 block w-full rounded-md border ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            } px-3 py-2 shadow-sm focus:border-primary focus:outline-none 
              focus:ring-1 focus:ring-primary`}
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
          />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
        </div>

        <button
          className="flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#4a8c85] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          disabled={loading || Object.keys(errors).length > 0}
          type="submit"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </ErrorBoundary>
  );
}

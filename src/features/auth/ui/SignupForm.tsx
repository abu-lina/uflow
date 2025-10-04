'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import * as z from 'zod';

import { supabase } from '@/lib/supabase/client';
import { type SignupFormData, signupSchema } from '@/lib/validations/auth';

export function SignupForm() {
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<SignupFormData>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validateForm = () => {
    try {
      signupSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<SignupFormData> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof SignupFormData] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validData = signupSchema.parse(formData);
      const { error } = await supabase.auth.signUp({
        email: validData.email,
        password: validData.password,
      });

      if (error) {
        throw error;
      }

      router.push('/dashboard');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<SignupFormData> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof SignupFormData] = err.message;
          }
        });
        setErrors(newErrors);
      } else if (error instanceof Error) {
        console.error('Signup error:', error);
      } else {
        console.error('Unknown signup error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
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
          autoComplete="new-password"
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

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="confirmPassword">
          Confirm Password
        </label>
        <input
          aria-invalid={!!errors.confirmPassword}
          autoComplete="new-password"
          className={`mt-1 block w-full rounded-md border ${
            errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
          } px-3 py-2 shadow-sm focus:border-primary focus:outline-none 
            focus:ring-1 focus:ring-primary`}
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
        )}
      </div>

      <button
        className="flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#4a8c85] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        disabled={loading || Object.keys(errors).length > 0}
        type="submit"
      >
        {loading ? 'Signing up...' : 'Sign up'}
      </button>
    </form>
  );
}

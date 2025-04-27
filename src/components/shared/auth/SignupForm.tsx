'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { FilledButton } from '@/components/ui/button/filled';
import { Input } from '@/components/ui/input/input';
import { Label } from '@/components/ui/label/label';
import { createServerClient } from '@/lib/database/supabase-server';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export const SignupForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createServerClient();
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        throw error;
      }

      router.push('/profile');
    } catch (error) {
      console.error('Error signing up:', error);
      setErrors({ email: 'An error occurred during signup' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {Object.entries(errors).map(([key, value]) => (
            <div key={key} className="rounded-md bg-red-50 p-3 text-red-600">
              {value}
            </div>
          ))}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              error={errors.email}
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              error={errors.password}
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              error={errors.confirmPassword}
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>
          <div>
            <FilledButton className="w-full" disabled={isLoading} type="submit">
              {isLoading ? 'Signing up...' : 'Sign Up'}
            </FilledButton>
          </div>
        </form>
      </div>
    </div>
  );
};

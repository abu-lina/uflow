'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context/AuthContext';
import { BismillahButton } from '@/components/core/bismillah-button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { signIn } = useAuth();

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email) && password.length > 0;
    console.log('Form validation:', { email, password, isValid });
    return isValid;
  };

  // Handle both manual input and auto-fill
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log('Input change:', { name, value });
    if (name === 'email') {
      setEmail(value);
    } else {
      setPassword(value);
    }
    setError(null);
  };

  // Handle change event (catches auto-fill)
  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;
    console.log('Change event:', { name, value });
    if (name === 'email') {
      setEmail(value);
    } else {
      setPassword(value);
    }
    setError(null);
  };

  // Validate form whenever email or password changes
  useEffect(() => {
    setIsValid(validateForm());
  }, [email, password]);

  // Set up event listeners and check for auto-fill
  useEffect(() => {
    const emailInput = emailRef.current;
    const passwordInput = passwordRef.current;

    if (emailInput) {
      emailInput.addEventListener('change', handleChange);
    }
    if (passwordInput) {
      passwordInput.addEventListener('change', handleChange);
    }

    // Check for auto-filled values
    const checkAutoFill = () => {
      if (emailInput && passwordInput) {
        const emailValue = emailInput.value;
        const passwordValue = passwordInput.value;
        console.log('Checking auto-fill:', { emailValue, passwordValue });
        
        if (emailValue && passwordValue) {
          setEmail(emailValue);
          setPassword(passwordValue);
        }
      }
    };

    // Check immediately and after a short delay
    checkAutoFill();
    const timeoutId = setTimeout(checkAutoFill, 100);
    
    return () => {
      if (emailInput) {
        emailInput.removeEventListener('change', handleChange);
      }
      if (passwordInput) {
        passwordInput.removeEventListener('change', handleChange);
      }
      clearTimeout(timeoutId);
    };
  }, []); // Remove dependencies to prevent re-running on every state change

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error, success } = await signIn(email, password);
      
      if (error) {
        throw error;
      }

      if (success) {
        router.push('/');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                href="/auth/reset-password"
                className="font-medium text-primary hover:text-primary-dark"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <BismillahButton
              type="submit"
              disabled={!isValid || isSubmitting}
              isActive={isValid && !isSubmitting}
            />
          </div>

          <div className="text-sm text-center">
            <Link
              href="/auth/register"
              className="font-medium text-primary hover:text-primary-dark"
            >
              Don&apos;t have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
} 
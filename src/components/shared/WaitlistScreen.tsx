'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';

interface WaitlistScreenProps {
  onSuccess: (email: string) => void;
  onProviderQuestion: (email: string) => void;
}

export function WaitlistScreen({ onSuccess: _onSuccess, onProviderQuestion }: WaitlistScreenProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError(null);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Set loading state
    setIsSubmitting(true);

    // Show provider question modal immediately
    // We'll submit to backend after user answers
    onProviderQuestion(email);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center px-4 sm:px-6 lg:px-8">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-md flex-col items-center gap-8"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Heading */}
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="font-inter-tight text-3xl font-semibold leading-tight text-[#232323] sm:text-4xl">
            Join the Waitlist
          </h1>
          <p className="font-inter text-base leading-normal text-[#555555] sm:text-lg">
            Be the first to know when we launch
          </p>
        </div>

        {/* Form */}
        <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
          <FormInput
            aria-label="Email address"
            autoComplete="email"
            disabled={isSubmitting}
            label="Email"
            placeholder="Enter your email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null); // Clear error on change
            }}
          />

          {/* Error message */}
          {error && (
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              aria-live="polite"
              className="text-sm text-[#D86363]"
              initial={{ opacity: 0, y: -10 }}
              role="alert"
              transition={{ duration: 0.2 }}
            >
              {error}
            </motion.p>
          )}

          {/* Submit button */}
          <Button
            fullWidth
            aria-label="Join waitlist"
            disabled={isSubmitting || !email.trim()}
            loading={isSubmitting}
            loadingText="Joining..."
            size="lg"
            type="submit"
            variant="primary"
          >
            Join Waitlist
          </Button>
        </form>

        {/* Additional info */}
        <p className="text-center font-inter text-sm text-[#999999]">
          We respect your privacy. No spam, ever.
        </p>
      </motion.div>
    </div>
  );
}


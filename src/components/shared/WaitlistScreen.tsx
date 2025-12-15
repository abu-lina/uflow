'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { useLanguage } from '@/providers/LanguageProvider';

interface WaitlistScreenProps {
  onSuccess: (email: string) => void;
  onProviderQuestion: (email: string) => void;
}

export function WaitlistScreen({ onSuccess: _onSuccess, onProviderQuestion }: WaitlistScreenProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

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

    // Check terms acceptance
    if (!termsAccepted || !privacyAccepted) {
      setError(t('legal.consentRequired') || 'You must accept the Terms of Service and Privacy Policy');
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
          <Logo height={96} width={96} />
          <h1 className="font-inter-tight text-3xl font-semibold leading-tight text-content-heading sm:text-4xl">
            {t('waitlist.title')}
          </h1>
          <p className="font-inter text-base leading-normal text-content sm:text-lg">
            {t('waitlist.description')}
          </p>
        </div>

        {/* Form */}
        <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
          <FormInput
            aria-label="Email address"
            autoComplete="email"
            disabled={isSubmitting}
            label="Email"
            placeholder={t('waitlist.emailPlaceholder')}
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

          {/* Consent Checkbox */}
          <div className="mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                required
                aria-label={t('legal.acceptTerms') || 'Accept Terms of Service and Privacy Policy'}
                aria-required="true"
                checked={termsAccepted && privacyAccepted}
                className="h-4 w-4 rounded border-gray-300 text-[#589D96] focus:ring-[#589D96] focus:ring-2 flex-shrink-0"
                disabled={isSubmitting}
                type="checkbox"
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  setPrivacyAccepted(e.target.checked);
                }}
              />
              <span className="text-[11px] leading-[13px] text-[#7A7A7A]">
                {t('waitlist.acceptTermsText') || 'I accept the '}
                <Link className="underline hover:text-[#589D96]" href="/terms">
                  {t('legal.termsOfService') || 'Terms of Service'}
                </Link>
                {t('waitlist.acceptTermsAnd') || ' and '}
                <Link className="underline hover:text-[#589D96]" href="/privacy-policy">
                  {t('legal.privacyPolicy') || 'Privacy Policy'}
                </Link>
                {t('waitlist.acceptTermsEnd') || '.'}
              </span>
            </label>
          </div>

          {/* Submit button */}
          <Button
            fullWidth
            aria-label="Join waitlist"
            disabled={isSubmitting || !email.trim() || !termsAccepted || !privacyAccepted}
            loading={isSubmitting}
            loadingText={t('waitlist.joining')}
            size="lg"
            type="submit"
            variant="primary"
          >
            {t('waitlist.joinButton')}
          </Button>
        </form>

        {/* Additional info */}
        <p className="text-center font-inter text-sm text-[#999999]">
          {t('waitlist.privacyNotice')}
        </p>
      </motion.div>
    </div>
  );
}


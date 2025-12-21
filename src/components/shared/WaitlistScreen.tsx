'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import Link from 'next/link';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/providers/LanguageProvider';
import { getFeatureFlag } from '@/config/feature-flags';
import type { WaitlistResponse } from '@/types/waitlist';

interface WaitlistScreenProps {
  onSuccess: (email: string, token?: string) => void;
  onProviderQuestion: (email: string) => void;
}

export function WaitlistScreen({ onSuccess: _onSuccess, onProviderQuestion }: WaitlistScreenProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure we're mounted before rendering portal (avoid hydration issues)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError(null);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError(t('waitlist.errorInvalidEmail'));
      return;
    }

    // Check terms acceptance
    if (!termsAccepted || !privacyAccepted) {
      setError(t('waitlist.errorConsentRequired'));
      return;
    }

    // Set loading state
    setIsSubmitting(true);

    // Check if provider selection modal is enabled
    const showProviderModal = getFeatureFlag('enableProviderSelectionModal');
    
    if (showProviderModal) {
      // Show provider question modal - user will answer and submit happens in modal
      onProviderQuestion(email);
    } else {
      // Feature flag disabled - submit directly without asking if they're a provider
      try {
        const response = await fetch('/api/waitlist/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            isProvider: null, // Skip provider question
          }),
        });

        const data: WaitlistResponse = await response.json();

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 409) {
            setError(data.error?.message || t('waitlist.errorAlreadyOnWaitlist'));
          } else if (response.status === 429) {
            setError(t('waitlist.errorTooManyRequests'));
          } else {
            setError(data.error?.message || t('waitlist.errorGeneric'));
          }
          setIsSubmitting(false);
          return;
        }

        // Success - extract token and show success screen
        console.log('[Waitlist] Successfully joined (provider modal skipped):', { email });
        const waitlistToken = data.data?.waitlistToken;
        
        // Call onSuccess with email and token
        _onSuccess(email, waitlistToken);
        
        // Note: Token is also stored in HTTP-only cookie by the API as backup
      } catch (err) {
        console.error('[Waitlist] Submit error:', err);
        setError(t('waitlist.errorNetworkError'));
        setIsSubmitting(false);
      }
    }
  };

  // Language switcher portal - render at document root to avoid clipping
  const languageSwitcherPortal = isMounted && typeof document !== 'undefined' && document.body ? createPortal(
    <div 
      className="fixed top-2 right-2 z-[9999] md:top-3 md:right-3" 
      style={{ 
        paddingTop: 'max(env(safe-area-inset-top), 0.25rem)',
        paddingRight: 'max(env(safe-area-inset-right), 0.25rem)'
      }}
    >
      <LanguageSwitcher variant="dropdown" />
    </div>,
    document.body
  ) : null;

  return (
    <>
      {languageSwitcherPortal}
      <div className="relative flex h-screen w-full items-center justify-center px-4 sm:px-6 lg:px-8">

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
            aria-label={t('auth.email')}
            autoComplete="email"
            disabled={isSubmitting}
            label={t('auth.email')}
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
              className="text-sm text-danger"
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
                className="h-4 w-4 rounded border text-primary focus:ring-primary focus:ring-2 flex-shrink-0"
                disabled={isSubmitting}
                type="checkbox"
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  setPrivacyAccepted(e.target.checked);
                }}
              />
              <span className="text-[11px] leading-[13px] text-content-muted">
                {t('waitlist.acceptTermsText') || 'I accept the '}
                <Link className="underline hover:text-primary" href="/terms">
                  {t('legal.termsOfService') || 'Terms of Service'}
                </Link>
                {t('waitlist.acceptTermsAnd') || ' and '}
                <Link className="underline hover:text-primary" href="/privacy-policy">
                  {t('legal.privacyPolicy') || 'Privacy Policy'}
                </Link>
                {t('waitlist.acceptTermsEnd') || '.'}
              </span>
            </label>
          </div>

          {/* Submit button */}
          <div className="mt-2">
            <Button
              fullWidth
              aria-label={t('waitlist.joinButton')}
              disabled={isSubmitting || !email.trim() || !termsAccepted || !privacyAccepted}
              loading={isSubmitting}
              loadingText={t('waitlist.joining')}
              size="lg"
              type="submit"
              variant="primary"
            >
              {t('waitlist.joinButton')}
            </Button>
          </div>
        </form>

        {/* Additional info */}
        <p className="text-center font-inter text-sm text-content-muted">
          {t('waitlist.privacyNotice')}
        </p>
      </motion.div>
      </div>
    </>
  );
}


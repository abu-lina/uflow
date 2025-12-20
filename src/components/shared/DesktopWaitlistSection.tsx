'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { ProviderSelectionModal } from '@/components/shared/ProviderSelectionModal';
import { Icon } from '@iconify/react';
import { useLanguage } from '@/providers/LanguageProvider';

export function DesktopWaitlistSection() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

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

    // Set loading state and show provider modal
    setIsSubmitting(true);
    setShowProviderModal(true);
  };

  const handleModalClose = () => {
    setShowProviderModal(false);
    setIsSubmitting(false);
  };

  const handleComplete = () => {
    setShowProviderModal(false);
    setShowSuccess(true);
    setIsSubmitting(false);
  };

  return (
    <section
      aria-labelledby="waitlist-heading"
      className="flex h-screen w-full scroll-mt-16 flex-col items-center justify-center gap-8 px-4 focus:outline-none sm:px-6 lg:px-8"
      id="waitlist"
    >
      <div className="flex w-full max-w-screen-md flex-col items-center gap-8">
        {!showSuccess ? (
          <>
            {/* Heading */}
            <motion.div
              className="flex w-full flex-col items-center gap-4 sm:gap-6"
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <Logo height={96} width={96} />
              <h2
                className="w-full max-w-[960px] text-center font-inter-tight text-2xl font-medium leading-tight text-black sm:text-3xl md:text-4xl lg:text-5xl"
                id="waitlist-heading"
              >
                {t('waitlist.title')}
              </h2>
              <p className="w-full max-w-2xl text-center font-inter text-base leading-snug text-content sm:text-lg md:text-xl">
                {t('waitlist.description')}
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              className="flex w-full max-w-md flex-col gap-4"
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
            >
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
              </div>

              {/* Privacy notice */}
              <p className="text-center font-inter text-sm text-content-muted">
                {t('waitlist.privacyNotice')}
              </p>
            </motion.form>
          </>
        ) : (
          // Success State
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="flex w-full max-w-md flex-col items-center gap-8"
            initial={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Success Icon */}
            <motion.div
              animate={{ scale: 1, opacity: 1 }}
              className="flex size-20 items-center justify-center rounded-full bg-primary/10"
              initial={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            >
              <Icon 
                className="size-10 text-primary" 
                icon="material-symbols:check-circle-rounded" 
              />
            </motion.div>

            {/* Success Message */}
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
            >
              <h2 className="font-inter-tight text-3xl font-semibold leading-tight text-content-heading sm:text-4xl">
                {t('waitlist.successTitle')}
              </h2>
              <p className="font-inter text-base leading-normal text-content sm:text-lg">
                {t('waitlist.successDescription')}
              </p>
            </motion.div>

            {/* Additional Info */}
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex w-full flex-col items-center gap-4 rounded-2xl bg-neutral-muted px-6 py-4"
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
            >
              <p className="text-center font-inter text-sm leading-relaxed text-content">
                {t('waitlist.successMessage')}
              </p>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Provider Selection Modal */}
      <ProviderSelectionModal
        email={email}
        isOpen={showProviderModal}
        onClose={handleModalClose}
        onComplete={handleComplete}
      />
    </section>
  );
}


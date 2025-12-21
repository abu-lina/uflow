'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/providers/LanguageProvider';

interface EarlyAccessScreenProps {
  email: string;
  waitlistToken: string; // Can be empty string if token is in HTTP-only cookie
  onComplete: () => void;
  onSuggestProvider: () => void;
  onSelectCity: () => void;
  onLearnMore: () => void;
}

export function EarlyAccessScreen({
  email,
  waitlistToken,
  onComplete,
  onSuggestProvider,
  onSelectCity,
  onLearnMore,
}: EarlyAccessScreenProps) {
  const { t } = useLanguage();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateWaitlistEntry = async (updates: {
    has_seen_early_access?: boolean;
    skipped_early_access?: boolean;
  }) => {
    setIsUpdating(true);
    
    try {
      const body: Record<string, unknown> = {
        email,
        ...updates,
      };
      
      // Only include token if provided (otherwise API will use cookie)
      if (waitlistToken) {
        body.waitlistToken = waitlistToken;
      }
      
      const response = await fetch('/api/waitlist/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to update waitlist entry');
      }
    } catch (error) {
      console.error('[Early Access] Failed to update:', error);
      // Don't block user flow on error
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSuggestProvider = async () => {
    await updateWaitlistEntry({ has_seen_early_access: true });
    onSuggestProvider();
  };

  const handleSelectCity = async () => {
    await updateWaitlistEntry({ has_seen_early_access: true });
    onSelectCity();
  };

  const handleLearnMore = async () => {
    await updateWaitlistEntry({ has_seen_early_access: true });
    onLearnMore();
  };

  const handleSkip = async () => {
    await updateWaitlistEntry({
      has_seen_early_access: true,
      skipped_early_access: true,
    });
    onComplete();
  };

  return (
    <div className="flex h-screen w-full items-center justify-center px-4 sm:px-6 lg:px-8">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-md flex-col items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Seedling Icon */}
        <motion.div
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl"
          initial={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        >
          🌱
        </motion.div>

        {/* Heading */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
        >
          <h1 className="font-inter-tight text-3xl font-semibold leading-tight text-content-heading sm:text-4xl">
            {t('waitlist.earlyAccess.title')}
          </h1>
          <p className="font-inter text-base leading-normal text-content sm:text-lg whitespace-pre-line">
            {t('waitlist.earlyAccess.description')}
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full flex-col gap-3 mt-2"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
        >
          <Button
            fullWidth
            aria-label={t('waitlist.earlyAccess.suggestProvider')}
            disabled={isUpdating}
            icon="material-symbols:add-business-rounded"
            size="lg"
            variant="primary"
            onClick={handleSuggestProvider}
          >
            {t('waitlist.earlyAccess.suggestProvider')}
          </Button>

          <Button
            fullWidth
            aria-label={t('waitlist.earlyAccess.selectCity')}
            disabled={isUpdating}
            icon="material-symbols:location-city-rounded"
            size="lg"
            variant="secondary"
            onClick={handleSelectCity}
          >
            {t('waitlist.earlyAccess.selectCity')}
          </Button>

          <Button
            fullWidth
            aria-label={t('waitlist.earlyAccess.learnMore')}
            disabled={isUpdating}
            icon="material-symbols:info-rounded"
            size="lg"
            variant="ghost"
            onClick={handleLearnMore}
          >
            {t('waitlist.earlyAccess.learnMore')}
          </Button>
        </motion.div>

        {/* Skip Link */}
        <motion.button
          animate={{ opacity: 1 }}
          aria-label={t('waitlist.earlyAccess.skipForNow')}
          className="text-sm text-content-muted hover:text-content transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isUpdating}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          type="button"
          onClick={handleSkip}
        >
          {t('waitlist.earlyAccess.skipForNow')}
        </motion.button>
      </motion.div>
    </div>
  );
}

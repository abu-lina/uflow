'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface EmptyCityCardProps {
  cityName: string;
  userEmail?: string | null; // From session if authenticated
}

/**
 * Plan 093 M1 — Empty-city notification card
 *
 * Shows when a user searches for a city with no providers.
 * - Authenticated users: one-tap "Notify me" (email from session)
 * - Anonymous users: email input + "Notify me" button
 * - Subtle provider CTA as secondary link
 */
export function EmptyCityCard({ cityName, userEmail }: EmptyCityCardProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const isAuthenticated = Boolean(userEmail);

  const handleNotifyMe = async () => {
    setIsSubmitting(true);
    setSubmitState('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/city-interest/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityName,
          ...(isAuthenticated ? {} : { email: email.trim() }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitState('error');
        setErrorMessage(data.error || t('suchen.notifyMeError'));
        return;
      }

      setSubmitState('success');
      setEmail(''); // Clear email field on success
    } catch (error) {
      console.error('Notify me error:', error);
      setSubmitState('error');
      setErrorMessage(t('suchen.notifyMeError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitState === 'success') {
    return (
      <div
        aria-live="polite"
        className="mt-4 rounded-2xl border border-border-light bg-neutral-50 px-4 py-6 dark:bg-neutral-900/30"
        role="status"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">
              {t('suchen.notifyMeSuccess', { city: cityName })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-4 rounded-2xl border border-border-light bg-neutral-50 px-4 py-6 dark:bg-neutral-900/30"
      dir="auto"
    >
      {/* Header with icon */}
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <Bell className="h-5 w-5 text-text-muted" />
        </div>
        <div className="flex-1">
          <p className="mb-1 text-sm font-medium text-text-primary">
            {t('suchen.notifyMeCityUnavailable', { city: cityName })}
          </p>
        </div>
      </div>

      {/* Authenticated: one-tap button */}
      {isAuthenticated && (
        <div className="space-y-3">
          <Button
            aria-label={t('suchen.notifyMe')}
            className="w-full"
            disabled={isSubmitting}
            variant="secondary"
            onClick={handleNotifyMe}
          >
            <Bell className="h-4 w-4" />
            {isSubmitting ? t('common.loading') : t('suchen.notifyMe')}
          </Button>

          {submitState === 'error' && (
            <p aria-live="assertive" className="text-destructive text-sm" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      )}

      {/* Anonymous: email input + button */}
      {!isAuthenticated && (
        <div className="space-y-3">
          <input
            aria-label={t('suchen.notifyMeEmailPlaceholder')}
            className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={isSubmitting}
            placeholder={t('suchen.notifyMeEmailPlaceholder')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button
            aria-label={t('suchen.notifyMe')}
            className="w-full"
            disabled={isSubmitting || !email.trim()}
            variant="secondary"
            onClick={handleNotifyMe}
          >
            <Bell className="h-4 w-4" />
            {isSubmitting ? t('common.loading') : t('suchen.notifyMe')}
          </Button>

          {submitState === 'error' && (
            <p aria-live="assertive" className="text-destructive text-sm" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      )}

      {/* Provider CTA — subtle secondary link */}
      <div className="mt-4 border-t border-border-light pt-4">
        <Link
          className="block text-center text-xs text-text-muted transition-colors hover:text-text-primary"
          href="/recommend"
        >
          {t('suchen.providerCTA')}
        </Link>
      </div>
    </div>
  );
}

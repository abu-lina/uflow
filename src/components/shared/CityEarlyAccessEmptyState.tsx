'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

interface CityEarlyAccessEmptyStateProps {
  cityName: string;
  country?: string;
  onSuggestProvider?: () => void;
  onReceiveUpdates?: () => Promise<void>;
}

/**
 * City Early Access Empty State Screen (SCREEN 6)
 * 
 * Displays when a user selects a city with less than 6 providers.
 * Shows city name, Early Access badge, description, progress bar, and two CTAs.
 * 
 * Design tokens:
 * - Background: bg-uflow-light gradient
 * - Typography: Inter Tight (title), Inter (body)
 * - Colors: semantic tokens (content-heading, content-muted, primary)
 * - Spacing: 8-point grid system
 */
export function CityEarlyAccessEmptyState({
  cityName,
  country: _country,
  onSuggestProvider,
  onReceiveUpdates: _onReceiveUpdates,
}: CityEarlyAccessEmptyStateProps) {
  const { t } = useLanguage();
  const router = useRouter();

  // Detect reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Handle city selection navigation
  const handleCitySelect = () => {
    router.push('/city-selection');
  };

  // Handle suggest provider navigation
  const handleSuggestProvider = () => {
    if (onSuggestProvider) {
      onSuggestProvider();
    } else {
      router.push('/create/recommend');
    }
  };

  // TODO: Implement handleReceiveUpdates when receive updates button is enabled
  // const handleReceiveUpdates = async () => {
  //   const [isSubscribing, setIsSubscribing] = useState(false);
  //   if (onReceiveUpdates) {
  //     setIsSubscribing(true);
  //     try {
  //       await onReceiveUpdates();
  //       toast.success(t('waitlist.cityEarlyAccess.subscribeSuccess').replace('{{city}}', cityName));
  //     } catch (error) {
  //       console.error('[City Early Access] Failed to subscribe:', error);
  //       toast.error(t('waitlist.cityEarlyAccess.subscribeError'));
  //     } finally {
  //       setIsSubscribing(false);
  //     }
  //   }
  // };

  return (
    <div className="flex h-screen w-full flex-col items-center bg-uflow-light">
      {/* Header - 80px with safe area */}
      <header 
        className={cn(
          'flex w-full items-center justify-end',
          'h-20 px-6',
          'pt-safe-top'
        )}
        role="banner"
      >
        {/* Language Selector - Top Right */}
        <LanguageSwitcher variant="dropdown" />
      </header>

      {/* Body - Centered content */}
      <main 
        className={cn(
          'flex flex-1 items-center justify-center',
          'w-full px-6',
          // Account for footer height: pt-footer-safe (8px min) + h-12 (48px) + pb-safe
          // pb-safe = max(12px, env(safe-area-inset-bottom)), so total = max(68px, 56px + env(safe-area-inset-bottom))
          'pb-[max(68px,calc(56px+env(safe-area-inset-bottom)))]'
        )}
        role="main"
      >
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full max-w-[345px] flex-col items-center gap-8"
          initial={{ opacity: 0, y: 20 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
        >
          {/* Title + Badge Container */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full flex-col items-center gap-1"
            initial={{ opacity: 0, y: 20 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          >
            {/* City Name - Tappable with Edit Icon */}
            <button
              aria-label={t('waitlist.cityEarlyAccess.changeCity')}
              className="group relative w-full transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
              type="button"
              onClick={handleCitySelect}
            >
              <h1 className="text-center font-inter-tight text-[33px] font-semibold leading-[40px] text-content-heading group-hover:text-primary transition-colors">
                {cityName}
              </h1>
              <Icon
                aria-hidden="true"
                className="absolute right-0 top-1/2 -translate-y-1/2 size-4 text-content-heading group-hover:text-primary transition-all duration-200 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 pointer-events-none"
                icon="lucide:pencil"
                style={{
                  transition: prefersReducedMotion ? 'none' : 'opacity 200ms ease-in-out',
                }}
              />
            </button>

            {/* Early Access Badge */}
            <div className="flex flex-row items-center gap-2 rounded-md border border-border bg-white px-3 py-2">
              <Icon 
                aria-hidden="true"
                className="size-6 text-primary"
                icon="lucide:bird"
              />
              <span className="font-inter-tight text-base font-semibold text-primary">
                {t('waitlist.earlyAccess.badge')}
              </span>
            </div>
          </motion.div>

          {/* H2 Title + Subtitle Container */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full flex-col items-start gap-2"
            initial={{ opacity: 0, y: 20 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.2, ease: 'easeOut' }}
          >
            {/* Title */}
            <h2 className="w-full text-center font-inter text-xl font-medium leading-6 text-content-heading">
              {t('waitlist.cityEarlyAccess.title').replace('{{city}}', cityName)}
            </h2>

            {/* Description */}
            <p className="w-full text-center font-inter text-base font-normal leading-[19px] text-content-muted">
              {t('waitlist.cityEarlyAccess.description').replace('{{city}}', cityName)}
            </p>
          </motion.div>

          {/* CTA Buttons Container */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full flex-col gap-4"
            initial={{ opacity: 0, y: 20 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.4, ease: 'easeOut' }}
          >
            {/* Primary CTA: Suggest Provider */}
            <Button
              fullWidth
              aria-label={t('waitlist.cityEarlyAccess.suggestProvider')}
              className="h-12 justify-center rounded-md font-inter-tight text-base font-medium"
              variant="primary"
              onClick={handleSuggestProvider}
            >
              {t('waitlist.cityEarlyAccess.suggestProvider')}
            </Button>

            {/* Secondary CTA: Receive Updates - Temporarily hidden until functionality is implemented */}
            {/* TODO: Uncomment when handleReceiveUpdates is implemented
            <Button
              fullWidth
              aria-label={t('waitlist.cityEarlyAccess.receiveUpdates').replace('{{city}}', cityName)}
              className="h-12 justify-center rounded-md bg-neutral-light font-inter-tight text-base font-medium text-content-muted shadow-[0px_8px_24px_rgba(238,238,238,0.25)] hover:bg-neutral hover:text-content"
              loading={isSubscribing}
              variant="secondary"
              onClick={handleReceiveUpdates}
            >
              {t('waitlist.cityEarlyAccess.receiveUpdates').replace('{{city}}', cityName)}
            </Button>
            */}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}


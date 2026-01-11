'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

interface EarlyAccessScreenProps {
  email?: string; // Optional - not required when waitlist is skipped
  waitlistToken?: string; // Optional - can be empty string if token is in HTTP-only cookie
}

/**
 * Early Access Home Screen (SCREEN 4)
 * 
 * Simplified early access screen that directs users to city selection.
 * Follows Tailwind semantic tokens and frontend best practices.
 * 
 * Features:
 * - Bird icon (lucide:bird)
 * - Title and description
 * - Single CTA: "Select my city"
 * - Safe area handling
 * - Reduced motion support
 * - Accessibility (ARIA labels, keyboard navigation)
 * 
 * Design tokens:
 * - Background: bg-uflow-light gradient
 * - Typography: Inter Tight (title), Inter (body)
 * - Colors: semantic tokens (content-heading, content-muted, primary)
 * - Spacing: 8-point grid system
 */
export function EarlyAccessScreen({
  email = '',
  waitlistToken = '',
}: EarlyAccessScreenProps) {
  const { t } = useLanguage();
  const router = useRouter();

  // Detect reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Handle city selection navigation - store data before navigation
  const handleSelectCityClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Store email and token in sessionStorage for city selection page (if available)
    if (email) {
      sessionStorage.setItem('waitlistEmail', email);
    }
    if (waitlistToken) {
      sessionStorage.setItem('waitlistToken', waitlistToken);
    }
    
    // Use router.push directly instead of Link to ensure navigation works
    router.push('/city-selection');
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-uflow-light">
      {/* Body - Centered content */}
      <main 
        className={cn(
          'flex items-center justify-center',
          'w-full px-6'
        )}
        role="main"
      >
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full max-w-[345px] flex-col items-center gap-8"
          initial={{ opacity: 0, y: 20 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
        >
          {/* Icon + Title + Subtitle Container */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full flex-col items-center gap-8"
            initial={{ opacity: 0, y: 20 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          >
            {/* Bird Icon */}
            <motion.div
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            >
              <Icon 
                className="text-content-heading"
                height={96}
                icon="lucide:bird"
                width={96}
              />
            </motion.div>

            {/* Title + Subtitle */}
            <div className="flex w-full flex-col items-start gap-2">
              {/* Title */}
              <h1 className="w-full text-center font-inter-tight text-3xl font-semibold leading-[40px] text-content-heading">
                {t('waitlist.earlyAccess.homeTitle')}
              </h1>

              {/* Subtitle */}
              <p className="w-full text-center font-inter text-base leading-[19px] text-content-muted whitespace-pre-line">
                {t('waitlist.earlyAccess.homeDescription')}
              </p>
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-full relative z-10"
            initial={{ opacity: 0, y: 20 }}
            style={{ pointerEvents: 'auto' }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.3, ease: 'easeOut' }}
          >
            <Button
              fullWidth
              aria-label={t('waitlist.earlyAccess.selectCityButton')}
              className="h-12 justify-center rounded-sm font-inter-tight text-base font-medium relative z-10 w-full"
              size="lg"
              type="button"
              variant="primary"
              onClick={handleSelectCityClick}
            >
              {t('waitlist.earlyAccess.selectCityButton')}
            </Button>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

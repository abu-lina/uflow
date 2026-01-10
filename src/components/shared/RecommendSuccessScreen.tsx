'use client';

import { motion } from 'motion/react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

interface RecommendSuccessScreenProps {
  onRecommendAnother: () => void;
  onGoBack: () => void;
}

/**
 * Provider Recommendation Success Screen
 * 
 * Displays after successful provider recommendation submission.
 * Shows heart icon, "BarakAllahu feek" message, and two CTAs.
 * 
 * Design tokens:
 * - Background: bg-uflow-light gradient
 * - Heart Icon: 96px, black stroke (8px), no fill
 * - Typography: Inter Tight (title), Inter (body)
 * - Colors: semantic tokens (content-heading, content-muted, primary)
 */
export function RecommendSuccessScreen({ 
  onRecommendAnother,
  onGoBack,
}: RecommendSuccessScreenProps) {
  const { t } = useLanguage();
  
  // Detect reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div 
      className="absolute inset-x-0 flex w-full items-center justify-center bg-uflow-light px-6"
      style={{
        top: 'env(safe-area-inset-top)',
        bottom: 'calc(64px + env(safe-area-inset-bottom))',
        height: 'calc(100vh - env(safe-area-inset-top) - 64px - env(safe-area-inset-bottom))',
      }}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-[345px] flex-col items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
      >
        {/* Heart Icon - 96px with 8px stroke */}
        <motion.div
          animate={{ scale: 1, opacity: 1 }}
          className="flex size-24 items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        >
          <Icon 
            className="size-24 text-content-heading" 
            icon="lucide:heart"
            style={{
              strokeWidth: 8,
            }}
          />
        </motion.div>

        {/* Title + Subtitle Container */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full flex-col items-center gap-2 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.3, ease: 'easeOut' }}
        >
          {/* Title: "BarakAllahu feek" */}
          <h1 className="w-full font-inter-tight text-[33px] font-semibold leading-[40px] text-content-heading">
            {t('create.recommend.successTitle')}
          </h1>
          
          {/* Subtitle */}
          <p className="w-full font-inter text-base font-normal leading-[19px] text-content-muted">
            {t('create.recommend.successDescription')}
          </p>
        </motion.div>

        {/* CTA Buttons Container */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full flex-col gap-4"
          initial={{ opacity: 0, y: 20 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.5, ease: 'easeOut' }}
        >
          {/* Primary CTA: "Weiteren Anbieter empfehlen" */}
          <Button
            fullWidth
            aria-label={t('create.recommend.recommendAnother')}
            className="h-12 justify-center rounded-md font-inter-tight text-base font-medium"
            variant="primary"
            onClick={onRecommendAnother}
          >
            {t('create.recommend.recommendAnother')}
          </Button>

          {/* Secondary CTA: "Zurück zur Übersicht" */}
          <Button
            fullWidth
            aria-label={t('create.recommend.backToOverview')}
            className={cn(
              'h-12 justify-center rounded-md',
              'bg-neutral-light font-inter-tight text-base font-medium text-content-muted',
              'shadow-[0px_8px_24px_rgba(238,238,238,0.25)]',
              'hover:bg-neutral hover:text-content'
            )}
            variant="secondary"
            onClick={onGoBack}
          >
            {t('create.recommend.backToOverview')}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

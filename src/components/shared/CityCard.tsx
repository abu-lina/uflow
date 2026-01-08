'use client';

import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

interface CityCardProps {
  cityName: string;
  onSuggestProvider?: () => void;
}

/**
 * City Card Component for Stage 2 (6-14 providers)
 * 
 * Displays a card with Early Access badge, title, description, and CTA button.
 * Matches provider card width for visual consistency:
 * - Width: 288px (w-72, matches ProviderCard width)
 * - Border: 0.7px solid #D4D4D4, 24px radius
 * - Padding: 16px, gap: 24px
 * - Early Access badge with bird icon
 * - Title and description text
 * - Primary CTA button
 */
export function CityCard({ cityName, onSuggestProvider }: CityCardProps) {
  const { t } = useLanguage();

  const handleSuggestProvider = () => {
    if (onSuggestProvider) {
      onSuggestProvider();
    }
  };

  return (
    <div
      className={cn(
        'flex w-full max-w-72 flex-col items-center',
        'gap-6 p-4',
        'bg-white border border-border rounded-[24px]',
        'box-border'
      )}
    >
      {/* Early Access Badge */}
      <div
        className={cn(
          'flex flex-row items-center justify-center',
          'gap-1 px-2 py-0',
          'w-[137px] h-8',
          'bg-white/70 border-[0.8px] border-neutral rounded-[9.6px]',
          'backdrop-blur-[2px]'
        )}
      >
        <Icon
          aria-hidden="true"
          className="size-6 shrink-0 text-content-heading"
          icon="lucide:bird"
        />
        <span className="font-inter-tight text-base font-semibold leading-[19px] text-content-heading whitespace-nowrap">
          {t('waitlist.earlyAccess.badge')}
        </span>
      </div>

      {/* Title + Text Container */}
      <div className="flex w-full flex-col items-start gap-2">
        {/* Title */}
        <h2 className="w-full text-center font-inter text-xl font-medium leading-6 text-content-heading">
          {t('waitlist.cityEarlyAccess.title').replace('{{city}}', cityName)}
        </h2>

        {/* Description */}
        <p className="w-full text-center font-inter text-base font-normal leading-[19px] text-content-muted">
          {t('waitlist.cityEarlyAccess.description').replace('{{city}}', cityName)}
        </p>
      </div>

      {/* CTA Button */}
      <div className="flex w-full flex-col gap-3">
        <Button
          fullWidth
          aria-label={t('waitlist.cityEarlyAccess.suggestProvider')}
          className="h-12 justify-center rounded-sm font-inter-tight text-base font-medium"
          variant="primary"
          onClick={handleSuggestProvider}
        >
          {t('waitlist.cityEarlyAccess.suggestProvider')}
        </Button>
      </div>
    </div>
  );
}

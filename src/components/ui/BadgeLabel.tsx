'use client';

import { BadgeKey, TrustLevel } from '@/types/badges';
import type {
  BadgeWithConfirmationStatus,
  ProviderBadgeWithType,
} from '@/types/badges';
import { TrustLevelIcon } from '@/components/ui/icons/TrustLevelIcon';
import { cn } from '@/lib/utils';

interface BadgeLabelProps {
  badge: BadgeWithConfirmationStatus | ProviderBadgeWithType;
  language?: 'de' | 'en';
  className?: string;
  showIcon?: boolean;
  size?: 'md' | 'sm';
}

/**
 * BadgeLabel Component
 *
 * Displays a badge label with text and optional trust level icon.
 * Shows trust level icons for COMMUNITY_CONFIRMED and UMMAH_FLOW_VERIFIED.
 * Hides icon for SELF_DECLARED trust level.
 *
 * @example
 * ```tsx
 * <BadgeLabel badge={badge} language="de" />
 * ```
 */
export function BadgeLabel({
  badge,
  language = 'de',
  className,
  showIcon = true,
  size = 'md',
}: BadgeLabelProps) {
  // Get badge type and trust level
  const badgeType = badge.badge_type;
  const trustLevel = badge.trust_level;

  if (!badgeType) {
    console.warn('[BadgeLabel] Badge missing badge_type:', badge);
    return null;
  }

  const shortLabels: Partial<
    Record<
      BadgeKey,
      {
        en: string;
        de: string;
      }
    >
  > = {
    [BadgeKey.HALAL]: { en: 'HALAL', de: 'HALAL' },
    [BadgeKey.MUSLIM_OWNED]: { en: 'MUSLIM', de: 'MUSLIM' },
    [BadgeKey.FAMILY_FRIENDLY]: { en: 'FAMILY', de: 'FAMILIE' },
    [BadgeKey.PRAYER_FRIENDLY]: { en: 'PRAYER', de: 'GEBET' },
    [BadgeKey.SUPPORTS_SADAQAH]: { en: 'SADAQAH', de: 'SADAQAH' },
    [BadgeKey.WOMEN_FRIENDLY]: { en: 'WOMEN', de: 'FRAUEN' },
    [BadgeKey.COMMUNITY_ACTIVE]: { en: 'COMMUNITY', de: 'GEMEINDE' },
  };

  // Get label text based on language
  const labelText =
    badgeType.labels[language] || badgeType.labels.de || badgeType.badge_key;

  const shortLabel =
    shortLabels[badgeType.badge_key]?.[language] ||
    shortLabels[badgeType.badge_key]?.en ||
    labelText;
  const displayText = shortLabel.toUpperCase();

  // Determine if icon should be shown
  const shouldShowIcon =
    showIcon &&
    (trustLevel === TrustLevel.COMMUNITY_CONFIRMED ||
      trustLevel === TrustLevel.UMMAH_FLOW_VERIFIED);

  // Generate ARIA label
  const ariaLabel = `${labelText}${shouldShowIcon ? `, ${getTrustLevelLabel(trustLevel)}` : ''}`;

  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        'inline-flex flex-row items-center justify-center',
        size === 'sm' ? 'h-6 px-1.5' : 'h-8 px-2',
        'bg-neutral-muted border border-neutral rounded-[3.7px]',
        size === 'sm'
          ? 'font-inter-tight text-sm font-medium text-content-heading'
          : 'font-inter-tight text-base font-medium text-content-heading',
        'whitespace-nowrap',
        className
      )}
      role="status"
    >
      <span className="truncate">{displayText}</span>
      {shouldShowIcon && (
        <TrustLevelIcon
          aria-hidden="true"
          className={cn('shrink-0', size === 'sm' ? 'h-5 w-5' : 'h-6 w-6')}
          trustLevel={trustLevel}
        />
      )}
    </span>
  );
}

/**
 * Helper function to get human-readable trust level label for ARIA
 */
function getTrustLevelLabel(trustLevel: TrustLevel): string {
  switch (trustLevel) {
    case TrustLevel.COMMUNITY_CONFIRMED:
      return 'Community confirmed';
    case TrustLevel.UMMAH_FLOW_VERIFIED:
      return 'Verified';
    case TrustLevel.SELF_DECLARED:
    default:
      return '';
  }
}


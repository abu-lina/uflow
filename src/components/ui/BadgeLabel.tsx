'use client';

import { TrustLevel } from '@/types/badges';
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
}: BadgeLabelProps) {
  // Get badge type and trust level
  const badgeType = badge.badge_type;
  const trustLevel = badge.trust_level;

  if (!badgeType) {
    console.warn('[BadgeLabel] Badge missing badge_type:', badge);
    return null;
  }

  // Get label text based on language
  const labelText = badgeType.labels[language] || badgeType.labels.de || badgeType.badge_key;

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
        'inline-flex flex-row items-center justify-center gap-1',
        'h-8 px-2',
        'bg-neutral-muted border border-neutral rounded-[3.7px]',
        'font-inter-tight text-base font-medium text-content-heading',
        'whitespace-nowrap',
        className
      )}
      role="status"
    >
      <span className="truncate">{labelText}</span>
      {shouldShowIcon && (
        <TrustLevelIcon
          aria-hidden="true"
          className="w-6 h-6 shrink-0"
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


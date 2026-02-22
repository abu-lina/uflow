'use client';

import React from 'react';
import { BadgeLabel } from '@/components/ui/BadgeLabel';
import { useLanguage } from '@/providers/LanguageProvider';
import type { BadgeWithConfirmationStatus, ProviderBadgeWithType } from '@/types/badges';
import { TrustLevel } from '@/types/badges';

interface TrustBadgesSectionProps {
  badges: (BadgeWithConfirmationStatus | ProviderBadgeWithType)[];
  isLoading: boolean;
  /** Optional: render endorsement controls per badge */
  renderEndorsement?: (badge: BadgeWithConfirmationStatus | ProviderBadgeWithType) => React.ReactNode;
}

/**
 * TrustBadgesSection
 *
 * Displays trust & verification badges on a provider detail page.
 * Shows badges grouped by trust level with aggregate confirmation counts.
 * Never exposes individual confirmer identities (privacy: F1 gate).
 *
 * Empty state: section is not rendered when no badges exist.
 * Loading state: skeleton placeholder is shown.
 */
export function TrustBadgesSection({
  badges,
  isLoading,
  renderEndorsement,
}: TrustBadgesSectionProps) {
  const { language } = useLanguage();

  // Loading state
  if (isLoading) {
    return (
      <div
        className="rounded-2xl bg-white p-4 shadow-sm lg:p-6"
        data-testid="trust-badges-loading"
      >
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-48 rounded bg-gray-200" />
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-20 rounded bg-gray-200" />
            <div className="h-8 w-24 rounded bg-gray-200" />
            <div className="h-8 w-20 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  // Empty state: don't render section
  if (!badges || badges.length === 0) {
    return null;
  }

  // Sort badges: UMMAH_FLOW_VERIFIED first, then COMMUNITY_CONFIRMED, then SELF_DECLARED
  const trustOrder: Record<string, number> = {
    [TrustLevel.UMMAH_FLOW_VERIFIED]: 0,
    [TrustLevel.COMMUNITY_CONFIRMED]: 1,
    [TrustLevel.SELF_DECLARED]: 2,
  };

  const sortedBadges = [...badges].sort(
    (a, b) => (trustOrder[a.trust_level] ?? 3) - (trustOrder[b.trust_level] ?? 3)
  );

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm lg:p-6">
      <h3 className="font-inter-tight text-lg font-semibold text-content-heading lg:text-2xl">
        {language === 'en' ? 'Trust & Verification' : 'Vertrauen & Verifizierung'}
      </h3>

      <div className="mt-3 space-y-3 lg:mt-4">
        {sortedBadges.map((badge) => (
          <div
            key={badge.id}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <BadgeLabel
                badge={badge}
                language={language === 'de' ? 'de' : 'en'}
                size="md"
              />
              {/* Aggregate confirmation count — privacy safe (no user identities) */}
              {badge.confirmation_count > 0 && (
                <span className="text-sm text-gray-500">
                  {badge.confirmation_count}{' '}
                  {badge.confirmation_count === 1
                    ? (language === 'en' ? 'confirmation' : 'Bestätigung')
                    : (language === 'en' ? 'confirmations' : 'Bestätigungen')}
                </span>
              )}
            </div>
            {renderEndorsement && renderEndorsement(badge)}
          </div>
        ))}
      </div>
    </div>
  );
}

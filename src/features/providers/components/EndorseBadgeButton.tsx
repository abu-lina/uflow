'use client';

import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/providers/LanguageProvider';
import { confirmBadge, revokeConfirmation } from '@/services/badges';
import type { BadgeWithConfirmationStatus } from '@/types/badges';
import { cn } from '@/lib/utils';

interface EndorseBadgeButtonProps {
  badge: BadgeWithConfirmationStatus;
  /** Current user ID — null if unauthenticated */
  userId: string | null;
  /** Called after a successful confirm/revoke so parent can refresh badge data */
  onEndorsementChange: () => void;
  /** Called when unauthenticated user tries to endorse */
  onLoginRequired?: () => void;
  className?: string;
}

/**
 * EndorseBadgeButton
 *
 * Allows authenticated users to confirm (endorse) or revoke endorsement of a badge.
 * For unauthenticated users, clicking the button triggers the login flow.
 *
 * Privacy: Never exposes other confirmer identities (F1 gate).
 * Only shows "you confirmed this" for the current user via `user_has_confirmed`.
 */
export function EndorseBadgeButton({
  badge,
  userId,
  onEndorsementChange,
  onLoginRequired,
  className,
}: EndorseBadgeButtonProps) {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const isConfirmed = badge.user_has_confirmed;

  const handleClick = useCallback(async () => {
    if (!userId) {
      onLoginRequired?.();
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    try {
      if (isConfirmed) {
        await revokeConfirmation(badge.id, userId);
      } else {
        await confirmBadge(badge.id, userId);
      }
      onEndorsementChange();
    } catch (error) {
      console.error('Error toggling badge endorsement:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isLoading, isConfirmed, badge.id, onEndorsementChange, onLoginRequired]);

  const buttonLabel = isConfirmed
    ? language === 'en'
      ? 'Confirmed'
      : 'Bestätigt'
    : language === 'en'
      ? 'Confirm'
      : 'Bestätigen';

  const ariaLabel = isConfirmed
    ? language === 'en'
      ? `Revoke confirmation for ${badge.badge_type?.labels?.en || badge.badge_type?.labels?.de || ''}`
      : `Bestätigung widerrufen für ${badge.badge_type?.labels?.de || badge.badge_type?.labels?.en || ''}`
    : language === 'en'
      ? `Confirm ${badge.badge_type?.labels?.en || badge.badge_type?.labels?.de || ''}`
      : `${badge.badge_type?.labels?.de || badge.badge_type?.labels?.en || ''} bestätigen`;

  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        isConfirmed
          ? 'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
          : 'border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200',
        isLoading && 'cursor-not-allowed opacity-50',
        className,
      )}
      disabled={isLoading}
      onClick={() => void handleClick()}
    >
      {isLoading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <>
          {isConfirmed && (
            <svg
              className="mr-1.5 h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {buttonLabel}
        </>
      )}
    </button>
  );
}

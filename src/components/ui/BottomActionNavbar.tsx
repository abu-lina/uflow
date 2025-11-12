'use client';

import React from 'react';
import { Button } from './Button';
import { IconButton } from './IconButton';

/**
 * Bottom action navbar component for action buttons
 * 
 * Features:
 * - Fixed position at bottom with proper safe area handling
 * - Support for single primary button or primary + secondary button layout
 * - Consistent styling with backdrop blur and proper z-index
 * - Loading states and icon support
 * - Customizable height (h-12 or h-16)
 */

interface BottomActionNavbarProps {
  primaryButton: {
    label: string;
    icon?: React.ReactNode | string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    loadingText?: string;
    variant?: 'primary' | 'success';
    'aria-label'?: string;
  };
  secondaryButton?: {
    icon: React.ReactNode | string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    'aria-label': string;
  };
  className?: string;
  height?: 'h-12' | 'h-16';
}

export function BottomActionNavbar({
  primaryButton,
  secondaryButton,
  className = '',
  height = 'h-12',
}: BottomActionNavbarProps) {
  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 w-full bg-white/10 backdrop-blur-3xl border-t border-white/20 ${className}`}>
      <div className={`flex ${height} w-full max-w-[400px] mx-auto items-center px-6 pb-safe`}>
        {secondaryButton ? (
          /* Two Button Layout */
          <div className="flex w-full gap-3.5">
            <Button
              fullWidth
              aria-label={primaryButton['aria-label']}
              className="flex-1"
              disabled={primaryButton.disabled}
              icon={primaryButton.icon}
              loading={primaryButton.loading}
              loadingText={primaryButton.loadingText}
              variant={primaryButton.variant || 'primary'}
              onClick={primaryButton.onClick}
            >
              {primaryButton.label}
            </Button>

            <IconButton
              aria-label={secondaryButton['aria-label']}
              disabled={secondaryButton.disabled}
              icon={secondaryButton.icon}
              loading={secondaryButton.loading}
              size="lg"
              variant="secondary"
              onClick={secondaryButton.onClick}
            />
          </div>
        ) : (
          /* Single Button Layout */
          <Button
            fullWidth
            aria-label={primaryButton['aria-label']}
            disabled={primaryButton.disabled}
            icon={primaryButton.icon}
            loading={primaryButton.loading}
            loadingText={primaryButton.loadingText}
            variant={primaryButton.variant || 'primary'}
            onClick={primaryButton.onClick}
          >
            {primaryButton.label}
          </Button>
        )}
      </div>
    </nav>
  );
}

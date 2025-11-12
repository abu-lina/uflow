'use client';

import React from 'react';
import { Icon } from '@iconify/react';

import { Button } from './Button';
import { IconButton } from './IconButton';
import { cn } from '@/lib/utils';

/**
 * Reusable Footer Action Component
 * 
 * Two variants:
 * 1. Single action button (48px height)
 * 2. Two buttons: one action button + one secondary action button (48px x 48px)
 * 
 * Features:
 * - Fixed position at bottom with proper safe area handling
 * - Consistent styling with backdrop blur
 * - Loading states and icon support
 * - Proper spacing and responsive design
 */

interface FooterActionButton {
  label: string;
  icon?: React.ReactNode | string; // Leading icon (before text)
  trailingIcon?: React.ReactNode | string; // Trailing icon (after text)
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'success' | 'danger';
  'aria-label'?: string;
}

interface FooterSecondaryButton {
  icon: React.ReactNode | string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  'aria-label': string;
}

interface FooterActionProps {
  /**
   * Variant 1: Single action button
   */
  actionButton?: FooterActionButton;
  
  /**
   * Variant 2: Primary action button + secondary action button
   */
  primaryButton?: FooterActionButton;
  secondaryButton?: FooterSecondaryButton;
  
  /**
   * Custom className for the footer container
   */
  className?: string;
  
  /**
   * Custom className for the content wrapper
   */
  contentClassName?: string;
}

/**
 * FooterAction Component
 * 
 * @example
 * ```tsx
 * // Variant 1: Single button
 * <FooterAction
 *   actionButton={{
 *     label: 'Save',
 *     onClick: handleSave,
 *     variant: 'primary',
 *   }}
 * />
 * 
 * // Variant 2: Two buttons
 * <FooterAction
 *   primaryButton={{
 *     label: 'Edit',
 *     icon: 'material-symbols:edit',
 *     onClick: handleEdit,
 *   }}
 *   secondaryButton={{
 *     icon: 'material-symbols:more-horiz',
 *     onClick: handleMore,
 *     'aria-label': 'More actions',
 *   }}
 * />
 * ```
 */
export function FooterAction({
  actionButton,
  primaryButton,
  secondaryButton,
  className = '',
  contentClassName = '',
}: FooterActionProps) {
  // Validate props: must have either actionButton OR (primaryButton + secondaryButton)
  if (!actionButton && (!primaryButton || !secondaryButton)) {
    console.warn('FooterAction: Must provide either actionButton or both primaryButton and secondaryButton');
    return null;
  }

  // Render icon helper - supports both ReactNode and Iconify string
  const renderIcon = (icon: React.ReactNode | string | undefined) => {
    if (!icon) return null;
    
    if (typeof icon === 'string') {
      return <Icon aria-hidden="true" className="h-6 w-6" icon={icon} />;
    }
    
    return icon;
  };

  // Variant 1: Single action button (48px height)
  if (actionButton) {
    // If trailing icon is provided, render button with custom layout
    if (actionButton.trailingIcon) {
      return (
        <footer
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50 w-full border-t border-gray-200/30',
            className
          )}
          style={{
            // Solid opaque background - matches page gradient exactly (SSOT: MobileFooterBar)
            background: 'linear-gradient(to bottom, rgb(245, 245, 245) 0%, rgb(251, 251, 251) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04), 0 -1px 2px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div className={cn('flex w-full px-6 pt-4', contentClassName)} style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <Button
              fullWidth
              aria-label={actionButton['aria-label'] || actionButton.label}
              className="!h-[48px] !min-h-[48px] !max-h-[48px]"
              disabled={actionButton.disabled}
              icon={actionButton.icon}
              loading={actionButton.loading}
              loadingText={actionButton.loadingText}
              size="default"
              variant={actionButton.variant || 'primary'}
              onClick={actionButton.onClick}
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                {actionButton.label}
                {!actionButton.loading && renderIcon(actionButton.trailingIcon)}
              </span>
            </Button>
          </div>
        </footer>
      );
    }
    
    // Default: leading icon or no icon
    return (
      <footer
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 w-full bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb] backdrop-blur-[20px] border-t border-gray-200/30',
          className
        )}
        style={{
          background: 'linear-gradient(to bottom, #f5f5f5 0%, #fbfbfb 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04), 0 -1px 2px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className={cn('flex w-full px-6 pt-4', contentClassName)} style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <Button
            fullWidth
            aria-label={actionButton['aria-label'] || actionButton.label}
            className="!h-[48px] !min-h-[48px] !max-h-[48px]"
            disabled={actionButton.disabled}
            icon={actionButton.icon}
            loading={actionButton.loading}
            loadingText={actionButton.loadingText}
            size="default"
            variant={actionButton.variant || 'primary'}
            onClick={actionButton.onClick}
          >
            {actionButton.label}
          </Button>
        </div>
      </footer>
    );
  }

  // Variant 2: Two buttons - primary action button + secondary action button (48px x 48px)
  if (primaryButton && secondaryButton) {
    return (
      <footer
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 w-full bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb] backdrop-blur-[20px] border-t border-gray-200/30',
          className
        )}
        style={{
          background: 'linear-gradient(to bottom, #f5f5f5 0%, #fbfbfb 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04), 0 -1px 2px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className={cn('flex w-full gap-3.5 px-6 pt-4', contentClassName)} style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          {/* Primary Action Button - Full width (flex-1), 48px height */}
          <Button
            aria-label={primaryButton['aria-label'] || primaryButton.label}
            className="flex-1 !h-[48px] !min-h-[48px] !max-h-[48px]"
            disabled={primaryButton.disabled}
            icon={primaryButton.icon}
            loading={primaryButton.loading}
            loadingText={primaryButton.loadingText}
            size="default"
            variant={primaryButton.variant || 'primary'}
            onClick={primaryButton.onClick}
          >
            {primaryButton.label}
          </Button>

          {/* Secondary Action Button - 48px x 48px (1:1 ratio) */}
          <IconButton
            aria-label={secondaryButton['aria-label']}
            className="!h-[48px] !w-[48px] !min-h-[48px] !min-w-[48px] !max-h-[48px] !max-w-[48px] flex-shrink-0"
            disabled={secondaryButton.disabled}
            icon={renderIcon(secondaryButton.icon)}
            loading={secondaryButton.loading}
            size="lg"
            variant="secondary"
            onClick={secondaryButton.onClick}
          />
        </div>
      </footer>
    );
  }

  return null;
}


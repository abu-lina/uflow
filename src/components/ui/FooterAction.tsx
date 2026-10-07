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
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
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
   * #548: optional row rendered above the button row inside the same bar —
   * one border, one shadow, one backdrop-filter. EditSubPageLayout passes
   * its reviewFooter (approve/reject pair) here instead of stacking a
   * second fixed bar. Height is content-driven; layouts that use it must
   * reserve space (h-bottom-spacing-subpage-review).
   */
  topRow?: React.ReactNode;

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
// #562: mounted topRow publishers, element -> last measured height. The
// property lives on documentElement, so it has no owner: an unconditional
// removeProperty on unmount would delete a value a still-mounted consumer
// depends on. On unmount a consumer removes only its own entry; survivors
// keep the property, republished at the most recently measured height.
const footerHeightPublishers = new Map<Element, number>();

export function FooterAction({
  actionButton,
  primaryButton,
  secondaryButton,
  topRow,
  className = '',
  contentClassName = '',
}: FooterActionProps) {
  const footerRef = React.useRef<HTMLElement | null>(null);
  const hasTopRow = topRow != null;

  // #562: with a topRow the bar's height is variable. The review slot is
  // free-form: its pending state is a fixed 48px approve/reject pair, but
  // the loadFailed/decidedNotice paragraphs wrap past that (QA measured 3
  // lines = 56px in de, a 149px bar against the 140px token), so a fixed
  // spacer under-reserves and content slides under the bar. Publish the
  // measured height the way Header publishes --desktop-header-height; the
  // subpage-review spacer token derives from it with a 140px fallback for
  // pre-measure and no-JS.
  React.useEffect(() => {
    const el = footerRef.current;
    if (!hasTopRow || !el || typeof ResizeObserver === 'undefined') return;
    const publish = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      if (height > 0) {
        // delete+set keeps insertion order equal to publish recency, so
        // the map's last value is the most recently measured survivor.
        footerHeightPublishers.delete(el);
        footerHeightPublishers.set(el, height);
        document.documentElement.style.setProperty('--footer-action-height', `${height}px`);
      }
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      footerHeightPublishers.delete(el);
      // Iteration order is publish recency (delete+set on write), so the
      // last value seen here is the most recently measured survivor.
      let lastSurvivor = 0;
      footerHeightPublishers.forEach((height) => {
        lastSurvivor = height;
      });
      if (lastSurvivor === 0) {
        document.documentElement.style.removeProperty('--footer-action-height');
      } else {
        document.documentElement.style.setProperty('--footer-action-height', `${lastSurvivor}px`);
      }
    };
  }, [hasTopRow]);

  // Validate props: must have either actionButton OR (primaryButton + secondaryButton)
  if (!actionButton && (!primaryButton || !secondaryButton)) {
    console.warn(
      'FooterAction: Must provide either actionButton or both primaryButton and secondaryButton',
    );
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
          ref={footerRef}
          className={cn(
            'fixed bottom-0 left-0 right-0 z-[60] w-full border-t border-border/30',
            className,
          )}
          style={{
            // Solid opaque background - matches page gradient exactly (SSOT: MobileFooterBar)
            background:
              'linear-gradient(to bottom, rgb(245, 245, 245) 0%, rgb(251, 251, 251) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04), 0 -1px 2px rgba(0, 0, 0, 0.06)',
            pointerEvents: 'auto',
          }}
        >
          <div
            className={cn(
              'flex w-full flex-col gap-3 px-6 pt-4 sm:mx-auto sm:max-w-2xl',
              contentClassName,
            )}
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            {topRow}
            <Button
              fullWidth
              aria-label={actionButton['aria-label'] || actionButton.label}
              className="pointer-events-auto relative z-[60] !h-[48px] !max-h-[48px] !min-h-[48px]"
              disabled={actionButton.disabled}
              icon={actionButton.icon}
              id={`footer-action-button-${actionButton.label.replace(/\s+/g, '-').toLowerCase()}`}
              loading={actionButton.loading}
              loadingText={actionButton.loadingText}
              size="default"
              trailingIcon={actionButton.trailingIcon}
              variant={actionButton.variant || 'primary'}
              onClick={actionButton.onClick}
            >
              {actionButton.label}
            </Button>
          </div>
        </footer>
      );
    }

    // Default: leading icon or no icon
    return (
      <footer
        ref={footerRef}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 w-full border-t border-border/30 bg-gradient-to-b from-neutral-50 to-neutral-50 backdrop-blur-[20px]',
          className,
        )}
        style={{
          background: 'linear-gradient(to bottom, #f5f5f5 0%, #fbfbfb 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04), 0 -1px 2px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          className={cn(
            'flex w-full flex-col gap-3 px-6 pt-4 sm:mx-auto sm:max-w-2xl',
            contentClassName,
          )}
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          {topRow}
          <Button
            fullWidth
            aria-label={actionButton['aria-label'] || actionButton.label}
            className="pointer-events-auto relative z-[60] !h-[48px] !max-h-[48px] !min-h-[48px]"
            disabled={actionButton.disabled}
            icon={actionButton.icon}
            id={`footer-action-button-${actionButton.label.replace(/\s+/g, '-').toLowerCase()}`}
            loading={actionButton.loading}
            loadingText={actionButton.loadingText}
            size="default"
            trailingIcon={actionButton.trailingIcon}
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
        ref={footerRef}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 w-full border-t border-border/30 bg-gradient-to-b from-neutral-50 to-neutral-50 backdrop-blur-[20px]',
          className,
        )}
        style={{
          background: 'linear-gradient(to bottom, #f5f5f5 0%, #fbfbfb 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04), 0 -1px 2px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          className={cn(
            'flex w-full flex-col gap-3 px-6 pt-4 sm:mx-auto sm:max-w-2xl',
            contentClassName,
          )}
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          {/* #548: optional row above the action row (review approve/reject),
              inside the same bar — one border, one shadow, one blur. */}
          {topRow}
          <div className="flex w-full gap-3.5">
            {/* Primary Action Button - Full width (flex-1), 48px height */}
            <Button
              aria-label={primaryButton['aria-label'] || primaryButton.label}
              className="!h-[48px] !max-h-[48px] !min-h-[48px] flex-1"
              disabled={primaryButton.disabled}
              icon={primaryButton.icon}
              loading={primaryButton.loading}
              loadingText={primaryButton.loadingText}
              size="default"
              trailingIcon={primaryButton.trailingIcon}
              variant={primaryButton.variant || 'primary'}
              onClick={primaryButton.onClick}
            >
              {primaryButton.label}
            </Button>

            {/* Secondary Action Button - 48px x 48px (1:1 ratio) */}
            <IconButton
              aria-label={secondaryButton['aria-label']}
              className="!h-[48px] !max-h-[48px] !min-h-[48px] !w-[48px] !min-w-[48px] !max-w-[48px] flex-shrink-0"
              disabled={secondaryButton.disabled}
              icon={renderIcon(secondaryButton.icon)}
              loading={secondaryButton.loading}
              size="lg"
              variant="secondary"
              onClick={secondaryButton.onClick}
            />
          </div>
        </div>
      </footer>
    );
  }

  return null;
}

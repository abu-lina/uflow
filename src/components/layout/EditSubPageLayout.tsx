'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { FooterAction, FOOTER_ACTION_HEIGHT_PX } from '@/components/ui/FooterAction';

interface EditSubPageLayoutProps {
  /** Page title shown in the mobile PageHeader */
  title: string;
  /** Page content (rendered inside the max-width wrapper) */
  children: ReactNode;
  /** Primary (save) button config. Omit to hide the footer entirely. */
  primaryButton?: {
    label: string;
    icon?: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    'aria-label'?: string;
  };
  /** Override the default back/close secondary button */
  secondaryButton?: {
    icon: string;
    onClick: () => void;
    'aria-label': string;
  };
  /**
   * #548: optional review action row (approve/reject), rendered in a sticky
   * bar directly above the FooterAction. Additive and inert for sub-pages
   * that do not pass it.
   */
  reviewFooter?: ReactNode;
}

/**
 * Shared layout for all provider-edit sub-pages.
 *
 * Provides:
 * - Mobile: PageHeader with back chevron + HeaderSpacer (hidden on md+)
 * - Desktop: top padding below the global Header
 * - Scrollable main area with sm:max-w-2xl centered content
 * - FooterAction with primary + secondary buttons (max-width constrained)
 */
export function EditSubPageLayout({
  title,
  children,
  primaryButton,
  secondaryButton,
  reviewFooter,
}: EditSubPageLayoutProps) {
  const router = useRouter();

  const secondary = secondaryButton ?? {
    icon: 'material-symbols:close',
    onClick: () => router.back(),
    'aria-label': 'Close',
  };

  return (
    <div className="h-screen-fix flex flex-col">
      <div className="md:hidden">
        <PageHeader title={title} variant="back-and-title" onBack={() => router.back()} />
        <HeaderSpacer />
      </div>
      <main className="flex flex-1 flex-col overflow-y-auto px-6 pb-4 md:pt-[calc(var(--desktop-header-height,153px)+16px)]">
        <div className="w-full sm:mx-auto sm:max-w-2xl">{children}</div>
      </main>
      {reviewFooter && primaryButton && (
        // Anchor exactly on top of FooterAction: its occupied height is
        // exported by the component itself, plus the device safe-area
        // inset it pads for. bg-uflow-light + shadow-footer-bar are the
        // same tokens the footer bar uses.
        <div
          className="fixed inset-x-0 z-50 border-t border-border/30 bg-uflow-light shadow-footer-bar"
          style={{
            bottom: `calc(${FOOTER_ACTION_HEIGHT_PX}px + env(safe-area-inset-bottom))`,
          }}
        >
          <div className="w-full px-6 py-2 sm:mx-auto sm:max-w-2xl">{reviewFooter}</div>
        </div>
      )}
      {primaryButton && <FooterAction primaryButton={primaryButton} secondaryButton={secondary} />}
    </div>
  );
}

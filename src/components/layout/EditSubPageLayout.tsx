'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { BottomSpacer } from '@/components/layout/BottomSpacer';
import { FooterAction } from '@/components/ui/FooterAction';
import { useLanguage } from '@/providers/LanguageProvider';

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
    variant?: 'primary' | 'secondary' | 'success' | 'danger';
    'aria-label'?: string;
  };
  /** Override the default back/close secondary button */
  secondaryButton?: {
    icon: string;
    onClick: () => void;
    'aria-label': string;
  };
  /**
   * #548: optional review action row (approve/reject). Rendered as a second
   * row inside the single FooterAction bar — one border, one shadow, one
   * backdrop-filter — instead of a second stacked fixed bar. Additive and
   * inert for sub-pages that do not pass it.
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
  const { t } = useLanguage();

  const secondary = secondaryButton ?? {
    icon: 'material-symbols:close',
    onClick: () => router.back(),
    // #548: localized — the default was hardcoded 'Close' on every locale.
    'aria-label': t('common.close'),
  };

  // With a review row the footer is ~140px + safe-area tall instead of 80px,
  // so the scroll area must reserve that much more space — otherwise the
  // last content slides under the fixed bar (design review finding 13,
  // worsened variant). h-bottom-spacing-subpage-review encodes the height.
  const showReviewFooter = Boolean(reviewFooter && primaryButton);

  return (
    <div className="h-screen-fix flex flex-col">
      <div className="md:hidden">
        <PageHeader title={title} variant="back-and-title" onBack={() => router.back()} />
        <HeaderSpacer />
      </div>
      <main className="flex flex-1 flex-col overflow-y-auto px-6 pb-4 md:pt-[calc(var(--desktop-header-height,153px)+16px)]">
        <div className="w-full sm:mx-auto sm:max-w-2xl">{children}</div>
        {showReviewFooter && <BottomSpacer height="subpage-review" />}
      </main>
      {primaryButton && (
        <FooterAction
          primaryButton={primaryButton}
          secondaryButton={secondary}
          topRow={reviewFooter}
        />
      )}
    </div>
  );
}

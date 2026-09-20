'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { FooterAction } from '@/components/ui/FooterAction';

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
      <main className="flex flex-1 flex-col px-6 pb-4 overflow-y-auto md:pt-[calc(var(--desktop-header-height,153px)+16px)]">
        <div className="w-full sm:mx-auto sm:max-w-2xl">
          {children}
        </div>
      </main>
      {primaryButton && (
        <FooterAction
          primaryButton={primaryButton}
          secondaryButton={secondary}
        />
      )}
    </div>
  );
}

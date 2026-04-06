'use client';

import { useRouter } from 'next/navigation';
import { FooterAction } from '@/components/ui/FooterAction';
import { Icon } from '@iconify/react';
import { useLanguage } from '@/providers/LanguageProvider';

interface AdminCommunityServiceDetailButtonsProps {
  communityServiceId: string;
  /** Use 'mobile' for fixed-bottom FooterAction, 'desktop' for inline button */
  variant: 'mobile' | 'desktop';
}

/**
 * Admin edit button for community service detail views.
 * Navigates to /dashboard/community-services/${communityServiceId}/edit.
 *
 * Plan 083 — M4. Mirrors AdminProviderDetailButtons for community services.
 * Only rendered when the current user is admin (responsibility of the caller).
 */
export function AdminCommunityServiceDetailButtons({
  communityServiceId,
  variant,
}: AdminCommunityServiceDetailButtonsProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const handleEdit = () => {
    router.push(`/dashboard/community-services/${communityServiceId}/edit`);
  };

  if (variant === 'mobile') {
    return (
      <FooterAction
        actionButton={{
          label: t('editProvider.title'),
          icon: 'material-symbols:edit-outline',
          onClick: handleEdit,
          variant: 'primary',
          'aria-label': t('editProvider.title'),
        }}
      />
    );
  }

  return (
    <button
      aria-label={t('editProvider.title')}
      className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-white transition-colors hover:bg-primary-dark active:bg-primary-darker"
      type="button"
      onClick={handleEdit}
    >
      <Icon aria-hidden className="size-5" icon="material-symbols:edit-outline" />
      <span className="font-inter-tight text-sm font-medium">{t('editProvider.title')}</span>
    </button>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/providers/LanguageProvider';
import { FooterAction } from '@/components/ui/FooterAction';
import { Icon } from '@iconify/react';

interface AdminProviderDetailButtonsProps {
  providerId: string;
  /** Use 'mobile' for fixed-bottom FooterAction, 'desktop' for inline button */
  variant: 'mobile' | 'desktop';
}

export function AdminProviderDetailButtons({ providerId, variant }: AdminProviderDetailButtonsProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const handleEdit = () => {
    router.push(`/dashboard/providers/${providerId}/edit`);
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

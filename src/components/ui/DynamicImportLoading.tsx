'use client';

import { useLanguage } from '@/providers/LanguageProvider';

interface DynamicImportLoadingProps {
  className?: string;
}

export function DynamicImportLoading({ className = '' }: DynamicImportLoadingProps) {
  const { t } = useLanguage();
  
  return (
    <div 
      className={`flex items-center justify-center p-8 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={t('common.loading')}
    >
      <div className="text-sm text-content">{t('common.loading')}</div>
    </div>
  );
}

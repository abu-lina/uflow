'use client';

import { useLanguage } from '@/providers/LanguageProvider';
import { Button } from './Button';

interface DynamicImportErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function DynamicImportError({ onRetry, className = '' }: DynamicImportErrorProps) {
  const { t } = useLanguage();
  
  return (
    <div 
      className={`flex flex-col items-center justify-center gap-4 p-8 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <p className="text-sm text-danger">{t('common.error')}</p>
      {onRetry && (
        <Button variant="primary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

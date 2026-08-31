'use client';

import { List, Map as MapIcon } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import type { ViewMode } from '@/features/search/hooks/useMapDiscovery';

interface ViewToggleButtonProps {
  viewMode: ViewMode;
  onToggle: () => void;
}

/**
 * Floating map/list toggle button shared by both discovery surfaces.
 * Positioned above the mobile navbar.
 */
export function ViewToggleButton({ viewMode, onToggle }: ViewToggleButtonProps) {
  const { t } = useLanguage();

  return (
    <button
      aria-label={viewMode === 'map' ? t('map.switchToList') : t('map.switchToMap')}
      className="fixed left-1/2 z-[500] -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-inter-tight text-sm font-semibold text-content-heading shadow-lg transition-colors hover:bg-neutral-50"
      style={{ bottom: 'calc(64px + 1rem + max(12px, env(safe-area-inset-bottom)))' }}
      type="button"
      onClick={onToggle}
    >
      {viewMode === 'map' ? (
        <><List aria-hidden="true" className="h-4 w-4" /><span>{t('map.listViewLabel')}</span></>
      ) : (
        <><MapIcon aria-hidden="true" className="h-4 w-4" /><span>{t('map.mapViewLabel')}</span></>
      )}
    </button>
  );
}

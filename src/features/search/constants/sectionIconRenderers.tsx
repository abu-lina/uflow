import type { ReactNode } from 'react';
import { Hamburger, Store } from 'lucide-react';

import { HomeIcon } from '@/components/ui/icons/HomeIcon';
import type { Section } from '@/providers/search-provider';

/** Shared section icon renderers used by section-aware discovery UI. */
export const SECTION_ICON_RENDERERS: Record<Section, (isActive: boolean) => ReactNode> = {
  food: () => <Hamburger aria-hidden="true" className="h-4 w-4 shrink-0" />,
  ummah: (isActive) => (
    <HomeIcon
      className="h-4 w-4 shrink-0"
      isActive={isActive}
      size={16}
      viewBox="12 12 24 24"
    />
  ),
  business: () => <Store aria-hidden="true" className="h-4 w-4 shrink-0" />,
};

export const SECTION_ORDER: Section[] = ['food', 'ummah', 'business'];

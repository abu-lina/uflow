'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getFeatureFlag } from '@/config/feature-flags';
import { HomeIcon } from '@/components/ui/icons/HomeIcon';
import { CreateIcon } from '@/components/ui/icons/CreateIcon';
import { cn } from '@/lib/utils';

/**
 * City Early Access Navigation Bar
 * 
 * Bottom navigation bar with Home and Create items.
 * Home is active when on the city early access page.
 * 
 * Design:
 * - 80px height
 * - Backdrop blur
 * - Safe area handling
 * - Home: Active state with primary color and bottom border (2.4px)
 * - Create: Inactive state with muted color
 */
export function CityEarlyAccessNavbar() {
  const pathname = usePathname();
  const [isAppLaunched, setIsAppLaunched] = useState(false);

  // Check feature flag client-side
  useEffect(() => {
    setIsAppLaunched(getFeatureFlag('isAppLaunched'));
  }, []);

  // Determine active states
  // Home is active when:
  // - On / (root) - the home page after onboarding (shows city content)
  // - On /city/* (Stage 1) - direct city access
  // - On /providers (Stage 2) - when not app launched (early access)
  const isHomeActive = 
    pathname === '/' || 
    pathname.startsWith('/city/') || 
    (pathname === '/providers' && !isAppLaunched);
  
  const isCreateActive = pathname === '/create';

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'flex w-full items-center justify-between',
        'h-20 px-6',
        'pb-safe-bottom',
        'backdrop-blur-[12px]',
        'border-t border-gray-200/30'
      )}
      role="navigation"
      style={{
        background: 'linear-gradient(to bottom, rgba(245, 245, 245, 0.9) 0%, rgba(251, 251, 251, 0.9) 100%)',
      }}
    >
      <div className="mx-auto flex w-full max-w-[393px] flex-row items-center justify-between gap-8">
        {/* Home */}
        <Link
          aria-label="Home"
          className={cn(
            'flex flex-1 flex-row items-center justify-center',
            'h-12',
            'gap-2',
            isHomeActive && 'border-b-[2.4px] border-primary'
          )}
          href="/"
          scroll={false}
        >
          <HomeIcon isActive={isHomeActive} />
          <span
            className={cn(
              'font-inter-tight text-base font-semibold leading-[19px]',
              isHomeActive ? 'text-primary' : 'text-[#777777]'
            )}
          >
            HOME
          </span>
        </Link>

        {/* Create */}
        <Link
          aria-label="Create"
          className={cn(
            'flex flex-1 flex-row items-center justify-center',
            'h-12',
            'gap-2',
            isCreateActive && 'border-b-[2.4px] border-primary'
          )}
          href="/create"
          scroll={false}
        >
          <CreateIcon isActive={isCreateActive} />
          <span
            className={cn(
              'font-inter-tight text-base font-semibold leading-[19px]',
              isCreateActive ? 'text-primary' : 'text-[#777777]'
            )}
          >
            CREATE
          </span>
        </Link>
      </div>
    </nav>
  );
}


'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getFeatureFlag } from '@/config/feature-flags';
import { ExploreIcon } from '@/components/ui/icons/ExploreIcon';
import { CreateIcon } from '@/components/ui/icons/CreateIcon';
import { SavedIcon } from '@/components/ui/icons/SavedIcon';
import { ProfileIcon } from '@/components/ui/icons/ProfileIcon';
import { useAppStage } from '@/hooks/useAppStage';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';

/**
 * City Early Access Navigation Bar
 * 
 * Bottom navigation bar with Home, Create, and Saved (Bookmark) items.
 * - Stage 1: Home, Create, Profile
 * - Stage 2: Home, Create, Saved (Bookmark), Profile
 * 
 * Design (matches MobileFooterBar pattern):
 * - Dynamic height with pt-footer-safe and pb-safe
 * - Solid opaque background gradient (no transparency)
 * - Backdrop blur (20px)
 * - Box shadow for depth
 * - Safe area handling
 * - Max width: 400px
 * - Active state with primary color and bottom border (2.4px)
 * - Inactive state with muted color
 */
export function CityEarlyAccessNavbar() {
  const pathname = usePathname();
  const [isAppLaunched, setIsAppLaunched] = useState(false);
  const { stage } = useAppStage();
  const { user } = useAuth();

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
  
  const isCreateActive = pathname === '/create' || pathname.startsWith('/create/recommend');
  
  const isSavedActive = pathname === '/saved';

  // Profile is active on /profile, /login, or /signup (mirrors MobileFooterBar pattern)
  const isProfileActive =
    pathname.startsWith('/profile') ||
    pathname === '/login' ||
    pathname === '/signup';

  // Show Saved menu item only for Stage 2
  const showSaved = stage === 'stage2';

  return (
    <nav
      className={cn(
        'pointer-events-auto fixed bottom-0 left-0 right-0 z-50',
        'flex w-full items-center justify-center',
        'px-6 pt-footer-safe pb-safe',
        'border-t border-gray-200/30',
        'sm:px-8'
      )}
      role="navigation"
      style={{
        // Solid opaque background - matches MobileFooterBar exactly
        background: 'linear-gradient(to bottom, rgb(245, 245, 245) 0%, rgb(251, 251, 251) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04), 0 -1px 2px rgba(0, 0, 0, 0.06)',
      }}
    >
      <div className={cn(
        'flex w-full max-w-[400px] flex-row items-center justify-between',
        showSaved ? 'gap-4' : 'gap-8'
      )}>
        {/* Home */}
        <Link
          aria-label="Home"
          className={cn(
            'flex flex-1 flex-row items-center justify-center',
            'h-12',
            isHomeActive && 'border-b-[2.4px] border-primary'
          )}
          href="/"
          scroll={false}
        >
          <ExploreIcon isActive={isHomeActive} />
        </Link>

        {/* Create */}
        <Link
          aria-label="Create"
          className={cn(
            'flex flex-1 flex-row items-center justify-center',
            'h-12',
            isCreateActive && 'border-b-[2.4px] border-primary'
          )}
          href="/create/recommend"
          scroll={false}
        >
          <CreateIcon isActive={isCreateActive} />
        </Link>

        {/* Saved (Bookmark) - Only shown in Stage 2 */}
        {showSaved && (
          <Link
            aria-label="Saved"
            className={cn(
              'flex flex-1 flex-row items-center justify-center',
              'h-12',
              isSavedActive && 'border-b-[2.4px] border-primary'
            )}
            href="/saved"
            scroll={false}
          >
            <SavedIcon isActive={isSavedActive} />
          </Link>
        )}

        {/* Profile - auth-gated: unauthenticated → /login, authenticated → /profile */}
        <Link
          aria-label="Profile"
          className={cn(
            'flex flex-1 flex-row items-center justify-center',
            'h-12',
            isProfileActive && 'border-b-[2.4px] border-primary'
          )}
          href={user ? '/profile' : '/login'}
          scroll={false}
        >
          <ProfileIcon isActive={isProfileActive} />
        </Link>
      </div>
    </nav>
  );
}


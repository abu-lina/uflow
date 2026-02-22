'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { HomeIcon } from '@/components/ui/icons/HomeIcon';
import { ExploreIcon } from '@/components/ui/icons/ExploreIcon';
import { CreateIcon } from '@/components/ui/icons/CreateIcon';
import { SavedIcon } from '@/components/ui/icons/SavedIcon';
import { ProfileIcon } from '@/components/ui/icons/ProfileIcon';
import { useAuth } from '@/providers/auth-provider';

// Height is set to 72px for modern, touch-friendly, and visually balanced mobile nav bar.
const navItems = [
  {
    label: 'Home',
    href: '/',
    icon: (isActive: boolean) => <HomeIcon isActive={isActive} />,
    noFrame: true,
  },
  {
    label: 'Explore',
    href: '/providers',
    icon: (isActive: boolean) => <ExploreIcon isActive={isActive} />,
    noFrame: true,
  },
  {
    label: 'Create',
    href: '/create',
    icon: (isActive: boolean) => <CreateIcon isActive={isActive} />,
    noFrame: true,
  },
  {
    label: 'Saved',
    href: '/saved',
    icon: (isActive: boolean) => <SavedIcon isActive={isActive} />,
    noFrame: true,
    // framed by default
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: (isActive: boolean) => <ProfileIcon isActive={isActive} />,
    noFrame: true,
  },
];

export function MobileFooterBar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Prefetch home route on mount to ensure it's available
  useEffect(() => {
    if (pathname !== '/') {
      router.prefetch('/');
    }
  }, [router, pathname]);

  // Prefetch route and likely data when user hovers/presses nav item
  const handleNavIntent = useCallback(
    (href: string) => {
      // Don't prefetch if already on page or navigating
      if (pathname === href || isNavigating) return;

      // Prefetch route (Next.js optimizes this)
      router.prefetch(href);

      // Note: Data prefetching handled by React Query when page loads
      // This just prefetches the route code
    },
    [router, pathname, isNavigating],
  );

  return (
    <>
      <nav
        ref={navRef}
        className="pt-footer-safe pb-safe fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center border-t border-gray-200/30 px-6 sm:px-8"
        style={{
          // Solid opaque background - matches page gradient exactly
          background: 'linear-gradient(to bottom, rgb(245, 245, 245) 0%, rgb(251, 251, 251) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04), 0 -1px 2px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className="flex w-full max-w-[400px] flex-row items-center justify-center gap-6">
          {navItems.map((item) => (
            <div
              key={item.href}
              className="flex flex-row items-center justify-center gap-2.5 p-1 transition-transform active:scale-[0.99]"
              style={{ width: 40, height: 40 }}
            >
              <Link
                aria-label={item.label}
                className={`flex items-center justify-center transition-opacity duration-75 ${
                  isNavigating ? 'pointer-events-none opacity-50' : 'opacity-100'
                }`}
                href={item.href === '/profile' && !user ? '/login' : item.href}
                prefetch={true}
                scroll={false}
                onClick={(e) => {
                  // Special handling for profile - redirect to login if not authenticated
                  if (item.href === '/profile' && !user) {
                    e.preventDefault();
                    setIsNavigating(true);
                    router.push('/login');
                    setTimeout(() => setIsNavigating(false), 150);
                    return;
                  }

                  // For all routes including root, let Next.js Link handle navigation naturally
                  // Track navigation state for UI feedback only
                  if (pathname !== item.href && !isNavigating) {
                    setIsNavigating(true);
                    // Next.js Link handles the actual navigation client-side
                    setTimeout(() => setIsNavigating(false), 150);
                  }
                }}
                onMouseEnter={() => handleNavIntent(item.href)}
                onTouchStart={() => handleNavIntent(item.href)}
              >
                {/* All nav items use function icons (custom SVGs) */}
                {typeof item.icon === 'function' &&
                  item.icon(
                    item.href === '/profile'
                      ? pathname.startsWith('/profile') ||
                          pathname === '/login' ||
                          pathname === '/signup'
                      : item.href === '/create'
                        ? pathname.startsWith('/create') || pathname === '/create'
                        : pathname === item.href,
                  )}
              </Link>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}

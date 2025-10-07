'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

import { HomeIcon } from '@/components/ui/icons/HomeIcon';
import { ExploreIcon } from '@/components/ui/icons/ExploreIcon';
import { CreateIcon } from '@/components/ui/icons/CreateIcon';
import { SavedIcon } from '@/components/ui/icons/SavedIcon';
import { ProfileIcon } from '@/components/ui/icons/ProfileIcon';
import { sharedTransition } from '@/components/ui/PageTransition';
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


  useEffect(() => {
    // No logging
  }, [pathname, isNavigating]);

  const handleNavigation = useCallback(
    (href: string) => async (e: React.MouseEvent) => {
      e.preventDefault();

      // Don't navigate if already on the page
      if (pathname === href) return;

      // Don't navigate if already navigating
      if (isNavigating) return;

      setIsNavigating(true);

      try {
        if (href === '/profile' && !user) {
          router.push('/login');
          return;
        }

        // For profile navigation, ensure we don't trigger unnecessary redirects
        if (href === '/profile' && user) {
          // If user is authenticated, navigate directly without additional checks
          await router.prefetch(href);
          router.push(href);
          return;
        }

        // Prefetch the next page
        await router.prefetch(href);

        // Use push instead of replace to maintain scroll position and layout
        router.push(href);
      } finally {
        setIsNavigating(false);
      }
    },
    [user, router, pathname, isNavigating],
  );

  return (
    <>
      <nav
        ref={navRef}
        className="mobile-nav-height fixed bottom-0 left-0 right-0 z-50 flex flex-col justify-end bg-white px-6 drop-shadow-[1px_-1px_1px_#EEEEEE] sm:px-8"
      >
        <div className="flex w-full max-w-[400px] flex-row items-center justify-center gap-6 py-3 pb-safe">
          {navItems.map((item) => (
            <motion.div
              key={item.href}
              className="flex flex-row items-center justify-center gap-2.5 p-1"
              style={{ width: 40, height: 40 }}
              whileTap={{ scale: 0.99 }}
            >
              <button
                aria-label={item.label}
                className={`flex items-center justify-center transition-opacity duration-75 ${
                  isNavigating ? 'opacity-50' : 'opacity-100'
                }`}
                disabled={isNavigating}
                onClick={handleNavigation(item.href)}
              >
                {typeof item.icon === 'function' ? (
                  item.icon(
                    item.href === '/profile' 
                      ? pathname.startsWith('/profile') || pathname === '/login' || pathname === '/signup'
                      : item.href === '/create'
                        ? pathname.startsWith('/create') || pathname === '/create'
                        : pathname === item.href
                  )
                ) : (
                  <motion.div
                    animate={{
                      scale: (item.href === '/profile' 
                        ? pathname.startsWith('/profile') || pathname === '/login' || pathname === '/signup'
                        : item.href === '/create'
                          ? pathname.startsWith('/create') || pathname === '/create'
                          : pathname === item.href) ? 1.01 : 1,
                      color: (item.href === '/profile' 
                        ? pathname.startsWith('/profile') || pathname === '/login' || pathname === '/signup'
                        : item.href === '/create'
                          ? pathname.startsWith('/create') || pathname === '/create'
                          : pathname === item.href) ? '#589D96' : '#555555',
                    }}
                    transition={sharedTransition}
                  >
                    <Icon
                      height={24}
                      icon={item.icon}
                      style={
                        item.noFrame
                          ? undefined
                          : {
                              background: '#FFFFFF',
                              border:
                                (item.href === '/profile' 
                                  ? pathname.startsWith('/profile') || pathname === '/login' || pathname === '/signup'
                                  : item.href === '/create'
                                    ? pathname.startsWith('/create') || pathname === '/create'
                                    : pathname === item.href)
                                  ? '1.6px solid #589D96'
                                  : '0.5px solid #777777',
                              borderRadius: 8,
                              transition: 'border-color 0.08s ease',
                            }
                      }
                      width={24}
                    />
                  </motion.div>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </nav>
    </>
  );
}

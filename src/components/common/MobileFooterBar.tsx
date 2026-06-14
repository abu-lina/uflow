'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { ExploreIcon } from '@/components/ui/icons/ExploreIcon';
import { ChatIcon } from '@/components/ui/icons/ChatIcon';
import { SavedIcon } from '@/components/ui/icons/SavedIcon';
import { ProfileIcon } from '@/components/ui/icons/ProfileIcon';
import { useAuth } from '@/providers/auth-provider';
import { ChatWidget } from '@/features/chat/components/ChatWidget';

// Height is set to 72px for modern, touch-friendly, and visually balanced mobile nav bar.
const navItems = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    icon: (isActive: boolean) => <ExploreIcon isActive={isActive} />,
    noFrame: true,
  },
  {
    id: 'chat',
    label: 'Chat',
    href: null,
    icon: (isActive: boolean) => <ChatIcon isActive={isActive} />,
    noFrame: true,
  },
  {
    id: 'saved',
    label: 'Saved',
    href: '/saved',
    icon: (isActive: boolean) => <SavedIcon isActive={isActive} />,
    noFrame: true,
  },
  {
    id: 'profile',
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
  const [isChatOpen, setIsChatOpen] = useState(false);
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

  const isExploreActive =
    pathname === '/' ||
    pathname.startsWith('/city/') ||
    pathname === '/providers' ||
    pathname === '/food' ||
    pathname === '/stores' ||
    pathname === '/ummah';

  function isNavItemActive(itemId: string): boolean {
    switch (itemId) {
      case 'home':
        return isExploreActive;
      case 'chat':
        return isChatOpen;
      case 'saved':
        return pathname === '/saved';
      case 'profile':
        return pathname.startsWith('/profile') || pathname === '/login' || pathname === '/signup';
      default:
        return false;
    }
  }

  function handleNavClick(itemId: string) {
    if (itemId === 'chat') {
      setIsChatOpen(true);
      return;
    }
  }

  return (
    <>
      {/* Chat Modal - Mobile */}
      {isChatOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-teal-600 text-white">
            <h3 className="font-semibold text-sm">UFlow Assistant</h3>
            <button
              onClick={() => setIsChatOpen(false)}
              aria-label="Chat schließen"
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-teal-700 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatWidget />
          </div>
        </div>
      )}

      <nav
        ref={navRef}
        className="pointer-events-auto pt-footer-safe pb-safe fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center border-t border-gray-200/30 px-6 sm:px-8"
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
              key={item.id}
              className="flex flex-row items-center justify-center gap-2.5 p-1 transition-transform active:scale-[0.99]"
              style={{ width: 40, height: 40 }}
            >
              {item.href ? (
                <Link
                  aria-label={item.label}
                  className={`flex items-center justify-center transition-opacity duration-75 ${
                    isNavigating ? 'pointer-events-none opacity-50' : 'opacity-100'
                  }`}
                  href={item.href === '/profile' && !user ? '/login' : item.href}
                  prefetch={true}
                  scroll={false}
                  onClick={(e) => {
                    if (item.href === '/profile' && !user) {
                      e.preventDefault();
                      setIsNavigating(true);
                      router.push('/login');
                      setTimeout(() => setIsNavigating(false), 150);
                      return;
                    }

                    if (pathname !== item.href && !isNavigating) {
                      setIsNavigating(true);
                      setTimeout(() => setIsNavigating(false), 150);
                    }
                  }}
                  onMouseEnter={() => handleNavIntent(item.href!)}
                  onTouchStart={() => handleNavIntent(item.href!)}
                >
                  {typeof item.icon === 'function' &&
                    item.icon(isNavItemActive(item.id))}
                </Link>
              ) : (
                <button
                  aria-label={item.label}
                  className="flex items-center justify-center transition-opacity duration-75"
                  onClick={() => handleNavClick(item.id)}
                  onMouseEnter={() => {}}
                  onTouchStart={() => {}}
                >
                  {typeof item.icon === 'function' &&
                    item.icon(isNavItemActive(item.id))}
                </button>
              )}
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}

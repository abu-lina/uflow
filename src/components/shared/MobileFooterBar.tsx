'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon } from '@iconify/react';

import { HomeIcon } from '@/components/ui/icons/HomeIcon';

// Height is set to 72px for modern, touch-friendly, and visually balanced mobile nav bar.
const navItems = [
  {
    label: 'Home',
    href: '/',
    icon: (isActive: boolean) => <HomeIcon isActive={isActive} />,
  },
  {
    label: 'Explore',
    href: '/souks',
    icon: 'mingcute:search-line',
    noFrame: true,
  },
  {
    label: 'Create',
    href: '/create',
    icon: 'iconamoon:sign-plus',
    noFrame: true,
  },
  {
    label: 'Saved',
    href: '/saved',
    icon: 'iconamoon:heart',
    noFrame: true,
    // framed by default
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: 'lucide:user',
    noFrame: true,
  },
];

export function MobileFooterBar() {
  const pathname = usePathname();

  return (
    <nav className="isolation-isolate fixed bottom-0 left-0 right-0 z-50 flex h-[64px] items-center bg-white px-6 pb-4 pt-0 drop-shadow-[1px_-1px_1px_#EEEEEE] sm:px-8">
      <div className="flex w-full flex-row items-end justify-center gap-6" style={{ height: 40 }}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            className="flex flex-row items-center justify-center gap-2.5 p-1"
            href={item.href}
            style={{ width: 40, height: 40 }}
          >
            {typeof item.icon === 'function' ? (
              item.icon(pathname === item.href)
            ) : (
              <Icon
                className={pathname === item.href ? 'text-[#589D96]' : 'text-[#555555]'}
                height={28}
                icon={item.icon}
                style={
                  item.noFrame
                    ? undefined
                    : {
                        background: '#FFFFFF',
                        border:
                          pathname === item.href ? '1.6px solid #589D96' : '0.5px solid #777777',
                        borderRadius: 8,
                      }
                }
                width={28}
              />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}

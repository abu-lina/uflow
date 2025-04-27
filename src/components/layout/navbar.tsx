/**
 * Navigation Bar Component
 *
 * A responsive navigation bar that displays different navigation items based on user role.
 * Includes role-based navigation for reviewers and admins.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

const authNavigation = {
  reviewer: [
    { name: 'Dashboard', href: '/review/dashboard' },
    { name: 'Review Souks', href: '/review/souks' },
  ],
  admin: [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Users', href: '/admin/users' },
  ],
  user: [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Profile', href: '/dashboard/profile' },
    { name: 'Bookmarks', href: '/dashboard/bookmarks' },
  ],
};

export function Navbar() {
  const pathname = usePathname();
  const { user } = useAuthContext();

  const getNavigationItems = () => {
    if (!user) return navigation;

    const role = user.role;
    return [...navigation, ...(authNavigation[role as keyof typeof authNavigation] || [])];
  };

  return (
    <nav className="flex h-16 items-center justify-between border-b px-4">
      <div className="flex items-center space-x-4">
        {getNavigationItems().map((item) => (
          <Link
            key={item.href}
            className={cn(
              'text-sm font-medium transition-colors hover:text-primary',
              pathname === item.href ? 'text-primary' : 'text-muted-foreground'
            )}
            href={item.href}
          >
            {item.name}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button size="sm" variant="outline">
              <Link href="/auth/logout">Sign Out</Link>
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        )}
      </div>
    </nav>
  );
}

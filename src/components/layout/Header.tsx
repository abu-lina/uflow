/**
 * MainHeader Component
 *
 * The main header of the application that contains the logo and navigation.
 * Uses a fixed position with a blur effect for better visibility.
 */

'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/layout/header';
import { useAuthContext } from '@/providers/auth-provider';

export function MainHeader() {
  const { user, loading } = useAuthContext();

  return (
    <Header className="fixed left-0 right-0 top-0 z-50 bg-white/30 backdrop-blur-md transition-all duration-200">
      <div className="border-gray-light/50 flex h-[90px] items-center justify-between border-b px-20">
        <div className="flex items-center">
          <Button asChild size="default" variant="link">
            <Link href="/">Ummah Flow</Link>
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {!loading && !user ? (
            <>
              <Button asChild size="default" variant="outline">
                <Link href="/auth/login">Anmelden</Link>
              </Button>
              <Button asChild size="default" variant="default">
                <Link href="/auth/register">Registrieren</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="default" variant="default">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          )}
        </div>
      </div>
    </Header>
  );
}

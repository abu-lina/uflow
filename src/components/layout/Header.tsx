/**
 * MainHeader Component
 * 
 * The main header of the application that contains the logo and navigation.
 * Uses a fixed position with a blur effect for better visibility.
 */

'use client';

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuthContext } from "@/providers/auth-provider"
import { Header } from "@/components/ui/layout/header"

export function MainHeader() {
  const { user, loading } = useAuthContext();

  return (
    <Header className="fixed top-0 left-0 right-0 z-50 transition-all duration-200 backdrop-blur-md bg-white/30">
      <div className="flex items-center justify-between h-[90px] px-20 border-b border-gray-light/50">
        <div className="flex items-center">
          <Button
            variant="link"
            size="default"
            asChild
          >
            <Link href="/">Ummah Flow</Link>
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {!loading && !user ? (
            <>
              <Button
                variant="outline"
                size="default"
                asChild
              >
                <Link href="/auth/login">Anmelden</Link>
              </Button>
              <Button
                variant="default"
                size="default"
                asChild
              >
                <Link href="/auth/register">Registrieren</Link>
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="default"
              asChild
            >
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          )}
        </div>
      </div>
    </Header>
  );
} 
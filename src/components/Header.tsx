'use client';

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"

export default function Header() {
  const { user, isLoading } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 transition-all duration-200 backdrop-blur-md bg-white/30">
      <nav className="flex items-center justify-between h-[90px] px-20 border-b border-gray-light/50">
        <div className="flex items-center">
          <Button
            variant="unframed"
            size="default"
            asChild
          >
            <Link href="/">Ummah Flow</Link>
          </Button>
        </div>

        <div className="flex items-center">
          {!isLoading && !user ? (
            <>
              <Button
                variant="framed"
                size="default"
                asChild
              >
                <Link href="/auth/login">Anmelden</Link>
              </Button>
              <Button
                variant="action"
                size="action"
                asChild
              >
                <Link href="/auth/register">Registrieren</Link>
              </Button>
            </>
          ) : (
            <Button
              variant="action"
              size="action"
              asChild
            >
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
} 
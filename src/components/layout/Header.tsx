'use client';

import { useState } from 'react';

import Link from 'next/link';

import { Logo } from '@/components/ui/Logo';
import { SigninModal } from '@/features/auth/components/SigninModal';
import { SignupModal } from '@/features/auth/components/SignupModal';
import { SearchBar } from '@/features/search/components/SearchBar';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const [showSigninModal, setShowSigninModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-50 w-full py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-screen-xl flex-col items-center gap-20">
          {/* NavBar */}
          <nav className="flex h-10 w-full flex-row items-center justify-between">
            {/* Left */}
            <div className="flex flex-row items-center gap-16">
              <div className="relative">
                <Logo className="size-8 text-white" />
              </div>
              <Link
                className="flex h-10 items-center rounded-xl border-none px-3.5 text-base font-medium text-text hover:bg-grey-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                href="#about"
                scroll={true}
              >
                Über Uns
              </Link>
            </div>

            {/* Search Bar */}
            <SearchBar className="!w-[640px] !shadow-none" />

            {/* Right */}
            <div className="flex flex-row items-center gap-3">
              {user ? (
                <>
                  <button
                    aria-label="Favoriten"
                    className="focus:ring-uFlowAccent flex size-10 items-center justify-center rounded-full bg-neutral-100 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                    type="button"
                  >
                    <svg
                      className="text-uFlowText size-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  </button>
                  <button
                    aria-label="Profil"
                    className="focus:ring-uFlowAccent flex size-10 items-center justify-center rounded-full bg-neutral-100 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                    type="button"
                  >
                    <svg
                      className="text-uFlowText size-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="flex h-10 items-center rounded-xl border border-grey px-3.5 text-base font-medium text-text hover:bg-grey-light"
                    onClick={() => setShowSigninModal(true)}
                  >
                    Anmelden
                  </button>
                  <button
                    className="flex h-10 items-center rounded-xl bg-mint px-3.5 text-base font-medium text-white hover:bg-mint/90"
                    onClick={() => setShowSignupModal(true)}
                  >
                    Registrieren
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {showSigninModal && <SigninModal onClose={() => setShowSigninModal(false)} />}
      {showSignupModal && <SignupModal onClose={() => setShowSignupModal(false)} />}
    </>
  );
}

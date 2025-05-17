'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { Logo } from '@/components/ui/Logo';
import { SigninModal } from '@/features/auth/components/SigninModal';
import { SignupModal } from '@/features/auth/components/SignupModal';
import { SearchBar } from '@/features/search/components/SearchBar';
import { useAuth } from '@/hooks/useAuth';
import { useSectionInView } from '@/hooks/useSectionInView';

export function Header() {
  const [showSigninModal, setShowSigninModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const { user } = useAuth();
  const aboutInView = useSectionInView('about');

  return (
    <>
      <header className="sticky top-0 z-50 w-full py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-screen-xl flex-col items-center gap-20">
          {/* NavBar */}
          <nav className="flex h-10 w-full flex-row items-center justify-between">
            {/* Left */}
            <div className="flex flex-row items-center gap-16">
              <Link aria-label="Zur Startseite" className="relative" href="/">
                <Logo className="size-8 text-white" />
              </Link>
              <Link
                className={`flex h-10 items-center rounded-xl border-none px-3.5 text-base font-medium text-content-title hover:bg-grey-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary${aboutInView ? ' underline' : ''}`}
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
                    aria-label="Profil"
                    className="focus:ring-uFlowAccent flex size-10 items-center justify-center rounded-full bg-neutral-100 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                    type="button"
                  >
                    <Image
                      alt="Profil"
                      className="rounded-full"
                      height={32}
                      src="/icons/icon-muslim.png"
                      width={32}
                    />
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="flex h-10 items-center rounded-xl border border-grey px-3.5 text-base font-medium text-content"
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

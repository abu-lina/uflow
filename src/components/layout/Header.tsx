'use client';

import { useState, useRef, useEffect } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ChevronDown } from 'lucide-react';

import { Logo } from '@/components/ui/Logo';
import { SigninModal } from '@/features/auth/components/SigninModal';
import { SignupModal } from '@/features/auth/components/SignupModal';
import { SearchBar } from '@/features/search/components/SearchBar';
import { useAuth } from '@/hooks/useAuth';
import { useSectionInView } from '@/hooks/useSectionInView';

export function Header() {
  const [showSigninModal, setShowSigninModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut, loading } = useAuth();
  const aboutInView = useSectionInView('about');
  const router = useRouter();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full py-6 backdrop-blur" style={{ isolation: 'auto' }}>
        <div className="mx-auto flex w-full max-w-screen-xl flex-col items-center gap-20">
          {/* NavBar */}
          <nav className="flex h-10 w-full flex-row items-center justify-between">
            {/* Left */}
            <div className="flex flex-row items-center gap-16">
              <Link aria-label="Zur Startseite" className="relative" href="/">
                <Logo className="size-8 text-white" />
              </Link>
              {!user && (
                <Link
                  className={`flex h-10 items-center rounded-xl border-none px-3.5 text-base font-medium text-content-title hover:bg-grey-light hover:text-[#333333] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary${aboutInView ? ' text-content-title underline' : ''}`}
                  href="#about"
                  scroll={true}
                >
                  Über Uns
                </Link>
              )}
            </div>

            {/* Search Bar */}
            <SearchBar className="!w-[640px] !shadow-none" />

            {/* Right */}
            <div className="flex flex-row items-center gap-3">
              {loading ? (
                <div className="flex h-10 w-24 animate-pulse items-center justify-center rounded-xl bg-gray-100" />
              ) : user ? (
                <div ref={dropdownRef} className="relative">
                  <button
                    aria-label="Profil Dropdown öffnen"
                    className="flex items-center gap-1 rounded-full focus:outline-none"
                    onClick={() => setDropdownOpen((open) => !open)}
                  >
                    <Image
                      alt="Profil"
                      className="rounded-full"
                      height={32}
                      src="/icons/icon-muslim.png"
                      width={32}
                    />
                    <ChevronDown
                      aria-hidden="true"
                      className={`size-6 text-content transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full z-40 mt-1 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5">
                      <button
                        className="block w-full px-4 py-2 text-left text-base hover:bg-gray-50"
                        onClick={() => {
                          setDropdownOpen(false);
                          router.push('/profile');
                        }}
                      >
                        Profil Einstellungen
                      </button>
                      <button
                        className="block w-full px-4 py-2 text-left text-base text-red-600 hover:bg-gray-50"
                        onClick={async () => {
                          setDropdownOpen(false);
                          await signOut();
                          router.push('/');
                        }}
                      >
                        Abmelden
                      </button>
                    </div>
                  )}
                </div>
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

'use client';

import { useState, useRef, useEffect } from 'react';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import { ChevronDown } from 'lucide-react';

import { Logo } from '@/components/ui/Logo';
import { ProfileIcon } from '@/components/ui/icons/ProfileIcon';
import { Button } from '@/components/ui/Button';
import { SignupModal } from '@/features/auth/components/SignupModal';
import { LoginModal } from '@/features/auth/components/LoginModal';
import { SearchBar } from '@/features/search/components/SearchBar';
import { useAuth } from '@/providers/auth-provider';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useLanguage } from '@/providers/LanguageProvider';

export function Header() {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut, isLoading: loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isVisible } = useScrollDirection();
  const { t } = useLanguage();

  // Handle search submission - navigate to providers page
  const handleSearchSubmit = (query: string, category: string | null, location: string) => {
    const params = new URLSearchParams();
    if (query) {
      params.set('q', query);
    }
    if (category) {
      params.set('category', category);
    }
    if (location) {
      params.set('location', location);
    }
    router.push(`/providers?${params.toString()}`);
  };

  // Handle clear search - navigate to providers without query
  const handleClearSearch = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete('q');
    router.push(`/providers?${params.toString()}`);
  };

  // Handle category change - navigate to providers with new category
  const handleCategoryChange = (category: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (category) {
      params.set('category', category);
    } else {
      params.delete('category');
    }
    router.push(`/providers?${params.toString()}`);
  };

  // Handle location change - navigate to providers with new location
  const handleLocationChange = (location: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('location', location);
    router.push(`/providers?${params.toString()}`);
  };

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

  // Handle About link click - scroll to section on home page, navigate otherwise
  const handleAboutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/') {
      e.preventDefault();
      const aboutSection = document.getElementById('about');
      if (aboutSection) {
        aboutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    // If not on home page, let the default Link behavior handle navigation
  };

  return (
    <>
      <header
        className={`header-gradient fixed left-0 right-0 top-0 z-50 w-full shadow-sm transition-all duration-300 ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="mx-auto w-full max-w-7xl px-4">
          <nav className="flex h-20 w-full items-center justify-between">
            {/* Left */}
            <div className="flex flex-row items-center gap-16">
              <Link aria-label="Zur Startseite" className="relative" href="/">
                <Logo className="size-8 text-white" />
              </Link>
              {!user && (
                <Link
                  className="flex h-10 items-center rounded-xl border-none px-3.5 text-base font-medium text-content-heading hover:bg-neutral-light hover:text-[#333333] focus:text-content-heading focus:outline-none active:text-content-heading"
                  href="/about"
                  onClick={handleAboutClick}
                >
                  {t('navigation.about')}
                </Link>
              )}
            </div>

            {/* Search Bar */}
            <SearchBar 
              className="!w-[640px] !shadow-none"
              onCategoryChange={handleCategoryChange}
              onClearSearch={handleClearSearch}
              onLocationChange={handleLocationChange}
              onSearchSubmit={handleSearchSubmit}
            />

            {/* Right */}
            <div className="flex flex-row items-center gap-3">
              {loading ? (
                <div className="flex h-10 w-24 animate-pulse items-center justify-center rounded-xl bg-gray-100" />
              ) : user ? (
                <>
                  <Button
                    className="hidden md:flex h-10 w-[89px] px-[14px] rounded-xl border border-[#CDCDCD]"
                    variant="primary"
                    onClick={() => router.push('/create')}
                  >
                    {t('navigation.create')}
                  </Button>
                  <div ref={dropdownRef} className="relative">
                    <button
                      aria-label="Profil Dropdown öffnen"
                      className="flex items-center gap-1 rounded-full focus:outline-none"
                      onClick={() => setDropdownOpen((open) => !open)}
                    >
                      <ProfileIcon className="shrink-0" isActive={dropdownOpen} />
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
                          {t('profile.accountSettings')}
                        </button>
                        <button
                          className="block w-full px-4 py-2 text-left text-base text-red-600 hover:bg-gray-50"
                          onClick={async () => {
                            setDropdownOpen(false);
                            await signOut();
                            router.push('/');
                          }}
                        >
                          {t('auth.logout')}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    className="flex h-10 items-center rounded-xl border border-neutral px-3.5 text-base font-medium text-content"
                    onClick={() => setShowLoginModal(true)}
                  >
                    Anmelden
                  </button>
                  <button
                    className="flex h-10 items-center rounded-xl bg-primary px-3.5 text-base font-medium text-white hover:bg-primary/90"
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

      {showSignupModal && (
        <SignupModal
          onClose={() => setShowSignupModal(false)}
          onSwitchMode={() => {
            setShowSignupModal(false);
            setShowLoginModal(true);
          }}
        />
      )}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSwitchMode={() => {
            setShowLoginModal(false);
            setShowSignupModal(true);
          }}
        />
      )}
    </>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, usePathname } from 'next/navigation';

import { ChevronDown } from 'lucide-react';

import { Logo } from '@/components/ui/Logo';
import { ProfileIcon } from '@/components/ui/icons/ProfileIcon';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/features/search/components/SearchBar';
import { SectionSelector } from '@/features/search/components/SectionSelector';
import { useAuth } from '@/providers/auth-provider';
import { useSearch } from '@/providers/search-provider';
import type { Section } from '@/providers/search-provider';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useLanguage } from '@/providers/LanguageProvider';
import {
  getResultsPathForSection,
  inferSectionFromCategory,
  resolveSectionFromRoute,
} from '@/config/sectionFilters';

// Dynamic imports for modals (Plan 007: reduce shared bundle)
const SignupModal = dynamic(
  () =>
    import('@/features/auth/components/SignupModal').then((mod) => ({ default: mod.SignupModal })),
  { ssr: false },
);
const LoginModal = dynamic(
  () =>
    import('@/features/auth/components/LoginModal').then((mod) => ({ default: mod.LoginModal })),
  { ssr: false },
);

export function Header() {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut, isLoading: loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { selectedSection, setSelectedSection } = useSearch();
  const { isVisible } = useScrollDirection();
  const { t } = useLanguage();
  const handleSectionChange = (section: Section) => {
    setSelectedSection(section);
    const params = new URLSearchParams({ section });
    router.push(`${getResultsPathForSection(section)}?${params.toString()}`);
  };

  const pushResultsRoute = (params: URLSearchParams) => {
    const section = resolveSectionFromRoute(pathname, params);
    params.set('section', section);
    router.push(`${getResultsPathForSection(section)}?${params.toString()}`);
  };

  const buildSearchSubmitParams = () => {
    const current = new URLSearchParams(window.location.search);
    const next = new URLSearchParams();
    // Preserve only user-facing context that should survive a new search submit.
    const preservedKeys: Array<'filters' | 'wer'> = ['filters', 'wer'];
    for (const key of preservedKeys) {
      const value = current.get(key);
      if (value) {
        next.set(key, value);
      }
    }
    return next;
  };

  // Handle search submission - navigate to providers page
  const handleSearchSubmit = (query: string, location: string) => {
    const params = buildSearchSubmitParams();
    const section = resolveSectionFromRoute(pathname, params);
    params.set('section', section);
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    if (location) {
      params.set('location', location);
    } else {
      params.delete('location');
    }
    router.push(`${getResultsPathForSection(section)}?${params.toString()}`);
  };

  // Handle clear search - navigate to providers without query
  const handleClearSearch = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete('q');
    pushResultsRoute(params);
  };

  // Handle location change - navigate to providers with new location
  const handleLocationChange = (location: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('location', location);
    pushResultsRoute(params);
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
        className={`header-gradient fixed left-0 right-0 top-0 z-50 w-full pt-[calc(env(safe-area-inset-top)+16px)] shadow-sm transition-all duration-300 ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <nav className="flex w-full flex-col items-center gap-4 py-2">
            {/* Top row: Logo + About + SectionSelector + Auth */}
            <div className="grid w-full grid-cols-[1fr_800px_1fr] items-center px-12">
              {/* Left: Logo + About */}
              <div className="h-14 flex justify-start items-center gap-8">
                <Link
                  aria-label="Zur Startseite"
                  className="relative flex flex-shrink-0 items-center justify-center"
                  href="/"
                >
                  <div className="flex items-center gap-1">
                    <Logo className="size-8 flex-shrink-0 text-white" height={32} width={32} />
                    <span className="font-inter-tight font-semibold text-lg text-primary">UMMAH FLOW</span>
                  </div>
                </Link>
                {!user && (
                  <Link
                    className="h-12 px-5 rounded-xl flex justify-start items-center text-base font-medium text-content-heading hover:bg-neutral-light hover:text-content"
                    href="/about"
                    onClick={handleAboutClick}
                  >
                    {t('navigation.about')}
                  </Link>
                )}
              </div>

              {/* Center: SectionSelector */}
              <div className="w-[800px]">
                <SectionSelector
                  selectedSection={selectedSection}
                  onSectionChange={handleSectionChange}
                />
              </div>

              {/* Right: Auth */}
              <div className="h-12 flex justify-end items-center gap-4">
                {loading ? (
                  <div className="flex h-10 w-24 animate-pulse items-center justify-center rounded-xl bg-neutral-100" />
                ) : user ? (
                  <>
                    <Button
                      className="hidden h-10 w-[89px] rounded-xl border border-border px-[14px] md:flex"
                      variant="primary"
                      onClick={() => router.push('/create')}
                    >
                      {t('navigation.create')}
                    </Button>
                    <div ref={dropdownRef} className="relative">
                      <button
                        aria-label="Profil Dropdown öffnen"
                        className="flex items-center gap-0 rounded-full focus:outline-none"
                        onClick={() => setDropdownOpen((open) => !open)}
                      >
                        <ProfileIcon className="shrink-0" isActive={dropdownOpen} />
                        <ChevronDown
                          aria-hidden="true"
                          className={`-ml-2 size-6 text-content transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {dropdownOpen && (
                        <div className="absolute right-0 top-full z-40 mt-1 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5">
                          <button
                            className="block w-full px-4 py-2 text-left text-base hover:bg-neutral-50"
                            onClick={() => {
                              setDropdownOpen(false);
                              router.push('/profile');
                            }}
                          >
                            {t('profile.accountSettings')}
                          </button>
                          <button
                            className="block w-full px-4 py-2 text-left text-base text-danger hover:bg-neutral-50"
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
                      className="self-stretch px-5 rounded-xl border border-neutral text-base font-medium text-content flex items-center"
                      onClick={() => setShowLoginModal(true)}
                    >
                      {t('navigation.login')}
                    </button>
                    <button
                      className="self-stretch px-5 bg-primary rounded-xl text-base font-medium text-white hover:bg-primary/90 flex items-center"
                      onClick={() => setShowSignupModal(true)}
                    >
                      {t('navigation.register')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Bottom row: SearchBar centered */}
            <div className="flex w-full justify-center px-12">
              <SearchBar
                className="!w-[800px] !shadow-none"
                onClearSearch={handleClearSearch}
                onLocationChange={handleLocationChange}
                onSearchSubmit={handleSearchSubmit}
              />
            </div>
        </nav>
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

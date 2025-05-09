'use client';

import { Logo } from '@/components/ui/Logo';
import { SearchBar } from '@/features/search/components/SearchBar';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full py-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-screen-xl flex-col items-center gap-20">
        {/* NavBar */}
        <nav className="flex h-10 w-full flex-row items-center justify-between">
          {/* Left */}
          <div className="flex flex-row items-center gap-16">
            <div className="relative">
              <Logo className="size-8 text-white" />
            </div>
            <button className="flex h-10 items-center rounded-xl border-none px-3.5 text-base font-medium text-text hover:bg-grey-light">
              Über uns
            </button>
          </div>

          {/* Search Bar */}
          <SearchBar className="!w-[640px] !shadow-none" />

          {/* Right */}
          <div className="flex flex-row items-center gap-3">
            <button className="flex h-10 items-center rounded-xl border border-grey px-3.5 text-base font-medium text-text">
              Anmelden
            </button>
            <button className="flex h-10 items-center rounded-xl bg-mint px-3.5 text-base font-medium text-white">
              Registrieren
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

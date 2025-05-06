'use client';

import { ActionButton } from '@/components/ui/ActionButton';
import { Bismillah } from '@/components/ui/Bismillah';
import { OrnamentIcon } from '@/components/ui/OrnamentIcon';
import { SearchBar } from '@/features/search/components/SearchBar';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center px-20 py-6">
      {/* Header */}
      <header className="flex w-[1280px] flex-col items-center gap-20">
        {/* NavBar */}
        <nav className="flex h-10 w-full flex-row items-center justify-between">
          {/* Left */}
          <div className="flex flex-row items-center gap-16">
            <div className="relative h-8 w-8">
              <div className="absolute left-[0.62px] top-[0.62px] h-[30.77px] w-[30.77px] rounded-full bg-brand-primary">
                <OrnamentIcon className="h-8 w-8 text-white" />
              </div>
            </div>
            <a 
              className="flex h-10 flex-row items-center rounded-sm px-3.5 text-base font-medium text-text-primary hover:bg-gradient-start"
              href="/about"
            >
              Über uns
            </a>
          </div>

          {/* Search Bar */}
          <SearchBar className="w-[640px] !flex-row !p-2 !shadow-none" />

          {/* Right */}
          <div className="flex flex-row items-center gap-3">
            <button className="flex h-10 flex-row items-center rounded-sm border border-border-light px-3.5">
              <span className="text-base font-medium text-text-primary">Anmelden</span>
            </button>
            <button className="flex h-10 flex-row items-center rounded-sm bg-brand-primary px-3.5">
              <span className="text-base font-medium text-white">Registrieren</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="mt-32 flex w-[960px] flex-col items-center justify-center gap-16">
        <div className="flex flex-col items-center justify-center gap-6">
          {/* Bismillah */}
          <div className="flex flex-col items-center gap-2">
            <Bismillah className="h-[69.36px] w-[390px] text-[#C2A274]" />
            <span className="bg-gradient-to-b from-[#D2B581] via-[#AF8650] to-[#E5D1A0] bg-clip-text font-baskerville text-base font-normal text-transparent">
              Im Namen Allahs des Allerbarmers, des Allbarmherzigen
            </span>
          </div>

          {/* Heading */}
          <h1 className="w-full text-center font-inter-tight text-[72px] font-medium leading-[87px] text-text-primary">
            Ummah Flow
          </h1>

          {/* Subheading */}
          <p className="w-[722px] text-center font-inter text-2xl font-normal leading-[29px] text-text-secondary">
            Der erste halal-konforme Marktplatz der sicherstellt, das Jeder die Zakat entrichtet insha&apos;Allah.
          </p>
        </div>

        {/* Action Button */}
        <ActionButton
          className="w-[282px]"
          label="Jetzt Mitmachen"
          size="lg"
        />
      </main>
    </div>
  );
}

'use client';

import Link from 'next/link';

import { ActionButton } from '@/components/ui/ActionButton';
import { Bismillah } from '@/components/ui/Bismillah';

export function LandingHero() {
  return (
    <section className="flex min-h-screen w-full flex-col items-center justify-center px-6 sm:px-8">
      <div className="flex w-full flex-1 items-center justify-center">
        <div className="mx-auto flex w-full max-w-[960px] flex-col items-center">
          <div className="flex w-full flex-col items-center justify-center">
            {/* Bismillah Section */}
            <div className="mb-8 flex w-full flex-col items-center gap-2 px-8 sm:mb-16">
              <Bismillah className="h-auto w-full text-mint" />
              <span className="bg-gold-gradient bg-clip-text px-2 text-center font-baskerville text-base font-normal leading-[18px] text-transparent">
                Im Namen Allahs des Allerbarmers, des Allbarmherzigen
              </span>
            </div>

            {/* Heading + Paragraph Section */}
            <section className="mb-8 flex flex-col items-center gap-4 sm:mb-16">
              <h1 className="w-full text-center font-inter-tight text-4xl font-medium leading-tight text-content-title sm:text-5xl sm:leading-[87px] md:text-6xl lg:text-[72px]">
                Von <span className="text-primary">Muslimen</span>
                <br className="block sm:hidden" />
                für <span className="text-primary">Muslime</span>
              </h1>
              <p className="w-full max-w-xl text-center font-inter text-lg font-normal leading-snug text-content sm:text-xl sm:leading-[29px] md:text-2xl">
                Der erste halal-konforme Marktplatz der sicherstellt, das Jeder die Zakat entrichtet
                insha&apos;Allah.
              </p>
            </section>

            {/* Action Button */}
            <div className="mb-8 sm:mb-16">
              <Link href="/souks">
                <ActionButton label="Entdecke deine Ummah" size="lg" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

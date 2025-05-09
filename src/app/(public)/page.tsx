'use client';

import { Header } from '@/components/layout/Header';
import { ActionButton } from '@/components/ui/ActionButton';
import { Bismillah } from '@/components/ui/Bismillah';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col px-4">
      {/* Header */}
      <Header />

      {/* Main Content (vertically centered) */}
      <div className="flex w-full flex-1 items-center justify-center">
        <main className="mx-auto flex w-full max-w-[960px] flex-col items-center gap-16">
          <div className="flex flex-col items-center justify-center gap-[54px]">
            {/* Bismillah Section */}
            <div className="flex flex-col items-center gap-2">
              <Bismillah className="size-[69.36px] w-[390px] text-mint" />
              <span className="bg-gold-gradient bg-clip-text font-baskerville text-base font-normal leading-[18px] text-transparent">
                Im Namen Allahs des Allerbarmers, des Allbarmherzigen
              </span>
            </div>

            {/* Heading + Paragraph Section */}
            <section className="flex flex-col items-center">
              <h1 className="w-full text-center font-inter-tight text-[72px] font-medium leading-[87px] text-text">
                Von <span className="text-primary">Muslimen</span> für{' '}
                <span className="text-primary">Muslime</span>
              </h1>
              <p className="w-full max-w-xl text-center font-inter text-2xl font-normal leading-[29px] text-text">
                Der erste halal-konforme Marktplatz der sicherstellt, das Jeder die Zakat entrichtet
                insha&apos;Allah.
              </p>
            </section>

            {/* Action Button */}
            <ActionButton label="Jetzt Mitmachen" size="lg" />
          </div>
        </main>
      </div>
    </div>
  );
}

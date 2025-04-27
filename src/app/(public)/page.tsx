import { Suspense } from 'react';

import Link from 'next/link';

import {
  ProjectCard,
  QuoteCard,
  Button,
  Basmala,
  Placeholder,
  LoadingSpinner,
} from '@/components/ui';
import { cn } from '@/lib/utils';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Startseite',
  description:
    'Der erste halal-konforme Marktplatz für Muslime - Entdecke Produkte und Dienstleistungen von der Ummah für die Ummah.',
  openGraph: {
    title: 'Ummah Flow - Von Muslimen für Muslime',
    description:
      'Der erste halal-konforme Marktplatz für Muslime - Entdecke Produkte und Dienstleistungen von der Ummah für die Ummah.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Ummah Flow Marketplace',
      },
    ],
  },
};

interface ProjectGridProps {
  className?: string;
}

function ProjectGrid({ className }: ProjectGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4', className)}>
      {[...Array(4)].map((_, i) => (
        <Suspense key={i} fallback={<LoadingSpinner />}>
          <ProjectCard />
        </Suspense>
      ))}
    </div>
  );
}

export default async function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="relative pt-20">
        {/* Hero Section */}
        <section className="flex min-h-[calc(100vh-5rem)] items-center py-16 md:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
              <div className="w-full space-y-8 md:w-1/2">
                <div className="mx-auto w-full max-w-[240px] md:mx-0">
                  <Basmala size="lg" />
                </div>
                <h1 className="text-center text-4xl font-normal leading-[1.1] tracking-tight text-foreground md:text-left md:text-6xl lg:text-[78px]">
                  Von Muslimen
                  <br />
                  für Muslime.
                </h1>
                <p className="max-w-xl text-center text-lg leading-normal text-muted-foreground md:text-left md:text-2xl lg:text-[26px]">
                  Der erste halal-konforme Marktplatz der sicherstellt, das jeder Anbieter die Zakat
                  entrichtet.
                </p>
                <div className="flex justify-center md:justify-start">
                  <Link href="/about">
                    <Button className="px-8 py-6 text-lg" size="lg" variant="primary">
                      Entdecke deine Ummah!
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="w-full md:w-1/2">
                <QuoteCard className="mx-auto aspect-square w-full max-w-2xl md:aspect-[4/3]" />
              </div>
            </div>
          </div>
        </section>

        {/* Zakat Projects Section */}
        <section className="bg-muted py-16 md:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="space-y-12">
              <h2 className="text-center text-3xl font-semibold leading-tight text-foreground md:text-left md:text-4xl lg:text-[36px]">
                Unsere Zakat Projekte
              </h2>
              <Suspense fallback={<ProjectGrid className="opacity-60" />}>
                <ProjectGrid />
              </Suspense>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
              <div className="w-full space-y-8 md:w-1/2">
                <div className="space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Über Uns</p>
                  <h2 className="text-3xl font-semibold leading-tight text-foreground md:text-4xl lg:text-[36px]">
                    Wer steckt hinter
                    <br />
                    Ummah Flow?
                  </h2>
                </div>
                <div className="space-y-6 text-lg leading-relaxed text-muted-foreground md:text-xl lg:text-2xl">
                  <p>
                    Ummah Flow ist mehr als nur ein Marktplatz – es ist eine Bewegung. Wir verbinden
                    die muslimische Community mit nachhaltigen, ethischen und halal-konformen
                    Produkten und Dienstleistungen. Unser Ziel ist es, eine Platform zu schaffen,
                    auf der muslimische Unternehmer, Kreative und Dienstleister ihre Angebote einer
                    engagierten Gemeinschaft präsentieren können.
                  </p>
                  <p>
                    Wir glauben an faire Wirtschaft, gegenseitige Unterstützung und ein starkes
                    Netzwerk, das islamische Werte lebt. Ummah Flow steht für Vertrauen, Qualität
                    und Innovation – damit du Produkte und Dienstleistungen findest, die zu deinem
                    Lebensstil passen. Schließe dich uns an und werde Teil der Ummah Flow Community!
                  </p>
                </div>
              </div>
              <div className="flex w-full justify-center md:w-1/2">
                <div className="relative rounded-full bg-primary p-12 md:p-20">
                  <Placeholder className="text-primary-foreground" height={300} width={300} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

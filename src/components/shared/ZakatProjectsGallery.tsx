'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { getZakat, type Zakat } from '@/services/zakat_projects';

import ZakatGallery from './ZakatGallery';

export function ZakatProjectsGallery() {
  const [zakatProjects, setZakatProjects] = useState<Zakat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadZakatProjects() {
      try {
        const fetchedZakatProjects = await getZakat();
        setZakatProjects(fetchedZakatProjects);
      } catch (err) {
        console.error('Error fetching zakat projects:', err);
        setError('Failed to load zakat projects.');
      } finally {
        setIsLoading(false);
      }
    }

    loadZakatProjects();
  }, []);

  const handleZakatProjectClick = (zakatId: string) => {
    // Navigate to zakat project detail page
    router.push(`/zakat/${zakatId}`);
  };

  if (isLoading) {
    return (
      <section className="w-full px-6 py-8 lg:hidden">
        <div className="flex flex-col gap-8">
          <div className="bg-muted h-6 w-40 animate-pulse rounded" />
          <div className="bg-muted h-[150px] w-[358px] animate-pulse rounded-[29px]" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full px-6 py-8 text-center text-red-500 lg:hidden">
        <p>{error}</p>
      </section>
    );
  }

  if (zakatProjects.length === 0) {
    return null; // Don't render section if no zakat projects are found
  }

  return (
    <section className="w-full px-6 pt-8 lg:hidden">
      <div className="flex flex-col gap-8">
        {zakatProjects.slice(0, 3).map((zakatProject) => {
          return (
            <div
              key={zakatProject.zakat_id}
              aria-label={`Spenden-Projekte anzeigen`}
              className="-m-2 flex cursor-pointer flex-col rounded-lg p-2 transition-transform hover:scale-[1.02] hover:bg-gray-50/50 active:scale-[0.98]"
              role="button"
              tabIndex={0}
              onClick={() => handleZakatProjectClick(zakatProject.zakat_id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleZakatProjectClick(zakatProject.zakat_id);
                }
              }}
            >
              <div className="flex w-full flex-row items-start justify-between">
                <div className="flex flex-col items-start justify-between gap-2.5 p-3">
                  <div className="flex flex-col items-start">
                    <div className="w-full font-inter text-[14px] font-normal leading-[140%] text-[#232323]">
                      Unterstütze unsere Zakat Partner
                    </div>
                    <div className="w-full truncate font-inter text-[24px] font-semibold leading-[120%] tracking-[-0.02em] text-[#232323]">
                      Spenden-Projekte
                    </div>
                  </div>
                </div>

                {/* Right side - Chevron */}
                <div className="flex flex-row items-start justify-end gap-2.5 p-2.5">
                  <div className="relative flex h-12 w-12 items-center justify-center">
                    <svg
                      className="text-[#232323]"
                      fill="none"
                      height="32"
                      viewBox="0 0 24 24"
                      width="32"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9 18L15 12L9 6"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <ZakatGallery />
            </div>
          );
        })}
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { getCommunityServices, type CommunityService } from '@/services/community_services';

import CommunityServiceGallery from './CommunityServiceGallery';

export function CommunityServicesGallery() {
  const [communityServices, setCommunityServices] = useState<CommunityService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadCommunityServices() {
      try {
        const fetchedCommunityServices = await getCommunityServices();
        setCommunityServices(fetchedCommunityServices);
      } catch (err) {
        console.error('Error fetching community services:', err);
        setError('Failed to load community services.');
      } finally {
        setIsLoading(false);
      }
    }

    loadCommunityServices();
  }, []);

  const handleCommunityServiceClick = (_communityServiceId: string) => {
    // Navigate to search page with Spenden category filter
    router.push('/providers?category=2335922b-76a9-4d79-b32a-b3f95941ba5c');
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

  if (communityServices.length === 0) {
    return null; // Don't render section if no community services are found
  }

  return (
    <section className="w-full px-6 pt-8 lg:hidden">
      <div className="flex flex-col gap-8">
        {communityServices.slice(0, 3).map((communityService) => {
          return (
            <div
              key={communityService.community_service_id}
              aria-label={`Community Services anzeigen`}
              className="flex cursor-pointer flex-col rounded-lg p-2 transition-transform hover:scale-[1.02] hover:bg-gray-50/50 active:scale-[0.98]"
              role="button"
              tabIndex={0}
              onClick={() => handleCommunityServiceClick(communityService.community_service_id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCommunityServiceClick(communityService.community_service_id);
                }
              }}
            >
              <div className="flex w-full flex-row items-start">
                <div className="flex flex-1 min-w-0 flex-col items-start justify-between gap-2.5 p-3 pr-3">
                  <div className="flex flex-col items-start">
                    <div className="w-full font-inter text-[14px] font-normal leading-[140%] text-[#232323] break-words">
                      Unterstütze unsere Community Service Partner
                    </div>
                    <div className="w-full min-w-0 truncate font-inter text-[24px] font-semibold leading-[120%] tracking-[-0.02em] text-[#232323]">
                      Community Services
                    </div>
                  </div>
                </div>

                {/* Right side - Chevron */}
                <div className="flex flex-row items-start justify-end shrink-0 ml-auto">
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

              <CommunityServiceGallery />
            </div>
          );
        })}
      </div>
    </section>
  );
}

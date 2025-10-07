'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { CommunityServiceCard } from '@/components/shared/CommunityServiceCard';
import { useFormData } from '@/providers/form-provider';
import { getCommunityServices, type CommunityService } from '@/services/community_services';

const STEPS = [
  {
    title: 'Basics',
    icon: 'mdi:information',
  },
  {
    title: 'Location',
    icon: 'mdi:map-marker',
  },
  {
    title: 'Contact',
    icon: 'mdi:account',
  },
  {
    title: 'Media',
    icon: 'mdi:image-multiple',
  },
];

export default function SocialProjectPage() {
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [communityServices, setCommunityServices] = useState<CommunityService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  
  const router = useRouter();
  const { formData, updateFormData } = useFormData();

  // Fetch community services on component mount
  useEffect(() => {
    async function fetchCommunityServices() {
      setServicesLoading(true);
      try {
        const servicesData = await getCommunityServices();
        console.log('Fetched community services:', servicesData);
        console.log('Number of services:', servicesData.length);
        setCommunityServices(servicesData);
      } catch (error) {
        console.error('Error fetching community services:', error);
        console.error('Error details:', error);
      }
      setServicesLoading(false);
    }
    void fetchCommunityServices();
  }, []);

  // Scroll detection for sticky header with iOS boundary handling
  useEffect(() => {
    // Use setTimeout to ensure DOM is ready (fixes iOS initial scroll issue)
    const timer = setTimeout(() => {
      scrollContainerRef.current = document.querySelector('.content-scroll-container');
      const contentContainer = scrollContainerRef.current;
      
      if (!contentContainer) return;
      
      const SCROLL_THRESHOLD = 10; // Min px at top before header can hide
      const MIN_SCROLL_DELTA = 8; // Increased for iOS sensitivity
      const BOUNDARY_BUFFER = 50; // Buffer zone for bottom boundary (iOS rubber band)
      
      let ticking = false; // Throttle using requestAnimationFrame
      
      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const currentScrollY = contentContainer?.scrollTop || 0;
            const scrollDifference = currentScrollY - lastScrollY.current;
            
            // Calculate if we're near the bottom (iOS rubber band protection)
            const scrollHeight = contentContainer.scrollHeight;
            const clientHeight = contentContainer.clientHeight;
            const distanceFromBottom = scrollHeight - clientHeight - currentScrollY;
            const isNearBottom = distanceFromBottom < BOUNDARY_BUFFER;
            
            // Ignore tiny scroll movements to prevent jitter
            if (Math.abs(scrollDifference) < MIN_SCROLL_DELTA) {
              ticking = false;
              return;
            }
            
            // Ignore scroll changes when near bottom (iOS rubber band effect)
            if (isNearBottom) {
              ticking = false;
              return;
            }
            
            // Always show header when at the top
            if (currentScrollY <= SCROLL_THRESHOLD) {
              setIsHeaderSticky(true);
            }
            // Hide when scrolling down (past threshold)
            else if (scrollDifference > 0) {
              setIsHeaderSticky(false);
            }
            // Show when scrolling up (past threshold)
            else if (scrollDifference < 0) {
              setIsHeaderSticky(true);
            }
            
            lastScrollY.current = currentScrollY;
            ticking = false;
          });
          
          ticking = true;
        }
      };

      contentContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        contentContainer.removeEventListener('scroll', handleScroll);
      };
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, []);

  // Filter projects based on search
  const filteredProjects = communityServices.filter(service =>
    service.community_service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (service.community_service_description && service.community_service_description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Debug logging
  console.log('Community services state:', communityServices);
  console.log('Search query:', searchQuery);
  console.log('Filtered projects:', filteredProjects);

  // Handle project selection/deselection
  const selectProject = (serviceId: string) => {
    const service = communityServices.find(s => s.community_service_id === serviceId);
    if (service) {
      // If this service is already selected, deselect it
      if (formData.selectedCommunityServiceId === serviceId) {
        updateFormData({ 
          donationProject: null,
          selectedCommunityServiceId: null
        });
      } else {
        // Otherwise, select it
        updateFormData({ 
          donationProject: service.community_service_name,
          selectedCommunityServiceId: service.community_service_id
        });
      }
    }
  };

  // Save and continue
  const handleSave = () => {
    router.push('/create/media');
  };


  // Back to media page
  const handleBack = () => {
    router.push('/create/media');
  };

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Single Sticky Header */}
      <div className={`fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl transition-all duration-300 ease-out ${
        isHeaderSticky ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
          {/* Back Button */}
          <button
            className="flex h-8 w-8 items-center justify-center"
            onClick={handleBack}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          
          {/* Title */}
          <div className="flex flex-1 items-start">
            <h1 className="text-xl font-semibold text-title">
              Soziale Initiativen
            </h1>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className={`transition-all duration-300 ${
        isHeaderSticky ? 'h-16' : 'h-0'
      }`} />

      {/* Content */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-8 pb-8 overflow-y-auto">
        <div className="flex w-full max-w-[361px] flex-1 flex-col gap-8 pb-mobile-nav-md">
          {/* Step Indicator */}
          <div className="mb-6">
            <StepIndicator currentStep={3} steps={STEPS} />
          </div>

          {/* Search Section */}
          <div className="flex w-full flex-col gap-4">
            
            {/* Search Input */}
            <div className="flex w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2 focus-within:border-[#D4D4D4] focus-within:ring-0">
              <Icon className="h-5 w-5 text-[#999999]" icon="lucide:search" />
              <input
                className="flex-1 border-none bg-transparent text-[15px] font-medium leading-[18px] text-[#272727] focus:outline-none focus:ring-0 focus:border-none"
                placeholder="Initiativen durchsuchen"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Projects Grid */}
          <div className="w-full">
            {servicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Icon className="h-8 w-8 text-gray-400 animate-spin" icon="lucide:loader-2" />
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="grid w-full grid-cols-2 gap-4">
                {filteredProjects.map((service) => {
                  // Get image URL
                  const getImageUrl = () => {
                    if (!service.community_service_images) return '/images/placeholder.jpg';
                    try {
                      let imagesData: { urls?: string[] } = {};
                      if (typeof service.community_service_images === 'string') {
                        imagesData = JSON.parse(service.community_service_images);
                      } else if (Array.isArray(service.community_service_images)) {
                        imagesData.urls = service.community_service_images;
                      } else if (
                        typeof service.community_service_images === 'object' &&
                        service.community_service_images !== null &&
                        'urls' in service.community_service_images
                      ) {
                        imagesData = service.community_service_images;
                      }
                      if (imagesData.urls && imagesData.urls.length > 0) {
                        return imagesData.urls[0];
                      }
                    } catch {
                      return '/images/placeholder.jpg';
                    }
                    return '/images/placeholder.jpg';
                  };

                  return (
                    <CommunityServiceCard
                      key={service.community_service_id}
                      category={service.category?.name_de || service.category?.name_en}
                      description={service.community_service_description}
                      donationCount={service.donation_count}
                      imageUrl={getImageUrl()}
                      isSelected={formData.selectedCommunityServiceId === service.community_service_id}
                      title={service.community_service_name}
                      onClick={() => selectProject(service.community_service_id)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Icon className="h-12 w-12 text-gray-300 mb-4" icon="lucide:search-x" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? 'Keine Projekte gefunden' : 'Keine Spenden-Projekte verfügbar'}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-gray-400 mt-2">
                    Kontaktieren Sie einen Administrator, um Projekte hinzuzufügen
                  </p>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Navbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]">
        <div className="flex h-[80px] w-full items-center justify-center px-4">
          <button
            className={`flex h-[48px] w-full max-w-[345px] items-center justify-center gap-2 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-opacity ${
              formData.selectedCommunityServiceId
                ? 'bg-[#589D96] opacity-100'
                : 'bg-[#589D96] opacity-30 cursor-not-allowed'
            }`}
            disabled={!formData.selectedCommunityServiceId}
            onClick={handleSave}
          >
            <Icon className="h-6 w-6 text-white" icon="lucide:save" />
            <span className="text-base font-medium text-white leading-[19px]">
              Speichern
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';

// Header is implemented inline to match the media page structure
import { StepIndicator } from '@/components/shared/StepIndicator';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { SelectableCard } from '@/components/shared/SelectableCard';
import { useFormData } from '@/providers/form-provider';
import { getCommunityServices, type CommunityService } from '@/services/community_services';
import { getFirstImageUrl } from '@/utils/imageUtils';
import { useLanguage } from '@/providers/LanguageProvider';

export default function SocialProjectPage() {
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [communityServices, setCommunityServices] = useState<CommunityService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();

  // Steps with translations
  const STEPS = [
    {
      title: t('create.steps.basics'),
      icon: 'mdi:information',
    },
    {
      title: t('create.steps.location'),
      icon: 'mdi:map-marker',
    },
    {
      title: t('create.steps.contact'),
      icon: 'mdi:account',
    },
    {
      title: t('create.steps.media'),
      icon: 'mdi:image-multiple',
    },
  ];

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

  // Handle project selection/deselection (multi-select)
  const toggleProject = (serviceId: string) => {
    const currentIds = formData.selectedCommunityServiceIds || [];
    
    if (currentIds.includes(serviceId)) {
      // Remove from selection
      updateFormData({ 
        selectedCommunityServiceIds: currentIds.filter(id => id !== serviceId)
      });
    } else {
      // Add to selection
      updateFormData({ 
        selectedCommunityServiceIds: [...currentIds, serviceId]
      });
    }
  };

  // Save and continue
  const handleSave = () => {
    router.push('/create/media');
  };


  // Back handled inline in header button

  return (
    <div className="relative flex h-screen w-full flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
      <PageHeader
        isVisible={isHeaderSticky}
        title="Soziale Initiativen"
        variant="back-and-title"
        onBack="/create/media"
      />
      <HeaderSpacer isVisible={isHeaderSticky} />

      <main className="content-scroll-container flex flex-1 flex-col items-center px-safe-24 pt-8 mobile-nav-spacing overflow-y-auto">
        <div className="flex w-full flex-col gap-8">
          <StepIndicator currentStep={3} steps={STEPS} />

          <section className="w-full">
            <p className="font-normal text-base text-[#7A7A7A] px-3">
              Wähle soziale Initiativen aus, die du unterstützt. Sobald die Verantwortlichen der Initiativen dies verifiziert haben, wird dein Angebot mit der Initiativen verknüpft.
            </p>
          </section>

          <section className="w-full">
            <div className="flex items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2 focus-within:border-[#D4D4D4] focus-within:ring-0">
              <Icon className="h-5 w-5 text-[#999999]" icon="lucide:search" />
              <input
                className="flex-1 border-none bg-transparent text-[15px] font-medium text-[#272727] focus:outline-none focus:ring-0"
                placeholder="Initiativen durchsuchen"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </section>

          <section className="w-full">
            {servicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Icon className="h-8 w-8 text-gray-400 animate-spin" icon="lucide:loader-2" />
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="grid w-full grid-cols-2 gap-4">
                {filteredProjects.map((service) => {
                  const isSelected = (formData.selectedCommunityServiceIds || []).includes(service.community_service_id);
                  const imageUrl = getFirstImageUrl(service.community_service_images);
                  const donationText = service.donation_count && service.donation_count > 0 
                    ? `${service.donation_count}x Gesponsort` 
                    : undefined;

                  return (
                    <SelectableCard
                      key={service.community_service_id}
                      actionType="select"
                      bottomText={donationText}
                      category={service.category?.name_de || service.category?.name_en}
                      imageUrl={imageUrl}
                      isSelected={isSelected}
                      title={service.community_service_name}
                      onAction={() => toggleProject(service.community_service_id)}
                      onClick={() => toggleProject(service.community_service_id)}
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
          </section>
        </div>
      </main>

      {/* Navbar */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-[80px] w-full items-center justify-center px-safe-24 pb-4">
          <button
            className={`flex h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-opacity ${
              (formData.selectedCommunityServiceIds || []).length > 0
                ? 'bg-[#589D96] opacity-100'
                : 'bg-[#589D96] opacity-30 cursor-not-allowed'
            }`}
            disabled={(formData.selectedCommunityServiceIds || []).length === 0}
            onClick={handleSave}
          >
            <Icon className="h-6 w-6 text-white" icon="lucide:save" />
            <span className="text-base font-medium text-white leading-[19px]">
              {(formData.selectedCommunityServiceIds || []).length > 0 
                ? `${(formData.selectedCommunityServiceIds || []).length} ausgewählt` 
                : 'Speichern'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

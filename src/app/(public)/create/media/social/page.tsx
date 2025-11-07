'use client';

import { useEffect, useState } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [communityServices, setCommunityServices] = useState<CommunityService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  
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
        title={t('create.media.socialInitiativesTitle')}
        variant="back-and-title"
        onBack="/create/media"
      />
      <HeaderSpacer />

      <main className="content-scroll-container flex flex-1 flex-col items-center px-safe-24 pt-8 mobile-nav-spacing overflow-y-auto">
        <div className="flex w-full flex-col gap-8">
          <StepIndicator currentStep={3} steps={STEPS} />

          <section className="w-full">
            <p className="font-normal text-base text-[#7A7A7A] px-3">
              {t('create.media.socialInitiativesDescription')}
            </p>
          </section>

          <section className="w-full">
            <div className="flex items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2 focus-within:border-[#D4D4D4] focus-within:ring-0">
              <Icon className="h-5 w-5 text-[#999999]" icon="lucide:search" />
              <input
                className="flex-1 border-none bg-transparent text-[15px] font-medium text-[#272727] focus:outline-none focus:ring-0"
                placeholder={t('create.media.searchInitiatives')}
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
                  {searchQuery ? t('create.media.noProjectsFound') : t('create.media.noDonationProjectsAvailable')}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-gray-400 mt-2">
                    {t('create.media.contactAdminToAddProjects')}
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
                ? `${(formData.selectedCommunityServiceIds || []).length} ${t('create.media.selected')}` 
                : t('create.media.save')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

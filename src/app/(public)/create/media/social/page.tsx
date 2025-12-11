'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { DesktopCreateLayout } from '@/components/layout/DesktopCreateLayout';
import { PageContent } from '@/components/layout/PageContent';
import { SelectableCard } from '@/components/shared/SelectableCard';
import { FooterAction } from '@/components/ui/FooterAction';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { useFormData } from '@/providers/form-provider';
import { getCommunityServices, type CommunityService } from '@/services/communityServices';
import { getFirstImageUrl } from '@/utils/imageUtils';
import { useLanguage } from '@/providers/LanguageProvider';

export default function SocialProjectPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [communityServices, setCommunityServices] = useState<CommunityService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();
  const isMobile = useIsSmallMobile();

  // Choose layout based on screen size
  const Layout = isMobile ? ScrollablePageLayout : DesktopCreateLayout;

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

  const handleBack = () => {
    router.push('/create/basics');
  };

  return (
    <Layout>
      <PageHeader
        className={cn(
          !isMobile && 'md:top-20 md:z-[100] [&>div]:md:px-0 [&>div]:md:max-w-full'
        )}
        customContent={
          !isMobile ? (
            <div className="w-full max-w-[640px] mx-auto px-6 md:px-8 flex items-center h-header-height-mobile sm:h-header-height-tablet">
              <button
                aria-label="Zurück"
                className="flex items-center justify-center w-8 h-8 -ml-1"
                onClick={handleBack}
              >
                <Icon 
                  className="w-8 h-8 text-content-heading pointer-events-none" 
                  icon="material-symbols:chevron-left" 
                />
              </button>
              <h1 className="flex-1 font-inter-tight text-xl font-semibold text-content-heading">
                {t('create.media.socialInitiativesTitle')}
              </h1>
            </div>
          ) : undefined
        }
        title={t('create.media.socialInitiativesTitle')}
        variant="back-and-title"
        onBack={isMobile ? "/create/basics" : undefined}
      />

      <PageContent 
        className={cn(
          'flex flex-col gap-8',
          !isMobile && 'max-w-[640px] mx-auto px-6 md:px-8'
        )}
        hasFooter={isMobile}
        maxWidth="full"
        paddingX={isMobile ? 'px-6' : 'px-0'}
      >
        {/* Search Bar + Subtitle */}
        <div className="flex w-full flex-col gap-2">
          {/* Search Bar */}
          <FormInput
            containerClassName="h-[44px] md:h-[48px] rounded-xl"
            inputClassName="text-xs md:text-base font-normal text-[#7C7C7C] leading-[15px] md:leading-[19px] placeholder:text-[#7C7C7C]"
            label=""
            labelClassName="hidden"
            placeholder={t('create.media.searchInitiatives')}
            rightIcon={<Icon className="h-6 w-6 text-[#1B1D1D]" icon="material-symbols:search" />}
            type="text"
            value={searchQuery}
            variant="with-icon"
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Subtitle */}
          <div className="w-full">
            <p className="text-sm font-normal text-[#7A7A7A] leading-[17px] mb-6 pl-3">
              {t('create.media.socialInitiativesDescription')}
            </p>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1">
          {servicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-gray-500">{t('create.category.loadingCategories')}</span>
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
        </div>

        {/* Desktop Save Button */}
        {!isMobile && (
          <div className="flex flex-col gap-3 pt-4">
            <Button
              fullWidth
              disabled={(formData.selectedCommunityServiceIds || []).length === 0}
              icon="lucide:save"
              variant="primary"
              onClick={handleSave}
            >
              {(formData.selectedCommunityServiceIds || []).length > 0 
                ? `${(formData.selectedCommunityServiceIds || []).length} ${t('create.media.selected')}` 
                : t('create.media.save')}
            </Button>
          </div>
        )}
      </PageContent>

      {/* Mobile Footer Action */}
      {isMobile && (
        <FooterAction
          actionButton={{
            label: (formData.selectedCommunityServiceIds || []).length > 0 
              ? `${(formData.selectedCommunityServiceIds || []).length} ${t('create.media.selected')}` 
              : t('create.media.save'),
            icon: 'lucide:save',
            onClick: handleSave,
            disabled: (formData.selectedCommunityServiceIds || []).length === 0,
            variant: 'primary',
          }}
        />
      )}
    </Layout>
  );
}

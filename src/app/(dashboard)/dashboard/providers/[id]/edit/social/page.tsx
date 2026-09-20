'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { SelectableCard } from '@/components/shared/SelectableCard';
import { getCommunityServices, type CommunityService } from '@/services/communityServices';
import { getFirstImageUrl } from '@/utils/imageUtils';
import { supabase } from '@/lib/supabase/client';
import { FooterAction } from '@/components/ui/FooterAction';
import { useLanguage } from '@/providers/LanguageProvider';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';

export default function EditSocialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: providerId } = use(params);
  const [communityServices, setCommunityServices] = useState<CommunityService[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const router = useRouter();
  const { t, language } = useLanguage();

  useEffect(() => {
    async function fetchCommunityServices() {
      setIsLoading(true);
      try {
        const services = await getCommunityServices();
        setCommunityServices(services);
      } catch (error) {
        console.error('Error fetching community services:', error);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchCommunityServices();
  }, []);

  useEffect(() => {
    const loadCurrentServices = async () => {
      try {
        const stored = localStorage.getItem(`admin_edit_social_${providerId}`);
        if (stored) {
          setSelectedServiceIds(JSON.parse(stored));
          return;
        }

        const { data, error } = await supabase
          // M-5a: provider_community_services dropped; use provider_engagements
          .from('provider_engagements')
          .select('engaged_provider_id')
          .eq('initiating_provider_id', providerId);

        if (!error && data) {
          const serviceIds = data.map(
            (rel: { engaged_provider_id: string }) => rel.engaged_provider_id,
          );
          setSelectedServiceIds(serviceIds);
        }
      } catch (error) {
        console.error('Error loading current community services:', error);
      }
    };

    void loadCurrentServices();
  }, [providerId]);

  const filteredServices = communityServices.filter((service) =>
    service.community_service_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const newSelection = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];

      localStorage.setItem(`admin_edit_social_${providerId}`, JSON.stringify(newSelection));
      return newSelection;
    });
  };

  const handleSave = () => {
    router.back();
  };

  return (
    <div className="h-screen-fix flex flex-col">
      <div className="md:hidden">
        <PageHeader
          title={t('editProvider.editSocial.title')}
          variant="back-and-title"
          onBack={() => router.back()}
        />
        <HeaderSpacer />
      </div>

      <main className="flex flex-1 flex-col px-6 pb-4 overflow-y-auto md:pt-[var(--desktop-header-height,153px)]">
        <div className="w-full sm:mx-auto sm:max-w-2xl">
          <div className="mb-4 px-3">
            <p className="text-left text-base font-normal leading-[19px] text-[#7A7A7A]">
              {t('editProvider.editSocial.description')}
            </p>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Icon
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                icon="lucide:search"
              />
              <input
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t('editProvider.editSocial.searchPlaceholder')}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isLoading ? (
              <div className="col-span-2 flex h-32 items-center justify-center">
                <span className="text-gray-500">{t('editProvider.editSocial.loading')}</span>
              </div>
            ) : (
              filteredServices.map((service) => {
                const isSelected = selectedServiceIds.includes(service.community_service_id);
                const categoryName = service.category
                  ? language === 'en'
                    ? service.category.name_en || service.category.name_de || ''
                    : service.category.name_de || service.category.name_en || ''
                  : '';
                return (
                  <SelectableCard
                    key={service.community_service_id}
                    category={categoryName}
                    imageUrl={getFirstImageUrl(service.community_service_images)}
                    isSelected={isSelected}
                    title={service.community_service_name}
                    onAction={() => toggleService(service.community_service_id)}
                    onClick={() => toggleService(service.community_service_id)}
                  />
                );
              })
            )}
          </div>
        </div>
      </main>

      <FooterAction
        actionButton={{
          label:
            selectedServiceIds.length > 0
              ? t('editProvider.editSocial.selected').replace(
                  '{{count}}',
                  selectedServiceIds.length.toString(),
                )
              : t('editProvider.editSocial.save'),
          icon: 'lucide:check',
          onClick: handleSave,
          variant: 'primary',
          'aria-label': t('editProvider.editSocial.saveAria'),
        }}
      />
    </div>
  );
}

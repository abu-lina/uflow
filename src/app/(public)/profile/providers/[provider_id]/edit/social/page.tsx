'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { SelectableCard } from '@/components/shared/SelectableCard';
import { getCommunityServices, type CommunityService } from '@/services/community_services';
import { getFirstImageUrl } from '@/utils/imageUtils';
import { supabase } from '@/lib/supabase/client';
import { FooterAction } from '@/components/ui/FooterAction';
import { useLanguage } from '@/providers/LanguageProvider';

export default function EditSocialPage({ params }: { params: Promise<{ provider_id: string }> }) {
  const resolvedParams = use(params);
  const [communityServices, setCommunityServices] = useState<CommunityService[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const router = useRouter();
  const { t, language } = useLanguage();

  // Load community services from database
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

  // Load current selections
  useEffect(() => {
    const loadCurrentServices = async () => {
      try {
        // First check localStorage for any pending selection
        const stored = localStorage.getItem(`edit_social_${resolvedParams.provider_id}`);
        if (stored) {
          setSelectedServiceIds(JSON.parse(stored));
          return;
        }

        // If no localStorage value, fetch current provider community services
        const { data, error } = await supabase
          .from('provider_community_services')
          .select('community_service_id')
          .eq('provider_id', resolvedParams.provider_id);

        if (!error && data) {
          const serviceIds = data.map(rel => rel.community_service_id);
          setSelectedServiceIds(serviceIds);
        }
      } catch (error) {
        console.error('Error loading current community services:', error);
      }
    };

    void loadCurrentServices();
  }, [resolvedParams.provider_id]);

  const filteredServices = communityServices.filter((service) =>
    service.community_service_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      const newSelection = prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      
      localStorage.setItem(`edit_social_${resolvedParams.provider_id}`, JSON.stringify(newSelection));
      return newSelection;
    });
  };

  const handleSave = () => {
    router.back();
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="flex items-start w-full max-w-[393px] mx-auto pl-7 pr-4 h-10">
          <button
            aria-label={t('editProvider.back')}
            className="flex items-center justify-center w-8 h-8 -ml-1"
            onClick={() => router.back()}
          >
            <Icon className="w-8 h-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          <h1 className="text-xl font-semibold text-content-heading">{t('editProvider.editSocial.title')}</h1>
        </div>
      </header>

      {/* Dynamic Spacer - 24px gap between header and content */}
      <div className="h-[calc(env(safe-area-inset-top)+24px+40px+24px)]" />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[393px] mx-auto px-4 pt-4 pb-24">
          {/* Explanatory Text */}
          <div className="mb-4 px-3">
            <p className="font-normal text-base leading-[19px] text-[#7A7A7A] text-left">
              {t('editProvider.editSocial.description')}
            </p>
          </div>

          {/* Search Bar */}
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

          {/* Community Services Grid */}
          <div className="grid grid-cols-2 gap-3">
            {isLoading ? (
              <div className="col-span-2 flex h-32 items-center justify-center">
                <span className="text-gray-500">{t('editProvider.editSocial.loading')}</span>
              </div>
            ) : (
              filteredServices.map((service) => {
                const isSelected = selectedServiceIds.includes(service.community_service_id);
                const categoryName = service.category 
                  ? (language === 'en' ? (service.category.name_en || service.category.name_de || '') : (service.category.name_de || service.category.name_en || ''))
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

      {/* Save Button */}
      <FooterAction
        actionButton={{
          label: selectedServiceIds.length > 0 ? t('editProvider.editSocial.selected').replace('{{count}}', selectedServiceIds.length.toString()) : t('editProvider.editSocial.save'),
          icon: 'lucide:check',
          onClick: handleSave,
          variant: 'primary',
          'aria-label': t('editProvider.editSocial.saveAria'),
        }}
      />
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import type { Category } from '@/types/supabase';
import type { Provider } from '@/services/providers';
import { createProviderCommunityServiceRelationship } from '@/services/community_services';

interface ProviderEditFormProps {
  provider: Provider;
  onSave?: () => void;
}

export function ProviderEditForm({ provider, onSave }: ProviderEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    basics: true,
    location: true,
    contact: true,
    media: true,
  });
  const { user } = useAuth();
  const router = useRouter();

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Initialize form data from provider
  const [formData, setFormData] = useState({
    providerName: provider.provider_name || '',
    categoryId: provider.category_id || '',
    street: provider.address_street || '',
    zipCode: provider.address_zip || '',
    city: provider.address_city || '',
    country: provider.address_country || 'Deutschland',
    isOnlineBusiness: !provider.address_city && !provider.address_zip, // If no address, assume online
    showAddress: provider.show_address !== undefined ? provider.show_address : true,
    website: provider.social_website || '',
    instagram: provider.social_instagram || '',
    email: provider.contact_email || '',
    phone: provider.contact_phone || '',
    images: provider.provider_images || '[]',
    selectedOfferIds: provider.offers_ids || [],
    selectedNeedIds: provider.needs_ids || [],
    selectedCommunityServiceIds: [], // Will be populated from relationships
  });

  // Load selected category from localStorage when returning from selection page
  useEffect(() => {
    const stored = localStorage.getItem(`edit_category_${provider.provider_id}`);
    if (stored && stored !== formData.categoryId) {
      handleInputChange('categoryId', stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.provider_id]);

  // Load selected offers from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`edit_offers_${provider.provider_id}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (JSON.stringify(parsed) !== JSON.stringify(formData.selectedOfferIds)) {
        handleInputChange('selectedOfferIds', parsed);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.provider_id]);

  // Load selected needs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`edit_needs_${provider.provider_id}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (JSON.stringify(parsed) !== JSON.stringify(formData.selectedNeedIds)) {
        handleInputChange('selectedNeedIds', parsed);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.provider_id]);

  // Load selected community services from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`edit_social_${provider.provider_id}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (JSON.stringify(parsed) !== JSON.stringify(formData.selectedCommunityServiceIds)) {
        handleInputChange('selectedCommunityServiceIds', parsed);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.provider_id]);

  // Load updated images from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`edit_images_${provider.provider_id}`);
    if (stored) {
      const storedImages = JSON.stringify(stored);
      if (storedImages !== formData.images) {
        handleInputChange('images', stored);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.provider_id]);

  useEffect(() => {
    // Load categories
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name_de');
        
        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    // Load current community service relationships
    const loadCommunityServices = async () => {
      try {
        const { data, error } = await supabase
          .from('provider_community_services')
          .select('community_service_id')
          .eq('provider_id', provider.provider_id);
        
        if (!error && data) {
          const serviceIds = data.map(rel => rel.community_service_id);
          handleInputChange('selectedCommunityServiceIds', serviceIds);
        }
      } catch (error) {
        console.error('Error loading community services:', error);
      }
    };

    loadCategories();
    loadCommunityServices();
  }, [provider.provider_id]);

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Du musst angemeldet sein');
      router.push('/signin');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update provider data
      const { error } = await supabase
        .from('providers')
        .update({
          provider_name: formData.providerName,
          category_id: formData.categoryId,
          // If online business, all address fields are null
          address_street: formData.isOnlineBusiness ? null : (formData.street || null),
          address_zip: formData.isOnlineBusiness ? null : (formData.zipCode || null),
          address_city: formData.isOnlineBusiness ? null : (formData.city || null),
          address_country: formData.isOnlineBusiness ? null : (formData.country || null),
          show_address: formData.isOnlineBusiness ? false : formData.showAddress,
          social_website: formData.website,
          social_instagram: formData.instagram,
          contact_email: formData.email,
          contact_phone: formData.phone,
          provider_images: formData.images,
          offers_ids: formData.selectedOfferIds,
          needs_ids: formData.selectedNeedIds,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_id', provider.provider_id);

      if (error) throw error;

      // Update community service relationships if changed
      if (formData.selectedCommunityServiceIds && formData.selectedCommunityServiceIds.length > 0) {
        // First, delete existing relationships
        await supabase
          .from('provider_community_services')
          .delete()
          .eq('provider_id', provider.provider_id);

        // Then create new relationships
        const relationshipPromises = formData.selectedCommunityServiceIds.map(serviceId =>
          createProviderCommunityServiceRelationship(provider.provider_id, serviceId)
        );
        
        await Promise.allSettled(relationshipPromises);
      } else {
        // If no services selected, delete all existing relationships
        await supabase
          .from('provider_community_services')
          .delete()
          .eq('provider_id', provider.provider_id);
      }

      
      if (onSave) {
        onSave();
      } else {
        router.push(`/profile/providers/${provider.provider_id}`);
      }
    } catch (error) {
      console.error('Error updating provider:', error);
      toast.error('Fehler beim Aktualisieren des Providers');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={handleSubmit}
    >
      {/* Form Fields - All on one page */}
      <div className="flex flex-1 flex-col gap-8 pt-8 pb-24">
        
        {/* Basics Section */}
        <div className="flex flex-col gap-4">
          <button
            className="flex items-center justify-between w-full pl-3 pr-2"
            type="button"
            onClick={() => toggleSection('basics')}
          >
            <h2 className="text-lg font-medium text-[#232323]">Basics</h2>
            <Icon 
              className={`h-6 w-6 text-[#232323] transition-transform ${expandedSections.basics ? 'rotate-180' : ''}`}
              icon="material-symbols:expand-more"
            />
          </button>
          
          {expandedSections.basics && (
            <div className="space-y-3">
            {/* Provider Name Field */}
            <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">Titel *</span>
                <input
                  required
                  className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                  placeholder="Titel eingeben"
                  type="text"
                  value={formData.providerName}
                  onChange={(e) => handleInputChange('providerName', e.target.value)}
                />
              </div>
            </div>

            {/* Category Field */}
            <div 
              className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm cursor-pointer"
              onClick={() => router.push(`/profile/providers/${provider.provider_id}/edit/category`)}
            >
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">Kategorie *</span>
                <span className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px]">
                  {categories.find(cat => cat.category_id === formData.categoryId)?.name_de || 'Kategorie auswählen'}
                </span>
              </div>
              <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:chevron-right" />
            </div>

            {/* Offers Field */}
            <div 
              className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm cursor-pointer"
              onClick={() => router.push(`/profile/providers/${provider.provider_id}/edit/offers`)}
            >
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">Was biete ich? *</span>
                <span className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px]">
                  {(formData.selectedOfferIds || []).length > 0 
                    ? `${(formData.selectedOfferIds || []).length} Angebote ausgewählt`
                    : 'Angebote auswählen'
                  }
                </span>
              </div>
              <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:chevron-right" />
            </div>

            {/* Needs Field */}
            <div 
              className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm cursor-pointer"
              onClick={() => router.push(`/profile/providers/${provider.provider_id}/edit/needs`)}
            >
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">Was suche ich?</span>
                <span className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px]">
                  {(formData.selectedNeedIds || []).length > 0 
                    ? `${(formData.selectedNeedIds || []).length} Bedürfnisse ausgewählt`
                    : 'Bedürfnisse auswählen'
                  }
                </span>
              </div>
              <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:chevron-right" />
            </div>
          </div>
          )}
        </div>

        {/* Location Section */}
        <div className="flex flex-col gap-4">
          <button
            className="flex items-center justify-between w-full pl-3 pr-2"
            type="button"
            onClick={() => toggleSection('location')}
          >
            <h2 className="text-lg font-medium text-[#232323]">Standort</h2>
            <Icon 
              className={`h-6 w-6 text-[#232323] transition-transform ${expandedSections.location ? 'rotate-180' : ''}`}
              icon="material-symbols:expand-more"
            />
          </button>
          
          {expandedSections.location && (
            <div className="space-y-3">
            {/* Online Business Toggle */}
            <div className="flex items-center justify-between w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#272727]">
                  Online-Geschäft
                </span>
                <span className="text-xs text-[#7A7A7A]">
                  Kein physischer Standort
                </span>
              </div>
              <button
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#589D96] focus:ring-offset-2 ${
                  formData.isOnlineBusiness ? 'bg-[#589D96]' : 'bg-gray-200'
                }`}
                type="button"
                onClick={() => {
                  const newIsOnline = !formData.isOnlineBusiness;
                  setFormData(prev => ({
                    ...prev,
                    isOnlineBusiness: newIsOnline,
                    // If switching to online, clear address fields and set showAddress to false
                    ...(newIsOnline && {
                      street: '',
                      zipCode: '',
                      city: '',
                      country: '',
                      showAddress: false
                    })
                  }));
                }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.isOnlineBusiness ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Form Fields - only shown if not online business */}
            {!formData.isOnlineBusiness ? (
              <>
                {/* Street Field */}
                <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">Straße</span>
                    <input
                      className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                      placeholder="Straße eingeben"
                      type="text"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                    />
                  </div>
                </div>

                {/* ZIP Code Field */}
                <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">PLZ</span>
                    <input
                      className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                      placeholder="PLZ eingeben"
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    />
                  </div>
                </div>

                {/* City Field */}
                <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">Stadt *</span>
                    <input
                      required
                      className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                      placeholder="Stadt eingeben"
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                </div>

                {/* Country Field */}
                <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">Land *</span>
                    <input
                      required
                      className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                      placeholder="Land eingeben"
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                    />
                  </div>
                </div>

                {/* Show Address Toggle */}
                <div className="flex items-center justify-between w-full py-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[#272727]">
                      Adresse anzeigen
                    </span>
                    <span className="text-xs text-[#7A7A7A]">
                      Andere können deine Adresse sehen
                    </span>
                  </div>
                  <button
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#589D96] focus:ring-offset-2 ${
                      formData.showAddress ? 'bg-[#589D96]' : 'bg-gray-200'
                    }`}
                    type="button"
                    onClick={() => handleInputChange('showAddress', !formData.showAddress)}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.showAddress ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </>
            ) : (
              /* Online Business State */
              <div className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl border border-[#D4D4D4] bg-white">
                <Icon className="h-12 w-12 text-[#589D96] mb-3" icon="mdi:web" />
                <p className="text-sm font-medium text-[#272727] text-center mb-1">
                  Online-Geschäft
                </p>
                <p className="text-xs text-[#7A7A7A] text-center">
                  Dein Geschäft wird als &ldquo;Online&rdquo; angezeigt
                </p>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="flex flex-col gap-4">
          <button
            className="flex items-center justify-between w-full pl-3 pr-2"
            type="button"
            onClick={() => toggleSection('contact')}
          >
            <h2 className="text-lg font-medium text-[#232323]">Kontakt</h2>
            <Icon 
              className={`h-6 w-6 text-[#232323] transition-transform ${expandedSections.contact ? 'rotate-180' : ''}`}
              icon="material-symbols:expand-more"
            />
          </button>
          
          {expandedSections.contact && (
            <div className="space-y-3">
            {/* Website Field */}
            <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">Website</span>
                <input
                  className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                  placeholder="Website eingeben"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                />
              </div>
            </div>

            {/* Instagram Field */}
            <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">Instagram</span>
                <input
                  className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                  placeholder="@username"
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => handleInputChange('instagram', e.target.value)}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">E-Mail</span>
                <input
                  className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                  placeholder="E-Mail eingeben"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>

            {/* Phone Field */}
            <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">Telefon</span>
                <input
                  className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                  placeholder="Telefon eingeben"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Media Section */}
        <div className="flex flex-col gap-4">
          <button
            className="flex items-center justify-between w-full pl-3 pr-2"
            type="button"
            onClick={() => toggleSection('media')}
          >
            <h2 className="text-lg font-medium text-[#232323]">Media</h2>
            <Icon 
              className={`h-6 w-6 text-[#232323] transition-transform ${expandedSections.media ? 'rotate-180' : ''}`}
              icon="material-symbols:expand-more"
            />
          </button>
          
          {expandedSections.media && (
            <div className="space-y-3">
            {/* Bilder Field */}
            <button
              className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm hover:bg-gray-50 transition-colors"
              type="button"
              onClick={() => router.push(`/profile/providers/${provider.provider_id}/edit/images`)}
            >
              <div className="flex flex-1 flex-col gap-1 items-start">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">Bilder</span>
                <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left break-words">
                  {(() => {
                    try {
                      const images = formData.images ? JSON.parse(formData.images) : { urls: [] };
                      const imageCount = images.urls?.length || 0;
                      return imageCount > 0 ? `${imageCount} Bilder ausgewählt` : 'Bilder hochladen';
                    } catch {
                      return 'Bilder hochladen';
                    }
                  })()}
                </div>
              </div>
              <div className="flex items-center justify-center ml-2 flex-shrink-0 self-center">
                <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
              </div>
            </button>

            {/* Soziale Initiativen Field */}
            <button
              className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm hover:bg-gray-50 transition-colors"
              type="button"
              onClick={() => router.push(`/profile/providers/${provider.provider_id}/edit/social`)}
            >
              <div className="flex flex-1 flex-col gap-1 items-start">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">Soziale Initiativen</span>
                <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left break-words">
                  {(formData.selectedCommunityServiceIds || []).length > 0 
                    ? `${(formData.selectedCommunityServiceIds || []).length} Initiativen ausgewählt`
                    : 'Initiativen auswählen'
                  }
                </div>
              </div>
              <div className="flex items-center justify-center ml-2 flex-shrink-0 self-center">
                <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
              </div>
            </button>
          </div>
          )}
        </div>
      </div>

      {/* Save Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200/30 px-4 py-4">
        <div className="flex w-full gap-3.5 max-w-[393px] mx-auto">
          <button
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#589D96] text-base font-semibold text-white transition hover:bg-[#4a8a84] disabled:opacity-30"
            disabled={isSubmitting}
            type="submit"
          >
            Änderungen speichern
          </button>
        </div>
      </div>
    </form>
  );
}
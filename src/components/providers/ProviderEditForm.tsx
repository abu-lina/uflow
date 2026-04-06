'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { supabase } from '@/lib/supabase/client';
import type { Category } from '@/types/supabase';
import type { Provider } from '@/services/providers';
import { createProviderCommunityServiceRelationship } from '@/services/communityServices';
import { Button } from '@/components/ui/Button';
import { FooterAction } from '@/components/ui/FooterAction';
import { normalizeWebsiteUrl } from '@/utils/navigationUtils';

interface ProviderEditFormProps {
  provider: Provider;
  onSave?: () => void;
  /** Custom submit handler — when provided, replaces the built-in Supabase write. */
  onSubmitForm?: (data: ProviderEditFormData) => Promise<void>;
  /** Base URL for sub-page navigation (category, offers, needs, images, social).
   *  Defaults to `/profile/providers/${provider.provider_id}/edit`. */
  subPageBaseUrl?: string;
  /** Whether to read/write localStorage for sub-page state.
   *  Set to false in admin context to avoid stale owner state. Defaults to true. */
  enableLocalStorage?: boolean;
  /** Key prefix for localStorage draft state.
   *  Use 'admin_' in admin context to isolate from owner draft state. Defaults to ''. */
  localStoragePrefix?: string;
  /** Optional custom moderation footer actions for admin review flows. */
  reviewFooterActions?: {
    reject: ProviderEditFooterAction;
    approve: ProviderEditFooterAction;
  };
  /** When true, hides the "Soziale Initiativen" button in the Media section.
   *  Used by the community service edit adapter (D9) since CS are the initiatives themselves.
   *  Defaults to false — existing provider edit flows are unaffected. */
  hideSocialInitiatives?: boolean;
}

interface ProviderEditFooterAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'cancel';
  onClick: (data: ProviderEditFormData) => Promise<void>;
  'aria-label'?: string;
}

/** Exported form data shape so external save handlers can type their inputs. */
export interface ProviderEditFormData {
  providerName: string;
  providerDescription: string;
  categoryId: string;
  street: string;
  zipCode: string;
  city: string;
  country: string;
  isOnlineBusiness: boolean;
  showAddress: boolean;
  website: string;
  instagram: string;
  email: string;
  phone: string;
  images: string;
  selectedOfferIds: string[];
  selectedNeedIds: string[];
  selectedCommunityServiceIds: string[];
}

export function ProviderEditForm({
  provider,
  onSave,
  onSubmitForm,
  subPageBaseUrl,
  enableLocalStorage = true,
  localStoragePrefix = '',
  reviewFooterActions,
  hideSocialInitiatives = false,
}: ProviderEditFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const websiteInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFooterAction, setActiveFooterAction] = useState<'reject' | 'approve' | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    basics: true,
    location: true,
    contact: true,
    media: true,
  });
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  // Compute edit sub-page base URL (admin vs owner context)
  const editBaseUrl = subPageBaseUrl ?? `/profile/providers/${provider.provider_id}/edit`;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Initialize form data from provider
  const [formData, setFormData] = useState<ProviderEditFormData>({
    providerName: provider.provider_name || '',
    providerDescription: (provider as unknown as Record<string, unknown>).provider_description as string || provider.description || '',
    categoryId: provider.category_id || '',
    street: provider.address_street || '',
    zipCode: provider.address_zip || '',
    city: provider.address_city || '',
    country: provider.address_country || '',
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

  // Sync form state from localStorage (runs on mount + when page regains focus after sub-page navigation)
  const syncFromLocalStorage = useCallback(() => {
    if (!enableLocalStorage) return;
    const pid = provider.provider_id;
    const pfx = localStoragePrefix;

    const storedCategory = localStorage.getItem(`${pfx}edit_category_${pid}`);
    if (storedCategory) {
      setFormData(prev => prev.categoryId !== storedCategory ? { ...prev, categoryId: storedCategory } : prev);
    }

    const storedOffers = localStorage.getItem(`${pfx}edit_offers_${pid}`);
    if (storedOffers) {
      const parsed = JSON.parse(storedOffers) as string[];
      setFormData(prev => JSON.stringify(prev.selectedOfferIds) !== storedOffers ? { ...prev, selectedOfferIds: parsed } : prev);
    }

    const storedNeeds = localStorage.getItem(`${pfx}edit_needs_${pid}`);
    if (storedNeeds) {
      const parsed = JSON.parse(storedNeeds) as string[];
      setFormData(prev => JSON.stringify(prev.selectedNeedIds) !== storedNeeds ? { ...prev, selectedNeedIds: parsed } : prev);
    }

    const storedSocial = localStorage.getItem(`${pfx}edit_social_${pid}`);
    if (storedSocial) {
      const parsed = JSON.parse(storedSocial) as string[];
      setFormData(prev => JSON.stringify(prev.selectedCommunityServiceIds) !== storedSocial ? { ...prev, selectedCommunityServiceIds: parsed } : prev);
    }

    const storedImages = localStorage.getItem(`${pfx}edit_images_${pid}`);
    if (storedImages) {
      setFormData(prev => prev.images !== storedImages ? { ...prev, images: storedImages } : prev);
    }
  }, [enableLocalStorage, localStoragePrefix, provider.provider_id]);

  // Run on mount
  useEffect(() => {
    syncFromLocalStorage();
  }, [syncFromLocalStorage]);

  // Re-sync when user navigates back from sub-page (page regains visibility)
  useEffect(() => {
    if (!enableLocalStorage) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncFromLocalStorage();
      }
    };
    const handleFocus = () => syncFromLocalStorage();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
    };
  }, [enableLocalStorage, syncFromLocalStorage]);

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
    const normalizedWebsite = normalizeWebsiteUrl(formData.website) ?? '';
    const submitData = normalizedWebsite !== formData.website
      ? { ...formData, website: normalizedWebsite }
      : formData;

    if (normalizedWebsite !== formData.website) {
      setFormData(submitData);
    }

    // Admin review footer uses explicit approve/reject actions instead of generic form submit.
    if (reviewFooterActions) {
      return;
    }
    
    // If a custom submit handler is provided (admin context), use it
    if (onSubmitForm) {
      setIsSubmitting(true);
      try {
        await onSubmitForm(submitData);
      } catch (error) {
        // External handler is responsible for its own error toast
        console.error('Error updating provider:', error);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Default owner submit path
    if (!user) {
      toast.error(t('editProvider.mustBeLoggedIn'));
      router.push('/signin');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update provider data
      const { error } = await supabase
        .from('providers')
        .update({
          provider_name: submitData.providerName,
          provider_description: submitData.providerDescription || null,
          category_id: submitData.categoryId,
          // If online business, all address fields are null
          address_street: submitData.isOnlineBusiness ? null : (submitData.street || null),
          address_zip: submitData.isOnlineBusiness ? null : (submitData.zipCode || null),
          address_city: submitData.isOnlineBusiness ? null : (submitData.city || null),
          address_country: submitData.isOnlineBusiness ? null : (submitData.country || null),
          show_address: submitData.isOnlineBusiness ? false : submitData.showAddress,
          social_website: submitData.website || null,
          social_instagram: submitData.instagram,
          contact_email: submitData.email,
          contact_phone: submitData.phone,
          provider_images: submitData.images,
          offers_ids: submitData.selectedOfferIds,
          needs_ids: submitData.selectedNeedIds,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_id', provider.provider_id);

      if (error) throw error;

      // Update community service relationships if changed
      if (submitData.selectedCommunityServiceIds && submitData.selectedCommunityServiceIds.length > 0) {
        // First, delete existing relationships
        await supabase
          .from('provider_community_services')
          .delete()
          .eq('provider_id', provider.provider_id);

        // Then create new relationships
        const relationshipPromises = submitData.selectedCommunityServiceIds.map(serviceId =>
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
      toast.error(t('editProvider.errorUpdating'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewFooterAction = async (
    actionKey: 'reject' | 'approve',
    action: ProviderEditFooterAction
  ) => {
    if (isSubmitting) return;
    const normalizedWebsite = normalizeWebsiteUrl(formData.website) ?? '';
    const submitData = normalizedWebsite !== formData.website
      ? { ...formData, website: normalizedWebsite }
      : formData;

    if (normalizedWebsite !== formData.website) {
      if (websiteInputRef.current) {
        websiteInputRef.current.value = normalizedWebsite;
      }
      setFormData(submitData);
    }

    if (formRef.current && !formRef.current.reportValidity()) {
      return;
    }

    setIsSubmitting(true);
    setActiveFooterAction(actionKey);
    try {
      await action.onClick(submitData);
    } catch (error) {
      console.error('Error submitting moderation action:', error);
    } finally {
      setActiveFooterAction(null);
      setIsSubmitting(false);
    }
  };

  return (
    <form
      ref={formRef}
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
            <h2 className="text-lg font-medium text-[#232323]">{t('editProvider.basics')}</h2>
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
                <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.titleField')} *</span>
                <input
                  required
                  className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                  placeholder={t('editProvider.titlePlaceholder')}
                  type="text"
                  value={formData.providerName}
                  onChange={(e) => handleInputChange('providerName', e.target.value)}
                />
              </div>
            </div>

            {/* Description Field */}
            <div className="flex w-full min-h-[80px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.description')}</span>
                <textarea
                  className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0 resize-none min-h-[40px]"
                  placeholder={t('editProvider.descriptionPlaceholder')}
                  rows={3}
                  value={formData.providerDescription}
                  onChange={(e) => handleInputChange('providerDescription', e.target.value)}
                />
              </div>
            </div>

            {/* Category Field */}
            <div 
              className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm cursor-pointer"
              onClick={() => router.push(`${editBaseUrl}/category`)}
            >
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.category')} *</span>
                <span className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px]">
                  {(() => {
                    const category = categories.find(cat => cat.category_id === formData.categoryId);
                    if (!category) return t('providers.selectCategory');
                    return language === 'en' ? (category.name_en || category.name_de) : category.name_de;
                  })()}
                </span>
              </div>
              <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:chevron-right" />
            </div>

            {/* Offers Field */}
            <div 
              className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm cursor-pointer"
              onClick={() => router.push(`${editBaseUrl}/offers`)}
            >
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.whatDoIOffer')} *</span>
                <span className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px]">
                  {(formData.selectedOfferIds || []).length > 0 
                    ? t('editProvider.offersSelected').replace('{{count}}', (formData.selectedOfferIds || []).length.toString())
                    : t('editProvider.selectOffers')
                  }
                </span>
              </div>
              <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:chevron-right" />
            </div>

            {/* Needs Field */}
            <div 
              className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm cursor-pointer"
              onClick={() => router.push(`${editBaseUrl}/needs`)}
            >
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.whatDoINeed')}</span>
                <span className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px]">
                  {(formData.selectedNeedIds || []).length > 0 
                    ? t('editProvider.needsSelected').replace('{{count}}', (formData.selectedNeedIds || []).length.toString())
                    : t('editProvider.selectNeeds')
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
            <h2 className="text-lg font-medium text-[#232323]">{t('editProvider.location')}</h2>
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
                  {t('editProvider.onlineBusiness')}
                </span>
                <span className="text-xs text-[#7A7A7A]">
                  {t('editProvider.noPhysicalLocation')}
                </span>
              </div>
              <button
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  formData.isOnlineBusiness ? 'bg-primary' : 'bg-gray-200'
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
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.street')}</span>
                    <input
                      className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                      placeholder={t('editProvider.streetPlaceholder')}
                      type="text"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                    />
                  </div>
                </div>

                {/* ZIP Code Field */}
                <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.zipCode')}</span>
                    <input
                      className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                      placeholder={t('editProvider.zipCodePlaceholder')}
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    />
                  </div>
                </div>

                {/* City Field */}
                <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.city')} *</span>
                    <input
                      required
                      className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                      placeholder={t('editProvider.cityPlaceholder')}
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                </div>

                {/* Country Field */}
                <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.country')} *</span>
                    <input
                      required
                      className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                      placeholder={t('editProvider.countryPlaceholder')}
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Online Business State */
              <div className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl border border-[#D4D4D4] bg-white">
                <Icon className="h-12 w-12 text-primary mb-3" icon="mdi:web" />
                <p className="text-sm font-medium text-[#272727] text-center mb-1">
                  {t('editProvider.onlineBusiness')}
                </p>
                <p className="text-xs text-[#7A7A7A] text-center">
                  {t('editProvider.onlineBusinessDisplay')}
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
            <h2 className="text-lg font-medium text-[#232323]">{t('editProvider.contact')}</h2>
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
                <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.website')}</span>
                <input
                  ref={websiteInputRef}
                  className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                  placeholder={t('editProvider.websitePlaceholder')}
                  type="url"
                  value={formData.website}
                  onBlur={() => {
                    const normalizedWebsite = normalizeWebsiteUrl(formData.website) ?? '';
                    if (normalizedWebsite !== formData.website) {
                      handleInputChange('website', normalizedWebsite);
                    }
                  }}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                />
              </div>
            </div>

            {/* Instagram Field */}
            <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.instagram')}</span>
                <input
                  className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                  placeholder={t('editProvider.instagramPlaceholder')}
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => handleInputChange('instagram', e.target.value)}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.email')}</span>
                <input
                  className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                  placeholder={t('editProvider.emailPlaceholder')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>

            {/* Phone Field */}
            <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.phone')}</span>
                <input
                  className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                  placeholder={t('editProvider.phonePlaceholder')}
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
            <h2 className="text-lg font-medium text-[#232323]">{t('editProvider.media')}</h2>
            <Icon 
              className={`h-6 w-6 text-[#232323] transition-transform ${expandedSections.media ? 'rotate-180' : ''}`}
              icon="material-symbols:expand-more"
            />
          </button>
          
          {expandedSections.media && (
            <div className="space-y-3">
            {/* Bilder Field */}
            <button
              className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm transition-colors hover:bg-gray-50"
              type="button"
              onClick={() => router.push(`${editBaseUrl}/images`)}
            >
              <div className="flex flex-1 flex-col gap-1 items-start">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.images')}</span>
                <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left break-words">
                  {(() => {
                    try {
                      const images = formData.images ? JSON.parse(formData.images) : { urls: [] };
                      const imageCount = images.urls?.length || 0;
                      return imageCount > 0 ? t('editProvider.imagesSelected').replace('{{count}}', imageCount.toString()) : t('editProvider.uploadImages');
                    } catch {
                      return t('editProvider.uploadImages');
                    }
                  })()}
                </div>
              </div>
              <div className="flex items-center justify-center ml-2 flex-shrink-0 self-center">
                <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
              </div>
            </button>

            {/* Soziale Initiativen Field — hidden for community service edit (D9) */}
            {!hideSocialInitiatives && <button
              className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm transition-colors hover:bg-gray-50"
              type="button"
              onClick={() => router.push(`${editBaseUrl}/social`)}
            >
              <div className="flex flex-1 flex-col gap-1 items-start">
                <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.socialInitiatives')}</span>
                <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left break-words">
                  {(formData.selectedCommunityServiceIds || []).length > 0 
                    ? t('editProvider.initiativesSelected').replace('{{count}}', (formData.selectedCommunityServiceIds || []).length.toString())
                    : t('editProvider.selectInitiatives')
                  }
                </div>
              </div>
              <div className="flex items-center justify-center ml-2 flex-shrink-0 self-center">
                <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
              </div>
            </button>}
          </div>
          )}
        </div>
      </div>

      {reviewFooterActions ? (
        <footer
          className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-border/30 bg-gradient-to-b from-neutral-50 to-neutral-50 backdrop-blur-[20px]"
          style={{
            background: 'linear-gradient(to bottom, #f5f5f5 0%, #fbfbfb 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04), 0 -1px 2px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div className="flex w-full gap-3.5 px-6 pt-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <Button
              fullWidth
              aria-label={reviewFooterActions.reject['aria-label'] || reviewFooterActions.reject.label}
              className="!h-[48px] !min-h-[48px] !max-h-[48px]"
              disabled={isSubmitting}
              loading={isSubmitting && activeFooterAction === 'reject'}
              loadingText={reviewFooterActions.reject.label}
              variant={reviewFooterActions.reject.variant || 'danger'}
              onClick={() => {
                void handleReviewFooterAction('reject', reviewFooterActions.reject);
              }}
            >
              {reviewFooterActions.reject.label}
            </Button>
            <Button
              fullWidth
              aria-label={reviewFooterActions.approve['aria-label'] || reviewFooterActions.approve.label}
              className="!h-[48px] !min-h-[48px] !max-h-[48px]"
              disabled={isSubmitting}
              loading={isSubmitting && activeFooterAction === 'approve'}
              loadingText={reviewFooterActions.approve.label}
              variant={reviewFooterActions.approve.variant || 'success'}
              onClick={() => {
                void handleReviewFooterAction('approve', reviewFooterActions.approve);
              }}
            >
              {reviewFooterActions.approve.label}
            </Button>
          </div>
        </footer>
      ) : (
        <FooterAction
          primaryButton={{
            label: t('editProvider.save'),
            icon: 'material-symbols:save-outline',
            onClick: () => {
              // Trigger form submission
              if (formRef.current && !isSubmitting) {
                formRef.current.requestSubmit();
              }
            },
            variant: 'primary',
            disabled: isSubmitting,
            loading: isSubmitting,
            'aria-label': t('editProvider.saveChanges'),
          }}
          secondaryButton={{
            icon: 'material-symbols:close',
            onClick: () => {
              // Discard changes and go back
              router.back();
            },
            'aria-label': t('editProvider.discardChanges'),
          }}
        />
      )}
    </form>
  );
}
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
// M-5a: createProviderCommunityServiceRelationship removed (community_services table dropped)
import { Button } from '@/components/ui/Button';
import { FooterAction } from '@/components/ui/FooterAction';
import { normalizeWebsiteUrl } from '@/utils/navigationUtils';

interface ProviderEditFormProps {
  provider: Provider;
  onSave?: () => void;
  /** Custom submit handler — when provided, replaces the built-in Supabase write. */
  onSubmitForm?: (data: ProviderEditFormData) => Promise<void>;
  /** Base URL for sub-page navigation (category, images, social, menu, etc.).
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
  listingType: 'food' | 'store' | 'ummah' | null;
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
  selectedCommunityServiceIds: string[];
  menuItems: Array<{
    id?: string;
    name_de: string;
    name_en?: string;
    description_de?: string;
    price_cents: number;
    category?: string;
    sort_order: number;
    is_available: boolean;
  }>;
  deliveryLinks: Array<{
    platform: 'wolt' | 'lieferando' | 'ubereats';
    platform_url: string;
    platform_slug?: string;
    is_active: boolean;
  }>;
  locations: Array<{
    location_id: string;
    location_name: string | null;
    address_street: string | null;
    address_zip: string | null;
    address_city: string | null;
    address_country: string | null;
    contact_phone: string | null;
    show_address: boolean;
    is_primary: boolean;
  }>;
  openingHours: Record<string, { open: string; close: string } | null> | null;
  verificationMethod: string | null;
  hasCertificate: boolean;
  certificateUrl: string | null;
  noAlcohol: boolean;
  noPork: boolean;
  noGambling: boolean;
  muslimOwned: boolean;
  hasPrayerSpace: boolean;
  familyFriendly: boolean;
  womenFriendly: boolean;
  childrenFriendly: boolean;
  makesDonations: boolean;
  hasParking: boolean;
  economicSolidarity: boolean;
  reviewStatus?: string;
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basics: true,
    location: true,
    contact: true,
    media: true,
    providerDetails: true,
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
    listingType: provider.listing_type ?? null,
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
    images: typeof provider.provider_images === 'string' ? (provider.provider_images || '[]') : JSON.stringify(provider.provider_images || {}),
    selectedCommunityServiceIds: [], // Will be populated from relationships
    menuItems: [],
    deliveryLinks: [],
    locations: [],
    openingHours: (provider as unknown as Record<string, unknown>).opening_hours as Record<string, { open: string; close: string } | null> | null ?? null,
    verificationMethod: (provider as unknown as Record<string, unknown>).verification_method as string | null ?? null,
    hasCertificate: (provider as unknown as Record<string, unknown>).has_certificate as boolean ?? false,
    certificateUrl: (provider as unknown as Record<string, unknown>).certificate_url as string | null ?? null,
    noAlcohol: false,
    noPork: false,
    noGambling: false,
    reviewStatus: provider.review_status || 'pending',
    muslimOwned: (provider as unknown as Record<string, unknown>).muslim_owned as boolean ?? false,
    hasPrayerSpace: (provider as unknown as Record<string, unknown>).has_prayer_space as boolean ?? false,
    familyFriendly: (provider as unknown as Record<string, unknown>).family_friendly as boolean ?? false,
    womenFriendly: (provider as unknown as Record<string, unknown>).women_friendly as boolean ?? false,
    childrenFriendly: (provider as unknown as Record<string, unknown>).children_friendly as boolean ?? false,
    makesDonations: (provider as unknown as Record<string, unknown>).makes_donations as boolean ?? false,
    hasParking: (provider as unknown as Record<string, unknown>).has_parking as boolean ?? false,
    economicSolidarity: (provider as unknown as Record<string, unknown>).economic_solidarity as boolean ?? false,
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

    const storedSocial = localStorage.getItem(`${pfx}edit_social_${pid}`);
    if (storedSocial) {
      const parsed = JSON.parse(storedSocial) as string[];
      setFormData(prev => JSON.stringify(prev.selectedCommunityServiceIds) !== storedSocial ? { ...prev, selectedCommunityServiceIds: parsed } : prev);
    }

    const storedImages = localStorage.getItem(`${pfx}edit_images_${pid}`);
    if (storedImages) {
      setFormData(prev => prev.images !== storedImages ? { ...prev, images: storedImages } : prev);
    }

    const storedMenu = localStorage.getItem(`${pfx}edit_menu_${pid}`);
    if (storedMenu) {
      try {
        const parsed = JSON.parse(storedMenu);
        if (Array.isArray(parsed)) setFormData(prev => ({ ...prev, menuItems: parsed }));
      } catch { /* ignore */ }
    }

    const storedDelivery = localStorage.getItem(`${pfx}edit_delivery_${pid}`);
    if (storedDelivery) {
      try {
        const parsed = JSON.parse(storedDelivery);
        if (Array.isArray(parsed)) setFormData(prev => ({ ...prev, deliveryLinks: parsed }));
      } catch { /* ignore */ }
    }

    const storedLocations = localStorage.getItem(`${pfx}edit_locations_${pid}`);
    if (storedLocations) {
      try {
        const parsed = JSON.parse(storedLocations);
        if (Array.isArray(parsed)) setFormData(prev => ({ ...prev, locations: parsed }));
      } catch { /* ignore */ }
    }

    const storedHours = localStorage.getItem(`${pfx}edit_hours_${pid}`);
    if (storedHours) {
      try {
        setFormData(prev => ({ ...prev, openingHours: JSON.parse(storedHours) }));
      } catch { /* ignore */ }
    }

    const storedHalal = localStorage.getItem(`${pfx}edit_halal_${pid}`);
    if (storedHalal) {
      try {
        const parsed = JSON.parse(storedHalal);
        setFormData(prev => ({
          ...prev,
          verificationMethod: parsed.verificationMethod || null,
          hasCertificate: parsed.hasCertificate ?? prev.hasCertificate,
          certificateUrl: parsed.certificateUrl ?? prev.certificateUrl,
          noAlcohol: parsed.noAlcohol ?? prev.noAlcohol,
          noPork: parsed.noPork ?? prev.noPork,
          noGambling: parsed.noGambling ?? prev.noGambling,
        }));
      } catch { /* ignore */ }
    }

    const storedValues = localStorage.getItem(`${pfx}edit_values_${pid}`);
    if (storedValues) {
      try {
        const parsed = JSON.parse(storedValues);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch { /* ignore */ }
    }

    const storedInline = localStorage.getItem(`${pfx}edit_inline_${pid}`);
    if (storedInline) {
      try {
        const parsed = JSON.parse(storedInline);
        setFormData(prev => ({
          ...prev,
          providerName: parsed.providerName || prev.providerName,
          providerDescription: parsed.providerDescription || prev.providerDescription,
          listingType: parsed.listingType || prev.listingType,
          street: parsed.street || prev.street,
          zipCode: parsed.zipCode || prev.zipCode,
          city: parsed.city || prev.city,
          country: parsed.country || prev.country,
          isOnlineBusiness: !(parsed.city || prev.city) && !(parsed.zipCode || prev.zipCode),
          showAddress: parsed.showAddress || prev.showAddress,
          website: parsed.website || prev.website,
          instagram: parsed.instagram || prev.instagram,
          email: parsed.email || prev.email,
          phone: parsed.phone || prev.phone,
          reviewStatus: parsed.reviewStatus || prev.reviewStatus,
        }));
        // Guard: if isOnlineBusiness contradicts populated address data, reset
        if (parsed.isOnlineBusiness === true && (parsed.city || provider.address_city || parsed.zipCode || provider.address_zip)) {
          setFormData(prev => ({ ...prev, isOnlineBusiness: false }));
        }
      } catch { /* ignore */ }
    }
  }, [enableLocalStorage, localStoragePrefix, provider.provider_id]);

  const saveInlineDataToLocalStorage = useCallback(() => {
    if (!enableLocalStorage) return;
    const pid = provider.provider_id;
    const pfx = localStoragePrefix;
    const inlineData = {
      providerName: formData.providerName,
      providerDescription: formData.providerDescription,
      listingType: formData.listingType,
      street: formData.street,
      zipCode: formData.zipCode,
      city: formData.city,
      country: formData.country,
      isOnlineBusiness: formData.isOnlineBusiness,
      showAddress: formData.showAddress,
      website: formData.website,
      instagram: formData.instagram,
      email: formData.email,
      phone: formData.phone,
      reviewStatus: formData.reviewStatus,
    };
    localStorage.setItem(`${pfx}edit_inline_${pid}`, JSON.stringify(inlineData));
  }, [enableLocalStorage, localStoragePrefix, provider.provider_id, formData]);

  const saveInlineDataAndNavigate = useCallback((url: string) => {
    saveInlineDataToLocalStorage();
    router.push(url);
  }, [saveInlineDataToLocalStorage, router]);

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
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handleVisibility);
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

    // Load current community service relationships via provider_engagements
    const loadCommunityServices = async () => {
      try {
        // M-5a: provider_community_services dropped; use provider_engagements
        const { data, error } = await supabase
          .from('provider_engagements')
          .select('engaged_provider_id')
          .eq('initiating_provider_id', provider.provider_id);
        
        if (!error && data) {
          const serviceIds = data.map((rel: { engaged_provider_id: string }) => rel.engaged_provider_id);
          handleInputChange('selectedCommunityServiceIds', serviceIds);
        }
      } catch (error) {
        console.error('Error loading community services:', error);
      }
    };

    loadCategories();
    loadCommunityServices();
  }, [provider.provider_id]);

  const handleInputChange = (field: string, value: string | boolean | string[] | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const normalizedWebsite = normalizeWebsiteUrl(formData.website) ?? '';
    const submitData = normalizedWebsite !== formData.website
      ? { ...formData, website: normalizedWebsite }
      : formData;

    if (normalizedWebsite !== formData.website) {
      setFormData(submitData);
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
          address_street: submitData.isOnlineBusiness && !submitData.street ? null : (submitData.street || null),
          address_zip: submitData.isOnlineBusiness && !submitData.zipCode ? null : (submitData.zipCode || null),
          address_city: submitData.isOnlineBusiness && !submitData.city ? null : (submitData.city || null),
          address_country: submitData.isOnlineBusiness && !submitData.country ? null : (submitData.country || null),
          show_address: submitData.isOnlineBusiness && !submitData.city ? false : submitData.showAddress,
          social_website: submitData.website || null,
          social_instagram: submitData.instagram,
          contact_email: submitData.email,
          contact_phone: submitData.phone,
          provider_images: submitData.images,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_id', provider.provider_id);

      if (error) throw error;

      // Update community service relationships via provider_engagements
      if (submitData.selectedCommunityServiceIds && submitData.selectedCommunityServiceIds.length > 0) {
        // Delete existing engagements
        await supabase
          .from('provider_engagements')
          .delete()
          .eq('initiating_provider_id', provider.provider_id);

        // Insert new engagements
        const rows = submitData.selectedCommunityServiceIds.map(serviceId => ({
          initiating_provider_id: provider.provider_id,
          engaged_provider_id: serviceId,
          engagement_type: 'support',
        }));
        await supabase.from('provider_engagements').insert(rows);
      } else {
        // Clear all engagements
        await supabase
          .from('provider_engagements')
          .delete()
          .eq('initiating_provider_id', provider.provider_id);
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

            {/* Plan 089 M8: Section (listing_type) field */}
            {(provider.listing_type !== undefined || reviewFooterActions) && (
              reviewFooterActions ? (
                <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="text-xs font-normal text-[#999999] leading-[15px]" htmlFor="provider-listing-type">
                      {t('editProvider.sectionFieldLabel')}
                    </label>
                    <select
                      aria-label={t('editProvider.sectionFieldLabel')}
                      className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] outline-none bg-transparent p-0"
                      id="provider-listing-type"
                      value={formData.listingType ?? ''}
                      onChange={(e) => handleInputChange('listingType', e.target.value === '' ? null : e.target.value)}
                    >
                      <option value="">{t('editProvider.sectionUnclassified')}</option>
                      <option value="food">{t('editProvider.sectionFood')}</option>
                      <option value="store">{t('editProvider.sectionBusiness')}</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-gray-50 px-3 py-2 shadow-sm">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('editProvider.sectionFieldLabel')}</span>
                    <span className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] capitalize">
                      {formData.listingType === 'food'
                        ? t('editProvider.sectionFood')
                        : formData.listingType === 'store'
                          ? t('editProvider.sectionBusiness')
                          : t('editProvider.sectionUnclassified')}
                    </span>
                  </div>
                </div>
              )
            )}

            {/* Review Status — admin only */}
            {reviewFooterActions && (
              <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-normal text-[#999999] leading-[15px]" htmlFor="review-status">
                    Review Status
                  </label>
                  <select
                    aria-label="Review Status"
                    className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] outline-none bg-transparent p-0"
                    id="review-status"
                    value={formData.reviewStatus ?? 'pending'}
                    onChange={(e) => handleInputChange('reviewStatus', e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="needs_revision">Needs Revision</option>
                  </select>
                </div>
              </div>
            )}

            {/* Category Field */}
            <div 
              className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm cursor-pointer"
              onClick={() => saveInlineDataAndNavigate(`${editBaseUrl}/category`)}
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

                {/* Locations Management */}
                <button
                  className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm transition-colors hover:bg-gray-50"
                  type="button"
                  onClick={() => saveInlineDataAndNavigate(`${editBaseUrl}/locations`)}
                >
                  <div className="flex flex-1 flex-col gap-1 items-start">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">Locations</span>
                    <div className="text-[15px] font-medium text-[#272727] leading-[18px]">
                      {formData.locations.length > 0
                        ? `${formData.locations.length} locations`
                        : 'Manage multiple locations'}
                    </div>
                  </div>
                  <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:chevron-right" />
                </button>
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
              onClick={() => saveInlineDataAndNavigate(`${editBaseUrl}/images`)}
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
              onClick={() => saveInlineDataAndNavigate(`${editBaseUrl}/social`)}
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

        {/* Provider Details Section */}
        <div className="flex flex-col gap-4">
          <button
            className="flex items-center justify-between w-full pl-3 pr-2"
            type="button"
            onClick={() => setExpandedSections(prev => ({ ...prev, providerDetails: !prev.providerDetails }))}
          >
            <h2 className="text-lg font-medium text-[#232323]">Provider Details</h2>
            <Icon 
              className={`h-6 w-6 text-[#232323] transition-transform ${expandedSections.providerDetails ? 'rotate-180' : ''}`}
              icon="material-symbols:expand-more"
            />
          </button>
          
          {expandedSections.providerDetails && (
            <div className="space-y-3">
              {/* Menu — only for food */}
              {formData.listingType === 'food' && (
                <button
                  className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm transition-colors hover:bg-gray-50"
                  type="button"
                  onClick={() => saveInlineDataAndNavigate(`${editBaseUrl}/menu`)}
                >
                  <div className="flex flex-1 flex-col gap-1 items-start">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">Menu</span>
                    <div className="text-[15px] font-medium text-[#272727] leading-[18px]">
                      {formData.menuItems.length > 0
                        ? `${formData.menuItems.length} items`
                        : 'Add dishes'}
                    </div>
                  </div>
                  <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:chevron-right" />
                </button>
              )}

              {/* Halal Check */}
              <button
                className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm transition-colors hover:bg-gray-50"
                type="button"
                onClick={() => saveInlineDataAndNavigate(`${editBaseUrl}/halal`)}
              >
                <div className="flex flex-1 flex-col gap-1 items-start">
                  <span className="text-xs font-normal text-[#999999] leading-[15px]">Halal Check</span>
                  <div className="text-[15px] font-medium text-[#272727] leading-[18px]">
                    {formData.hasCertificate ? 'Gold' : formData.verificationMethod === 'onsite' ? 'Silver' : formData.verificationMethod === 'online' ? 'Bronze' : 'Not set'}
                  </div>
                </div>
                <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:chevron-right" />
              </button>

              {/* Delivery / Order Links — conditional on listing type */}
              {(formData.listingType === 'food' || formData.listingType === 'store' || !formData.listingType) && (
                <button
                  className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm transition-colors hover:bg-gray-50"
                  type="button"
                  onClick={() => saveInlineDataAndNavigate(`${editBaseUrl}/delivery`)}
                >
                  <div className="flex flex-1 flex-col gap-1 items-start">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">
                      {formData.listingType === 'store' ? 'Order Links' : 'Delivery Links'}
                    </span>
                    <div className="text-[15px] font-medium text-[#272727] leading-[18px]">
                      {formData.deliveryLinks.length > 0
                        ? `${formData.deliveryLinks.length} links`
                        : formData.listingType === 'store' ? 'Add order platforms' : 'Add delivery platforms'}
                    </div>
                  </div>
                  <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:chevron-right" />
                </button>
              )}

              {/* Opening Hours */}
              <button
                className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm transition-colors hover:bg-gray-50"
                type="button"
                onClick={() => saveInlineDataAndNavigate(`${editBaseUrl}/hours`)}
              >
                <div className="flex flex-1 flex-col gap-1 items-start">
                  <span className="text-xs font-normal text-[#999999] leading-[15px]">Opening Hours</span>
                  <div className="text-[15px] font-medium text-[#272727] leading-[18px]">
                    {formData.openingHours && Object.values(formData.openingHours).some(v => v !== null)
                      ? 'Set'
                      : 'Set opening hours'}
                  </div>
                </div>
                <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:chevron-right" />
              </button>

              {/* Values & Amenities */}
              <button
                className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm transition-colors hover:bg-gray-50"
                type="button"
                onClick={() => saveInlineDataAndNavigate(`${editBaseUrl}/values`)}
              >
                <div className="flex flex-1 flex-col gap-1 items-start">
                  <span className="text-xs font-normal text-[#999999] leading-[15px]">Values & Amenities</span>
                  <div className="text-[15px] font-medium text-[#272727] leading-[18px]">
                    {(['muslimOwned', 'familyFriendly', 'womenFriendly', 'childrenFriendly', 'hasPrayerSpace', 'hasParking', 'makesDonations', 'economicSolidarity'] as const)
                      .filter(k => formData[k])
                      .length > 0
                      ? 'Configured'
                      : 'Set values & amenities'}
                  </div>
                </div>
                <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:chevron-right" />
              </button>

              {/* Enrichment Review — only in admin context */}
              {reviewFooterActions && (
                <button
                  className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm transition-colors hover:bg-gray-50"
                  type="button"
                  onClick={() => saveInlineDataAndNavigate(`${editBaseUrl}/enrichment`)}
                >
                  <div className="flex flex-1 flex-col gap-1 items-start">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">Enrichment Review</span>
                    <div className="text-[15px] font-medium text-[#272727] leading-[18px]">
                      Review enrichment candidates
                    </div>
                  </div>
                  <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:chevron-right" />
                </button>
              )}
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
          <div className="flex w-full gap-3.5 px-6 pt-4 md:max-w-2xl md:mx-auto" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <Button
              fullWidth
              className="!h-[48px] !min-h-[48px] !max-h-[48px]"
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText="Saving"
              variant="primary"
              onClick={() => {
                void handleSubmit();
              }}
            >
              Save
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
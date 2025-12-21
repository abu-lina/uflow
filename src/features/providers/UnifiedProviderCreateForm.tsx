'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/AddressAutocomplete';
import { validateAddress, validateZipCode } from '@/utils/addressValidation';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { useFormData } from '@/providers/form-provider';
import type { Category } from '@/types/supabase';
import type { Offer, Need } from '@/types/offer';
import { useLanguage } from '@/providers/LanguageProvider';
import { Button } from '@/components/ui/Button';
import { useQueryClient } from '@tanstack/react-query';

interface UnifiedProviderCreateFormProps {
  onSuccess?: () => void;
}

export function UnifiedProviderCreateForm({ onSuccess }: UnifiedProviderCreateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [showManualFields, setShowManualFields] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
  }>({});
  
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const { formData, updateFormData, clearFormData } = useFormData();

  const initialAddressValueRef = useRef({
    city: formData.city || '',
    country: formData.country || '',
    street: formData.street || '',
    zip: formData.zip || '',
  });

  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name_de', { ascending: true });
      if (!error && data) {
        setCategories(data);
      }
    }
    void fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchOffers() {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('name_de', { ascending: true });
      if (!error && data) {
        setOffers(data);
      }
    }
    void fetchOffers();
  }, []);

  useEffect(() => {
    async function fetchNeeds() {
      const { data, error } = await supabase
        .from('needs')
        .select('*')
        .order('name_de', { ascending: true });
      if (!error && data) {
        setNeeds(data);
      }
    }
    void fetchNeeds();
  }, []);

  const handleAddressSelect = useCallback((address: AddressComponents) => {
    updateFormData({
      city: address.city,
      country: address.country,
      street: address.street,
      zip: address.zip,
    });
    setValidationErrors({});
  }, [updateFormData]);

  const handleZipChange = (value: string) => {
    updateFormData({ zip: value });
    if (value && formData.country) {
      const zipError = validateZipCode(value, formData.country);
      if (zipError) {
        setValidationErrors(prev => ({ ...prev, zip: t('create.location.invalidZipCode') }));
      } else {
        setValidationErrors(prev => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { zip: _unused, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const validateField = (field: 'street' | 'zip' | 'city' | 'country') => {
    const validation = validateAddress({
      street: formData.street,
      zip: formData.zip,
      city: formData.city,
      country: formData.country,
      isOnlineBusiness: formData.isOnlineBusiness,
    });
    if (validation.errors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: validation.errors[field] }));
    } else {
      setValidationErrors(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [field]: _unused, ...rest } = prev;
        return rest;
      });
    }
  };

  const isFormValid = () => {
    if (formData.isOnlineBusiness) return true;
    const validation = validateAddress({
      street: formData.street,
      zip: formData.zip,
      city: formData.city,
      country: formData.country,
      isOnlineBusiness: formData.isOnlineBusiness,
    });
    return validation.isValid;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error(t('create.media.mustBeLoggedIn'));
      return;
    }

    // Validate location if not online business
    if (!formData.isOnlineBusiness) {
      const validation = validateAddress({
        street: formData.street,
        zip: formData.zip,
        city: formData.city,
        country: formData.country,
        isOnlineBusiness: formData.isOnlineBusiness,
      });
      setValidationErrors(validation.errors);
      if (!validation.isValid) {
        toast.error(t('create.location.validationError'));
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Upload images
      let uploadedUrls: string[] = [];
      const isCommunityService = formData.category === '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';
      const bucketName = isCommunityService ? 'community-service-images' : 'provider-images';
      const folderName = isCommunityService ? 'community-services' : 'providers';

      if (formData.images && formData.images.length > 0) {
        for (const imageFile of formData.images) {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${folderName}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, imageFile);

          if (uploadError) {
            console.error('Error uploading image:', uploadError);
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

          uploadedUrls.push(publicUrl);
        }
      }

      const isOwner = formData.creationMode === 'owner';

      if (isCommunityService) {
        const insertData = {
          community_service_name: formData.title,
          community_service_description: formData.description || null,
          address_street: formData.isOnlineBusiness ? null : (formData.street || null),
          address_zip: formData.isOnlineBusiness ? null : (formData.zip || null),
          address_city: formData.isOnlineBusiness ? null : (formData.city || null),
          address_country: formData.isOnlineBusiness ? null : (formData.country || null),
          show_address: formData.isOnlineBusiness ? false : (formData.showAddress !== undefined ? formData.showAddress : true),
          category_id: formData.category || null,
          contact_email: formData.email || null,
          contact_phone: formData.phone || null,
          social_website: formData.website || null,
          social_instagram: formData.instagram || null,
          barakah_effects: formData.tags || [],
          user_created_id: user.id,
          provider_id: isOwner ? user.id : null,
          community_service_images: uploadedUrls.length > 0 ? uploadedUrls : null,
          offers_ids: formData.offers_ids || [],
          needs_ids: formData.needs_ids || [],
          review_status: 'approved' as const,
        };

        const { data: createdService, error: serviceError } = await supabase
          .from('community_services')
          .insert([insertData])
          .select('community_service_id')
          .single();

        if (serviceError) {
          throw serviceError;
        }

        if (formData.selectedCommunityServiceIds && formData.selectedCommunityServiceIds.length > 0) {
          const relationships = formData.selectedCommunityServiceIds.map(serviceId => ({
            provider_id: createdService.community_service_id,
            community_service_id: serviceId
          }));
          
          const { error: relationshipError } = await supabase
            .from('provider_community_services')
            .insert(relationships);
          
          if (relationshipError) {
            console.error('Error creating provider-community service relationships:', relationshipError);
          }
        }

        toast.success(t('create.media.providerCreated'));
      } else {
        const insertData = {
          provider_name: formData.title,
          provider_description: formData.description || null,
          address_street: formData.isOnlineBusiness ? null : (formData.street || null),
          address_zip: formData.isOnlineBusiness ? null : (formData.zip || null),
          address_city: formData.isOnlineBusiness ? null : (formData.city || null),
          address_country: formData.isOnlineBusiness ? null : (formData.country || null),
          show_address: formData.isOnlineBusiness ? false : (formData.showAddress !== undefined ? formData.showAddress : true),
          category_id: formData.category || null,
          contact_email: formData.email || null,
          contact_phone: formData.phone || null,
          social_website: formData.website || null,
          social_instagram: formData.instagram || null,
          barakah_effects: formData.tags || [],
          user_created_id: user.id,
          provider_id: isOwner ? user.id : null,
          provider_images: uploadedUrls.length > 0 ? uploadedUrls : null,
          offers_ids: formData.offers_ids || [],
          needs_ids: formData.needs_ids || [],
          review_status: 'pending' as const,
        };

        const { data: createdProvider, error: providerError } = await supabase
          .from('providers')
          .insert([insertData])
          .select('provider_id')
          .single();

        if (providerError) {
          throw providerError;
        }

        if (formData.selectedCommunityServiceIds && formData.selectedCommunityServiceIds.length > 0) {
          const relationships = formData.selectedCommunityServiceIds.map(serviceId => ({
            provider_id: createdProvider.provider_id,
            community_service_id: serviceId
          }));
          
          const { error: relationshipError } = await supabase
            .from('provider_community_services')
            .insert(relationships);
          
          if (relationshipError) {
            console.error('Error creating provider-community service relationships:', relationshipError);
          }
        }

        toast.success(t('create.media.providerCreated'));
      }

      clearFormData();
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['community-services'] });

      if (onSuccess) {
        onSuccess();
      } else {
        // In recommendation mode, redirect to waitlist to show early access screen again
        // This allows users to continue with other early access options
        const isRecommendation = formData.creationMode === 'recommendation';
        router.push(isRecommendation ? '/waitlist' : '/providers');
      }
    } catch (error) {
      console.error('Error creating entity:', error);
      toast.error(t('create.media.errorCreating'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCommunityService = formData.category === '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';

  return (
    <form className="flex flex-col gap-8 pb-8" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      {/* Basics Section */}
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold text-content-heading">{t('create.steps.basics')}</h2>
        
        <div className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">{t('create.basics.titleLabel')}</label>
              <input
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={t('create.basics.titlePlaceholder')}
                type="text"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
              />
            </div>
          </div>

          {/* Category */}
          <button
            className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2"
            type="button"
            onClick={() => router.push('/create/basics/category')}
          >
            <div className="flex flex-1 flex-col gap-1 items-start">
              <span className="text-xs leading-[15px] text-content-muted">{t('create.basics.categoryLabel')}</span>
              <div className="text-[15px] font-medium text-content leading-[18px] tracking-[0.15px] text-left">
                {formData.category 
                  ? (() => {
                      const category = categories.find(cat => cat.category_id === formData.category);
                      if (!category) return t('create.basics.selectCategory');
                      return language === 'en' 
                        ? (category.name_en || category.name_de || t('create.basics.selectCategory'))
                        : (category.name_de || category.name_en || t('create.basics.selectCategory'));
                    })()
                  : t('create.basics.selectCategory')
                }
              </div>
            </div>
            <Icon className="h-6 w-6 text-content-heading" icon="material-symbols:chevron-right" />
          </button>

          {/* Description */}
          <div className="flex min-h-[120px] w-full items-start rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">{t('create.basics.descriptionLabel')}</label>
              <textarea
                className="w-full min-h-[100px] border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0 resize-none"
                placeholder={t('create.basics.descriptionPlaceholder')}
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
              />
            </div>
          </div>

          {/* Offers */}
          <button
            className="flex min-h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2"
            type="button"
            onClick={() => router.push('/create/basics/offers')}
          >
            <div className="flex flex-1 flex-col gap-1 items-start">
              <span className="text-xs leading-[15px] text-content-muted">{t('create.basics.whatIOffer')}</span>
              <div className="text-[15px] font-medium text-content leading-[18px] tracking-[0.15px] text-left break-words">
                {(() => {
                  const hasOffers = formData.offers_ids && formData.offers_ids.length > 0;
                  if (hasOffers) {
                    const selectedOffers = formData.offers_ids
                      .map(id => {
                        const offer = offers.find(offer => offer.offer_id === id);
                        return language === 'en' 
                          ? (offer?.name_en || offer?.name_de)
                          : (offer?.name_de || offer?.name_en);
                      })
                      .filter(Boolean);
                    return selectedOffers.length > 0 ? selectedOffers.join(', ') : t('create.basics.selectOffers');
                  }
                  return t('create.basics.selectOffers');
                })()}
              </div>
            </div>
            <Icon className="h-6 w-6 text-[#232323] flex-shrink-0" icon="material-symbols:chevron-right" />
          </button>

          {/* Needs */}
          <button
            className="flex min-h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2"
            type="button"
            onClick={() => router.push('/create/basics/needs')}
          >
            <div className="flex flex-1 flex-col gap-1 items-start">
              <span className="text-xs leading-[15px] text-content-muted">{t('create.basics.whatILookingFor')}</span>
              <div className="text-[15px] font-medium text-content leading-[18px] tracking-[0.15px] text-left break-words">
                {(() => {
                  const hasNeeds = formData.needs_ids && formData.needs_ids.length > 0;
                  if (hasNeeds) {
                    const selectedNeeds = formData.needs_ids
                      .map(id => {
                        const need = needs.find(need => need.need_id === id);
                        return language === 'en' 
                          ? (need?.name_en || need?.name_de)
                          : (need?.name_de || need?.name_en);
                      })
                      .filter(Boolean);
                    return selectedNeeds.length > 0 ? selectedNeeds.join(', ') : t('create.basics.selectNeeds');
                  }
                  return t('create.basics.selectNeeds');
                })()}
              </div>
            </div>
            <Icon className="h-6 w-6 text-[#232323] flex-shrink-0" icon="material-symbols:chevron-right" />
          </button>
        </div>
      </div>

      {/* Location Section */}
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold text-content-heading">{t('create.steps.location')}</h2>
        
        {/* Online Business Toggle */}
        <div className="flex items-center justify-between w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-content">{t('create.location.onlineBusiness')}</span>
            <span className="text-xs text-content-muted">{t('create.location.noPhysicalLocation')}</span>
          </div>
          <button
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              formData.isOnlineBusiness ? 'bg-primary' : 'bg-gray-200'
            }`}
            type="button"
            onClick={() => {
              const newIsOnline = !formData.isOnlineBusiness;
              updateFormData({ 
                isOnlineBusiness: newIsOnline,
                ...(newIsOnline && {
                  street: '',
                  zip: '',
                  city: '',
                  country: '',
                  showAddress: false
                })
              });
            }}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.isOnlineBusiness ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {!formData.isOnlineBusiness && (
          <div className="flex flex-col gap-4">
            {/* Address Autocomplete */}
            <div className="flex flex-col gap-1">
              <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
                <AddressAutocomplete
                  className="flex-1"
                  initialValue={initialAddressValueRef.current}
                  placeholder={t('create.location.enterAddress')}
                  onAddressSelect={handleAddressSelect}
                />
              </div>
              {validationErrors.street && (
                <p className="text-xs text-red-500 px-3">{validationErrors.street}</p>
              )}
              {!validationErrors.street && (
                <div className="flex items-center justify-between px-3 py-1">
                  <p className="text-xs text-content-muted">{t('create.location.addressAutoFill')}</p>
                  <button
                    className="text-xs text-primary hover:text-primary-dark hover:underline cursor-pointer"
                    type="button"
                    onClick={() => setShowManualFields(!showManualFields)}
                  >
                    {showManualFields ? t('create.location.hideFields') : t('create.location.editFields')}
                  </button>
                </div>
              )}
            </div>

            {/* Manual Fields */}
            {showManualFields && (
              <div className="flex flex-col gap-4 pt-2 border-t border-gray-100">
                {/* Street */}
                <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
                  <div className="flex w-full flex-col gap-1">
                    <label className="text-xs leading-[15px] text-content-muted">{t('create.location.street')}</label>
                    <input
                      className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                      placeholder={t('create.location.enterStreet')}
                      type="text"
                      value={formData.street}
                      onChange={(e) => {
                        updateFormData({ street: e.target.value });
                        validateField('street');
                      }}
                    />
                  </div>
                </div>
                {validationErrors.street && (
                  <p className="text-xs text-red-500 px-3 -mt-3">{validationErrors.street}</p>
                )}

                {/* ZIP */}
                <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
                  <div className="flex w-full flex-col gap-1">
                    <label className="text-xs leading-[15px] text-content-muted">{t('create.location.zip')}</label>
                    <input
                      className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                      placeholder={t('create.location.enterZip')}
                      type="text"
                      value={formData.zip}
                      onChange={(e) => handleZipChange(e.target.value)}
                    />
                  </div>
                </div>
                {validationErrors.zip && (
                  <p className="text-xs text-red-500 px-3 -mt-3">{validationErrors.zip}</p>
                )}

                {/* City */}
                <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
                  <div className="flex w-full flex-col gap-1">
                    <label className="text-xs leading-[15px] text-content-muted">{t('create.location.city')}</label>
                    <input
                      required
                      className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                      placeholder={t('create.location.enterCity')}
                      type="text"
                      value={formData.city}
                      onChange={(e) => {
                        updateFormData({ city: e.target.value });
                        validateField('city');
                      }}
                    />
                  </div>
                </div>
                {validationErrors.city && (
                  <p className="text-xs text-red-500 px-3 -mt-3">{validationErrors.city}</p>
                )}

                {/* Country */}
                <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
                  <div className="flex w-full flex-col gap-1">
                    <label className="text-xs leading-[15px] text-content-muted">{t('create.location.country')}</label>
                    <input
                      required
                      className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                      placeholder={t('create.location.enterCountry')}
                      type="text"
                      value={formData.country}
                      onChange={(e) => {
                        updateFormData({ country: e.target.value });
                        validateField('country');
                        if (formData.zip) {
                          handleZipChange(formData.zip);
                        }
                      }}
                    />
                  </div>
                </div>
                {validationErrors.country && (
                  <p className="text-xs text-red-500 px-3 -mt-3">{validationErrors.country}</p>
                )}
              </div>
            )}
          </div>
        )}

        {formData.isOnlineBusiness && (
          <div className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl border border-[#D4D4D4] bg-white">
            <Icon className="h-12 w-12 text-primary mb-3" icon="mdi:web" />
            <p className="text-sm font-medium text-content text-center mb-1">{t('create.location.onlineBusiness')}</p>
            <p className="text-xs text-content-muted text-center">{t('create.location.onlineBusinessDisplay')}</p>
          </div>
        )}
      </div>

      {/* Contact Section */}
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold text-content-heading">{t('create.steps.contact')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Website */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">{t('create.contact.website')}</label>
              <input
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={t('create.contact.websitePlaceholder')}
                type="url"
                value={formData.website}
                onChange={(e) => updateFormData({ website: e.target.value })}
              />
            </div>
          </div>

          {/* Instagram */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">{t('create.contact.instagram')}</label>
              <input
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={t('create.contact.instagramPlaceholder')}
                type="text"
                value={formData.instagram}
                onChange={(e) => updateFormData({ instagram: e.target.value })}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">{t('create.contact.phone')}</label>
              <input
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={t('create.contact.phonePlaceholder')}
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData({ phone: e.target.value })}
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">{t('create.contact.email')}</label>
              <input
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={t('create.contact.emailPlaceholder')}
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData({ email: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Media Section */}
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold text-content-heading">{t('create.steps.media')}</h2>
        
        <div className="flex flex-col gap-3">
          <button
            className="flex w-full min-h-[54px] items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm hover:bg-gray-50 transition-colors"
            type="button"
            onClick={() => router.push('/create/media/images')}
          >
            <div className="flex flex-1 flex-col gap-1 items-start">
              <span className="text-xs font-normal text-content-muted leading-[15px]">{t('create.media.images')}</span>
              <div className="text-[15px] font-medium text-content leading-[18px] tracking-[0.15px] text-left break-words">
                {formData.images && formData.images.length > 0 
                  ? t('create.media.imagesSelected').replace('{{count}}', formData.images.length.toString())
                  : t('create.media.uploadImages')}
              </div>
            </div>
            <Icon className="h-6 w-6 text-[#232323] flex-shrink-0" icon="material-symbols:chevron-right" />
          </button>

          {!isCommunityService && (
            <button
              className="flex w-full min-h-[54px] items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm hover:bg-gray-50 transition-colors"
              type="button"
              onClick={() => router.push('/create/media/social')}
            >
              <div className="flex flex-1 flex-col gap-1 items-start">
                <span className="text-xs font-normal text-content-muted leading-[15px]">{t('create.media.socialInitiatives')}</span>
                <div className="text-[15px] font-medium text-content leading-[18px] tracking-[0.15px] text-left break-words">
                  {(formData.selectedCommunityServiceIds || []).length > 0 
                    ? t('create.media.initiativesSelected').replace('{{count}}', (formData.selectedCommunityServiceIds || []).length.toString())
                    : t('create.media.selectInitiatives')}
                </div>
              </div>
              <Icon className="h-6 w-6 text-[#232323] flex-shrink-0" icon="material-symbols:chevron-right" />
            </button>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button
          disabled={isSubmitting || !isFormValid()}
          loading={isSubmitting}
          loadingText={t('create.media.creating')}
          type="submit"
          variant="primary"
        >
          {isSubmitting 
            ? t('create.media.creating')
            : isCommunityService 
              ? t('create.media.registerCommunityService')
              : t('create.media.registerProvider')}
        </Button>
      </div>
    </form>
  );
}


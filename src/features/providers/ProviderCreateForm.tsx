'use client';

import { useState, useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { getFeatureFlag } from '@/config/feature-flags';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { useFormData, type ProviderFormData } from '@/providers/form-provider';
import type { Category } from '@/types/supabase';
import type { Offer, Need } from '@/types/offer';
import { createProviderCommunityServiceRelationship } from '@/services/community_services';
import { useLanguage } from '@/providers/LanguageProvider';
import { FooterAction } from '@/components/ui/FooterAction';

interface ProviderCreateFormProps {
  onNextStep?: () => void;
}

export function ProviderCreateForm({ onNextStep }: ProviderCreateFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const { t, language } = useLanguage();
  const formRef = useRef<HTMLFormElement>(null);

  // Refs for input fields to enable keyboard navigation
  const titleInputRef = useRef<HTMLInputElement>(null);
  const streetInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const countryInputRef = useRef<HTMLInputElement>(null);
  const websiteInputRef = useRef<HTMLInputElement>(null);
  const instagramInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

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
      icon: 'mdi:account-group',
    },
    {
      title: t('create.steps.media'),
      icon: 'mdi:image-multiple',
    },
  ];
  const { formData, updateFormData } = useFormData();

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



  const handleInputChange = (field: keyof ProviderFormData, value: string | string[] | File[] | boolean) => {
    updateFormData({ [field]: value });
  };

  // Handle Enter key to move to next input field
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextInputRef: React.RefObject<HTMLInputElement> | null) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (nextInputRef?.current) {
        nextInputRef.current.focus();
      }
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit called - currentStep:', currentStep, 'STEPS.length:', STEPS.length);
    
    // Only allow submission on the last step
    if (currentStep !== STEPS.length - 1) {
      console.log('Form submission prevented - not on last step. Current step:', currentStep, 'Last step:', STEPS.length - 1);
      return;
    }
    
    console.log('Form submission allowed - on last step:', currentStep);
    console.log('Form data at submission:', formData);
    console.log('Category value:', formData.category);
    setIsSubmitting(true);

    if (!user) {
      setIsSubmitting(false);
      toast.error('Sie müssen angemeldet sein, um einen Anbieter zu erstellen. Bitte melden Sie sich erneut an.');
      setTimeout(() => router.push('/signin'), 2000);
      return;
    }

    // Try to refresh the session before proceeding
    try {
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('Session refresh failed:', refreshError);
        setIsSubmitting(false);
        toast.error('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
        setTimeout(() => router.push('/signin'), 2000);
        return;
      }
      if (!refreshedSession?.user) {
        setIsSubmitting(false);
        toast.error('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
        setTimeout(() => router.push('/signin'), 2000);
        return;
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      setIsSubmitting(false);
      toast.error('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
      setTimeout(() => router.push('/signin'), 2000);
      return;
    }

    // 1. Upload images to Supabase Storage and collect trusted URLs
    const uploadedUrls: string[] = [];
    console.log(
      'Images to upload:',
      formData.images.length,
      formData.images.map((f) => f.name),
    );

    for (const file of formData.images) {
      const fileExt = file.name.split('.').pop();
      const filePath = `providers/${Date.now()}-${Math.random()}.${fileExt}`;
      console.log('Uploading file:', file.name, 'to path:', filePath);

      const { error: uploadError } = await supabase.storage.from('provider-images').upload(filePath, file);
      if (uploadError) {
        console.error('Upload error for', file.name, ':', uploadError);
        continue;
      }

      const { data: publicUrlData } = supabase.storage.from('provider-images').getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) {
        // Only allow trusted domain (current Supabase project)
        try {
          const { hostname } = new URL(publicUrlData.publicUrl);
          const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
          if (hostname === supabaseUrl.hostname) {
            uploadedUrls.push(publicUrlData.publicUrl);
            console.log('Successfully uploaded:', file.name, 'URL:', publicUrlData.publicUrl);
          }
        } catch {
          console.error('Invalid URL for', file.name);
        }
      }
    }

    console.log('Total uploaded URLs:', uploadedUrls.length);
    console.log('Form data before insert:', {
      category: formData.category,
      offers_ids: formData.offers_ids,
      needs_ids: formData.needs_ids,
      user_id: user.id
    });

    // 2. Save provider with trusted Supabase image URLs
    // Determine which ID field to set based on creation mode
    const isOwner = formData.creationMode === 'owner';
    const insertData = {
      provider_name: formData.title,
      // If online business, all address fields are null
      address_street: formData.isOnlineBusiness ? null : (getFeatureFlag('enableAddressVisibilityToggle') ? (formData.showAddress ? formData.street : null) : formData.street),
      address_zip: formData.isOnlineBusiness ? null : (getFeatureFlag('enableAddressVisibilityToggle') ? (formData.showAddress ? formData.zip : null) : formData.zip),
      address_city: formData.isOnlineBusiness ? null : (getFeatureFlag('enableAddressVisibilityToggle') ? (formData.showAddress ? formData.city : null) : formData.city),
      address_country: formData.isOnlineBusiness ? null : (getFeatureFlag('enableAddressVisibilityToggle') ? (formData.showAddress ? formData.country : null) : formData.country),
      show_address: formData.isOnlineBusiness ? false : (getFeatureFlag('enableAddressVisibilityToggle') ? formData.showAddress : true),
      category_id: formData.category && formData.category.trim() !== '' ? formData.category : null,
      contact_email: formData.email || null,
      contact_phone: formData.phone || null,
      social_website: formData.website || null,
      social_instagram: formData.instagram || null,
      barakah_effects: formData.tags,
      // user_created_id: ALWAYS set to track who created this database entry
      // provider_owner_id: Only set in owner mode (when user is the actual business owner)
      user_created_id: user.id,
      provider_owner_id: isOwner ? user.id : null,
      provider_images: JSON.stringify({ urls: uploadedUrls }),
      offers_ids: formData.offers_ids.length > 0 ? formData.offers_ids : null,
      needs_ids: formData.needs_ids.length > 0 ? formData.needs_ids : null,
    };
    
    console.log('Insert data:', insertData);
    console.log('Category ID in insert data:', insertData.category_id);
    console.log('Offers IDs in insert data:', insertData.offers_ids);
    console.log('Needs IDs in insert data:', insertData.needs_ids);
    console.log('Form data offers_ids:', formData.offers_ids);
    console.log('Form data needs_ids:', formData.needs_ids);
    
    const { data: createdProvider, error: providerError } = await supabase
      .from('providers')
      .insert([insertData])
      .select('provider_id')
      .single();
    
    if (providerError) {
      setIsSubmitting(false);
      console.error('Provider creation error:', providerError);
      
      // Check if it's an authentication error
      if (providerError.message.includes('JWT') || providerError.message.includes('auth') || providerError.code === 'PGRST301') {
        toast.error('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
        setTimeout(() => router.push('/signin'), 2000);
      } else {
        toast.error(`Fehler beim Erstellen: ${providerError.message}`);
      }
      return;
    }

    if (!createdProvider) {
      setIsSubmitting(false);
      toast.error('Provider wurde erstellt, aber keine Daten zurückgegeben.');
      return;
    }

    console.log('Provider created successfully with ID:', createdProvider.provider_id);

    // Create provider-community service relationships for all selected services
    const selectedServiceIds = formData.selectedCommunityServiceIds || [];
    if (selectedServiceIds.length > 0 && createdProvider.provider_id) {
      console.log('Creating relationships with community services:', selectedServiceIds);
      
      const results = await Promise.allSettled(
        selectedServiceIds.map(serviceId => 
          createProviderCommunityServiceRelationship(createdProvider.provider_id, serviceId)
        )
      );
      
      const failedCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      
      if (failedCount > 0) {
        console.error(`Failed to create ${failedCount} community service relationship(s)`);
        toast.error(`Anbieter erstellt, aber ${failedCount} Initiative(n) konnten nicht verknüpft werden.`);
      } else {
        console.log(`Successfully created ${selectedServiceIds.length} community service relationship(s)`);
      }
    }

    setIsSubmitting(false);
    console.log('Provider created successfully, redirecting to create page...');
    toast.success('Anbieter erfolgreich registriert!');
    // Force a page refresh to ensure the redirect works
    setTimeout(() => {
      window.location.href = '/create';
    }, 1000);
  };

  const nextStep = () => {
    console.log('nextStep called - currentStep:', currentStep, 'STEPS.length:', STEPS.length);
    if (currentStep < STEPS.length - 1) {
      console.log('Advancing to step:', currentStep + 1);
      
      // Call the onNextStep callback if provided (for external navigation)
      // Call it when advancing from step 0 (Basics) to trigger external navigation to location page
      if (onNextStep && currentStep === 0) {
        onNextStep();
        return; // Don't advance internal step when using external navigation
      }
      
      setCurrentStep((prev) => prev + 1);
    } else {
      console.log('Already on last step, not advancing');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };


  function isStepValid(step: number, data: ProviderFormData) {
    switch (step) {
      case 0:
        return !!data.title && !!data.category && data.offers_ids.length > 0;
      case 1:
        // If it's an online business, no location is required
        if (data.isOnlineBusiness) {
          return true;
        }
        // If address visibility toggle is enabled, check based on showAddress. Otherwise, always require city and country.
        if (getFeatureFlag('enableAddressVisibilityToggle')) {
          return !data.showAddress || (!!data.city && !!data.country);
        } else {
          return !!data.city && !!data.country;
        }
      case 2:
        // All optional, so always valid
        return true;
      case 3:
        // All optional, so always valid
        return true;
      default:
        return false;
    }
  }

  return (
    <div className="flex w-full max-w-[361px] flex-1 flex-col">
      {/* Step Indicator */}
      <div className="mb-12">
      <StepIndicator currentStep={currentStep} steps={STEPS} />
      </div>

      {/* Form Content */}
      <div className="flex flex-1 flex-col">
        <form 
          ref={formRef}
          className="flex flex-1 flex-col" 
          onKeyDown={(e) => {
            // Prevent Enter key from submitting form on non-last steps
            if (e.key === 'Enter' && currentStep !== STEPS.length - 1) {
              e.preventDefault();
              console.log('Enter key prevented - not on last step');
            }
          }}
          onSubmit={handleSubmit}
        >
          {/* Form Fields */}
          <div className="flex flex-1 flex-col gap-8 pb-[180px]">
        {currentStep === 0 && (
              <div className="space-y-6">
                {/* Explanatory Text */}
                <div className="flex flex-col items-start px-3 py-0 space-y-3 w-full">
                  <p className="font-normal text-base leading-[19px] text-[#7A7A7A] text-left">
                    {t('create.basics.description')}
                  </p>
                </div>
                
                <div className="space-y-3">
                  {/* First Name Field */}
                  <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('create.basics.titleLabel')}</span>
                      <input
                        ref={titleInputRef}
                        className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                        placeholder={t('create.basics.titlePlaceholder')}
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        onKeyDown={(e) => {
                          // On Enter, blur the field (no next input in step 0)
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Category Field */}
                  <button
                    className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm"
                    type="button"
                    onClick={() => router.push('/create/basics/category')}
                  >
                    <div className="flex flex-1 flex-col gap-1 items-start">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('create.basics.categoryLabel')}</span>
                      <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left">
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
                    <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                  </button>

                  {/* What I Offer Field */}
                  <button
                    className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm"
                    type="button"
                    onClick={() => router.push('/create/basics/offers')}
                  >
                    <div className="flex flex-1 flex-col gap-1 items-start">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('create.basics.whatIOffer')}</span>
                      <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left break-words">
                        {formData.offers_ids.length > 0 
                          ? formData.offers_ids.map(id => {
                              const offer = offers.find(offer => offer.offer_id === id);
                              return language === 'en' 
                                ? (offer?.name_en || offer?.name_de)
                                : (offer?.name_de || offer?.name_en);
                            }).filter(Boolean).join(', ')
                          : t('create.basics.selectOffers')
                        }
                      </div>
                    </div>
                    <div className="flex items-center justify-center ml-2 flex-shrink-0 self-center">
                      <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                    </div>
                  </button>

                  {/* What I'm Looking For Field */}
                  <button
                    className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm"
                    type="button"
                    onClick={() => router.push('/create/basics/needs')}
                  >
                    <div className="flex flex-1 flex-col gap-1 items-start">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('create.basics.whatILookingFor')}</span>
                      <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left break-words">
                        {formData.needs_ids.length > 0 
                          ? formData.needs_ids.map(id => {
                              const need = needs.find(need => need.need_id === id);
                              return language === 'en' 
                                ? (need?.name_en || need?.name_de)
                                : (need?.name_de || need?.name_en);
                            }).filter(Boolean).join(', ')
                          : t('create.basics.selectNeeds')
                        }
                      </div>
                    </div>
                    <div className="flex items-center justify-center ml-2 flex-shrink-0 self-center">
                      <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                    </div>
                  </button>
                </div>
            </div>
        )}

        {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium text-[#232323] px-3">Location</h2>
                
                <div className="space-y-3">
                  {/* Online Business Toggle */}
                  <div className="flex items-center justify-between w-full rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#272727]">
                        Online-Geschäft
                      </span>
                      <span className="text-xs text-[#7A7A7A]">
                        Kein physischer Standort
                      </span>
                    </div>
                    <button
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        formData.isOnlineBusiness ? 'bg-primary' : 'bg-gray-200'
                      }`}
                      type="button"
                      onClick={() => {
                        const newIsOnline = !formData.isOnlineBusiness;
                        handleInputChange('isOnlineBusiness', newIsOnline);
                        // If switching to online, clear address fields
                        if (newIsOnline) {
                          handleInputChange('street', '');
                          handleInputChange('zip', '');
                          handleInputChange('city', '');
                          handleInputChange('country', '');
                          handleInputChange('showAddress', false);
                        }
                      }}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.isOnlineBusiness ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {!formData.isOnlineBusiness ? (
                    <>
                      <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                        <div className="flex flex-1 flex-col gap-1">
                          <span className="text-xs font-normal text-[#999999] leading-[15px]">Straße</span>
                          <input
                            ref={streetInputRef}
                            className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                  placeholder="Straße eingeben"
                            type="text"
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, zipInputRef)}
                />
                        </div>
                      </div>

                      <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                        <div className="flex flex-1 flex-col gap-1">
                          <span className="text-xs font-normal text-[#999999] leading-[15px]">PLZ</span>
                          <input
                            ref={zipInputRef}
                            className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                  placeholder="PLZ eingeben"
                            type="text"
                  value={formData.zip}
                  onChange={(e) => handleInputChange('zip', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, cityInputRef)}
                />
                        </div>
                      </div>

                      <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                        <div className="flex flex-1 flex-col gap-1">
                          <span className="text-xs font-normal text-[#999999] leading-[15px]">Stadt *</span>
                          <input
                            ref={cityInputRef}
                            className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                            placeholder="Stadt eingeben"
                            type="text"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, countryInputRef)}
                          />
                        </div>
                      </div>

                      <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                        <div className="flex flex-1 flex-col gap-1">
                          <span className="text-xs font-normal text-[#999999] leading-[15px]">Land *</span>
                          <input
                            ref={countryInputRef}
                            className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                            placeholder="Land eingeben"
                            type="text"
                            value={formData.country}
                            onChange={(e) => handleInputChange('country', e.target.value)}
                            onKeyDown={(e) => {
                              // Last field in step 1, blur on Enter
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                e.currentTarget.blur();
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Address Visibility Checkbox - Feature Flagged */}
                      {getFeatureFlag('enableAddressVisibilityToggle') && (
                        <div className="flex w-full items-center gap-3 px-3 py-3">
                          <input
                            checked={formData.showAddress}
                            className="h-5 w-5 rounded border-2 border-[#E5E5E5] bg-white text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
                            id="showAddress"
                            type="checkbox"
                            onChange={(e) => handleInputChange('showAddress', e.target.checked)}
                          />
                          <label className="text-sm font-medium text-[#272727] leading-[18px] cursor-pointer" htmlFor="showAddress">
                            Adresse anzeigen
                          </label>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl border border-[#E5E5E5] bg-white">
                      <Icon className="h-12 w-12 text-primary mb-3" icon="mdi:web" />
                      <p className="text-sm font-medium text-[#272727] text-center mb-1">
                        Online-Geschäft
                      </p>
                      <p className="text-xs text-[#7A7A7A] text-center">
                        Dein Geschäft wird als &ldquo;Online&rdquo; angezeigt
                      </p>
                    </div>
                  )}
                </div>
              </div>
        )}

        {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium text-[#232323] px-3">Contact</h2>
                
                <div className="space-y-3">
                  <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Website</span>
                      <input
                        ref={websiteInputRef}
                        className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
              placeholder="Website eingeben"
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, instagramInputRef)}
            />
                    </div>
                  </div>

                  <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Instagram</span>
                      <input
                        ref={instagramInputRef}
                        className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
              placeholder="Instagram eingeben"
                        type="text"
              value={formData.instagram}
              onChange={(e) => handleInputChange('instagram', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, phoneInputRef)}
            />
                    </div>
                  </div>

                  <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Telefon</span>
                      <input
                        ref={phoneInputRef}
                        className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
              placeholder="Telefon eingeben"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, emailInputRef)}
            />
                    </div>
                  </div>

                  <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Email</span>
                      <input
                        ref={emailInputRef}
                        className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
              placeholder="Email eingeben"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onKeyDown={(e) => {
                // Last field in step 2, blur on Enter
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
            />
                    </div>
                  </div>
                </div>
              </div>
        )}

        {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium text-[#232323] px-3">Media</h2>
                
                <div className="space-y-3">
            <div className="space-y-2">
                    <label className="text-xs text-[#999999]">
                      Bilder hochladen
              </label>
                    <button
                      className="flex w-full h-[54px] flex-col justify-center items-start p-4 gap-4 bg-white border border-[#D4D4D4] rounded-[12px] hover:bg-gray-50"
                      type="button"
                      onClick={() => router.push('/create/media')}
                    >
                      <div className="flex flex-row items-center p-0 gap-3 w-full h-6">
                        <Icon 
                          className="w-6 h-6 text-[#232323] flex-shrink-0" 
                          icon="lucide:image-up" 
                        />
                        <span className="font-inter-tight font-normal font-semibold text-base leading-[19px] flex items-center text-[#232323] whitespace-nowrap">
                          Bilder hochladen{formData.images.length > 0 ? ` (${formData.images.length})` : ''}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
            </div>
        )}
      </div>
        </form>

        {/* Footer Action */}
        {currentStep > 0 ? (
          // Two buttons: Back (secondary) + Next/Submit (primary)
          <FooterAction
            primaryButton={{
              label: isSubmitting
                ? t('common.loading')
                : currentStep === STEPS.length - 1
                  ? t('create.basics.registerProvider')
                  : t('common.next'),
              icon: isSubmitting
                ? 'mdi:loading'
                : currentStep === STEPS.length - 1
                  ? 'lucide:user-plus'
                  : undefined,
              trailingIcon: currentStep === STEPS.length - 1 ? undefined : 'material-symbols:chevron-right',
              onClick: () => {
                if (currentStep === STEPS.length - 1) {
                  // Trigger form submission
                  if (formRef.current) {
                    formRef.current.requestSubmit();
                  }
                } else {
                  nextStep();
                }
              },
              disabled: isSubmitting || !isStepValid(currentStep, formData),
              loading: isSubmitting,
              variant: 'primary',
            }}
            secondaryButton={{
              icon: 'material-symbols:chevron-left',
              onClick: prevStep,
              'aria-label': t('common.back'),
            }}
          />
        ) : (
          // Single button: Next only
          <FooterAction
            actionButton={{
              label: t('common.next'),
              trailingIcon: 'material-symbols:chevron-right',
              onClick: () => {
                if (onNextStep) {
                  onNextStep();
                } else {
                  nextStep();
                }
              },
              disabled: isSubmitting || !isStepValid(currentStep, formData),
              variant: 'primary',
            }}
          />
        )}
      </div>
    </div>
  );
}

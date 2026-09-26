'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { getFeatureFlag } from '@/config/feature-flags';
import { supabase } from '@/lib/supabase/client';
import { useFormData, type ProviderFormData } from '@/providers/form-provider';
import type { Category } from '@/types/supabase';
import type { Offer, Need } from '@/types/offer';
import { useLanguage } from '@/providers/LanguageProvider';
import { FooterAction } from '@/components/ui/FooterAction';
import { normalizeWebsiteUrl } from '@/utils/navigationUtils';

interface ProviderCreateFormProps {
  onNextStep?: () => void;
}

export function ProviderCreateForm({ onNextStep }: ProviderCreateFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  // No submit path exists in this form anymore (#415); the submit button styles stay.
  const isSubmitting = false;
  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
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

  const { formData, updateFormData } = useFormData();

  // Determine if in recommendation mode
  const isRecommendationMode = formData.creationMode === 'recommendation';

  // Steps with translations - 3 steps for recommendation, 4 for owner
  const STEPS_RECOMMENDATION = [
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
  ];

  const STEPS_OWNER = [
    ...STEPS_RECOMMENDATION,
    {
      title: t('create.steps.media'),
      icon: 'mdi:image-multiple',
    },
  ];

  const STEPS = isRecommendationMode ? STEPS_RECOMMENDATION : STEPS_OWNER;

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

  const handleInputChange = (
    field: keyof ProviderFormData,
    value: string | string[] | File[] | boolean,
  ) => {
    updateFormData({ [field]: value });
  };

  // Handle Enter key to move to next input field
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    nextInputRef: React.RefObject<HTMLInputElement> | null,
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (nextInputRef?.current) {
        nextInputRef.current.focus();
      }
    }
  };

  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      // Call the onNextStep callback if provided (for external navigation)
      // Call it when advancing from step 0 (Basics) to trigger external navigation to location page
      if (onNextStep && currentStep === 0) {
        onNextStep();
        return; // Don't advance internal step when using external navigation
      }

      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, onNextStep, STEPS.length]);

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Calculate button disabled state - don't memoize to ensure it's always current
  const buttonDisabled =
    currentStep === 0 ? isSubmitting || !isStepValid(currentStep, formData) : false;

  const handleNextClick = useCallback(() => {
    // Validate before proceeding
    const validationResult = isStepValid(currentStep, formData);

    if (!validationResult) {
      // Provide specific feedback based on what's missing
      if (currentStep === 0) {
        if (!formData.title) {
          toast.error(
            language === 'de' ? 'Bitte geben Sie einen Titel ein' : 'Please enter a title',
          );
        } else if (!formData.category) {
          toast.error(
            language === 'de' ? 'Bitte wählen Sie eine Kategorie aus' : 'Please select a category',
          );
        } else if (!formData.offers_ids || formData.offers_ids.length === 0) {
          toast.error(
            language === 'de'
              ? 'Bitte wählen Sie mindestens ein Angebot aus'
              : 'Please select at least one offer',
          );
        }
      }
      return;
    }

    if (onNextStep) {
      try {
        onNextStep();
      } catch (error) {
        console.error('[ProviderCreateForm] Error in onNextStep callback:', error);
      }
    } else {
      nextStep();
    }
  }, [currentStep, formData, onNextStep, language, nextStep]);

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
    <div className="flex w-full flex-1 flex-col">
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
            }
          }}
          onSubmit={(e) => e.preventDefault()}
        >
          {/* Form Fields */}
          <div className="flex flex-1 flex-col gap-8 pb-[180px]">
            {currentStep === 0 && (
              <div className="space-y-6">
                {/* Explanatory Text */}
                <div className="flex w-full flex-col items-start space-y-3 px-3 py-0">
                  <p className="text-left text-base font-normal leading-[19px] text-[#7A7A7A]">
                    {t('create.basics.description')}
                  </p>
                </div>

                <div className="space-y-3">
                  {/* First Name Field */}
                  <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal leading-[15px] text-[#999999]">
                        {t('create.basics.titleLabel')}
                      </span>
                      <input
                        ref={titleInputRef}
                        className="border-0 bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] outline-none placeholder:text-[#999999] focus:border-0 focus:outline-none focus:ring-0"
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
                    <div className="flex flex-1 flex-col items-start gap-1">
                      <span className="text-xs font-normal leading-[15px] text-[#999999]">
                        {t('create.basics.categoryLabel')}
                      </span>
                      <div className="text-left text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727]">
                        {formData.category
                          ? (() => {
                              const category = categories.find(
                                (cat) => cat.category_id === formData.category,
                              );
                              if (!category) return t('create.basics.selectCategory');
                              return language === 'en'
                                ? category.name_en ||
                                    category.name_de ||
                                    t('create.basics.selectCategory')
                                : category.name_de ||
                                    category.name_en ||
                                    t('create.basics.selectCategory');
                            })()
                          : t('create.basics.selectCategory')}
                      </div>
                    </div>
                    <Icon
                      className="h-6 w-6 text-[#232323]"
                      icon="material-symbols:chevron-right"
                    />
                  </button>

                  {/* What I Offer Field */}
                  <button
                    className="flex min-h-[54px] w-full rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm"
                    type="button"
                    onClick={() => router.push('/create/basics/offers')}
                  >
                    <div className="flex flex-1 flex-col items-start gap-1">
                      <span className="text-xs font-normal leading-[15px] text-[#999999]">
                        {t('create.basics.whatIOffer')}
                      </span>
                      <div className="break-words text-left text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727]">
                        {formData.offers_ids.length > 0
                          ? formData.offers_ids
                              .map((id) => {
                                const offer = offers.find((offer) => offer.offer_id === id);
                                return language === 'en'
                                  ? offer?.name_en || offer?.name_de
                                  : offer?.name_de || offer?.name_en;
                              })
                              .filter(Boolean)
                              .join(', ')
                          : t('create.basics.selectOffers')}
                      </div>
                    </div>
                    <div className="ml-2 flex flex-shrink-0 items-center justify-center self-center">
                      <Icon
                        className="h-6 w-6 text-[#232323]"
                        icon="material-symbols:chevron-right"
                      />
                    </div>
                  </button>

                  {/* What I'm Looking For Field */}
                  <button
                    className="flex min-h-[54px] w-full rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm"
                    type="button"
                    onClick={() => router.push('/create/basics/needs')}
                  >
                    <div className="flex flex-1 flex-col items-start gap-1">
                      <span className="text-xs font-normal leading-[15px] text-[#999999]">
                        {t('create.basics.whatILookingFor')}
                      </span>
                      <div className="break-words text-left text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727]">
                        {formData.needs_ids.length > 0
                          ? formData.needs_ids
                              .map((id) => {
                                const need = needs.find((need) => need.need_id === id);
                                return language === 'en'
                                  ? need?.name_en || need?.name_de
                                  : need?.name_de || need?.name_en;
                              })
                              .filter(Boolean)
                              .join(', ')
                          : t('create.basics.selectNeeds')}
                      </div>
                    </div>
                    <div className="ml-2 flex flex-shrink-0 items-center justify-center self-center">
                      <Icon
                        className="h-6 w-6 text-[#232323]"
                        icon="material-symbols:chevron-right"
                      />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="px-3 text-xl font-medium text-[#232323]">Location</h2>

                <div className="space-y-3">
                  {/* Online Business Toggle */}
                  <div className="flex w-full items-center justify-between rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#272727]">Online-Geschäft</span>
                      <span className="text-xs text-[#7A7A7A]">Kein physischer Standort</span>
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
                          <span className="text-xs font-normal leading-[15px] text-[#999999]">
                            Straße
                          </span>
                          <input
                            ref={streetInputRef}
                            className="border-0 bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] outline-none placeholder:text-[#999999] focus:border-0 focus:outline-none focus:ring-0"
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
                          <span className="text-xs font-normal leading-[15px] text-[#999999]">
                            PLZ
                          </span>
                          <input
                            ref={zipInputRef}
                            className="border-0 bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] outline-none placeholder:text-[#999999] focus:border-0 focus:outline-none focus:ring-0"
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
                          <span className="text-xs font-normal leading-[15px] text-[#999999]">
                            Stadt *
                          </span>
                          <input
                            ref={cityInputRef}
                            className="border-0 bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] outline-none placeholder:text-[#999999] focus:border-0 focus:outline-none focus:ring-0"
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
                          <span className="text-xs font-normal leading-[15px] text-[#999999]">
                            Land *
                          </span>
                          <input
                            ref={countryInputRef}
                            className="border-0 bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] outline-none placeholder:text-[#999999] focus:border-0 focus:outline-none focus:ring-0"
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
                          <label
                            className="cursor-pointer text-sm font-medium leading-[18px] text-[#272727]"
                            htmlFor="showAddress"
                          >
                            Adresse anzeigen
                          </label>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E5E5E5] bg-white px-4 py-8">
                      <Icon className="mb-3 h-12 w-12 text-primary" icon="mdi:web" />
                      <p className="mb-1 text-center text-sm font-medium text-[#272727]">
                        Online-Geschäft
                      </p>
                      <p className="text-center text-xs text-[#7A7A7A]">
                        Dein Geschäft wird als &ldquo;Online&rdquo; angezeigt
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="px-3 text-xl font-medium text-[#232323]">Contact</h2>

                <div className="space-y-3">
                  <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal leading-[15px] text-[#999999]">
                        Website
                      </span>
                      <input
                        ref={websiteInputRef}
                        className="border-0 bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] outline-none placeholder:text-[#999999] focus:border-0 focus:outline-none focus:ring-0"
                        placeholder="Website eingeben"
                        type="url"
                        value={formData.website}
                        onBlur={() => {
                          const normalizedWebsite = normalizeWebsiteUrl(formData.website) ?? '';
                          if (normalizedWebsite !== formData.website) {
                            handleInputChange('website', normalizedWebsite);
                          }
                        }}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, instagramInputRef)}
                      />
                    </div>
                  </div>

                  <div className="flex h-[54px] w-full items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal leading-[15px] text-[#999999]">
                        Instagram
                      </span>
                      <input
                        ref={instagramInputRef}
                        className="border-0 bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] outline-none placeholder:text-[#999999] focus:border-0 focus:outline-none focus:ring-0"
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
                      <span className="text-xs font-normal leading-[15px] text-[#999999]">
                        Telefon
                      </span>
                      <input
                        ref={phoneInputRef}
                        className="border-0 bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] outline-none placeholder:text-[#999999] focus:border-0 focus:outline-none focus:ring-0"
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
                      <span className="text-xs font-normal leading-[15px] text-[#999999]">
                        Email
                      </span>
                      <input
                        ref={emailInputRef}
                        className="border-0 bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] outline-none placeholder:text-[#999999] focus:border-0 focus:outline-none focus:ring-0"
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
                <h2 className="px-3 text-xl font-medium text-[#232323]">Media</h2>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs text-[#999999]">Bilder hochladen</label>
                    <button
                      className="flex h-[54px] w-full flex-col items-start justify-center gap-4 rounded-[12px] border border-[#D4D4D4] bg-white p-4 hover:bg-gray-50"
                      type="button"
                      onClick={() => router.push('/create/media')}
                    >
                      <div className="flex h-6 w-full flex-row items-center gap-3 p-0">
                        <Icon
                          className="h-6 w-6 flex-shrink-0 text-[#232323]"
                          icon="lucide:image-up"
                        />
                        <span className="flex items-center whitespace-nowrap font-inter-tight text-base font-semibold leading-[19px] text-[#232323]">
                          Bilder hochladen
                          {formData.images.length > 0 ? ` (${formData.images.length})` : ''}
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
              trailingIcon:
                currentStep === STEPS.length - 1 ? undefined : 'material-symbols:chevron-right',
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
              onClick: handleNextClick,
              disabled: buttonDisabled,
              variant: 'primary',
            }}
          />
        )}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';
import { PageHeader, ScrollablePageLayout, PageContent } from '@/components/layout';
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/AddressAutocomplete';
import { validateAddress, validateZipCode } from '@/utils/addressValidation';
import { FooterAction } from '@/components/ui/FooterAction';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { useAuth } from '@/providers/auth-provider';
import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';

export default function LocationPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
  }>({});
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();
  
  // Show manual fields if user has already entered data manually, or if they want to edit
  // Must be initialized AFTER formData is available
  const [showManualFields, setShowManualFields] = useState(() => {
    // Check if user manually entered data (not from autocomplete)
    const hasManualData = !!(formData.street || formData.city || formData.zip || formData.country);
    return hasManualData;
  });

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

  // Mobile detection
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 640);
      setChecked(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);



  // Store initial address value in a ref to avoid any memoization issues
  // Must be initialized AFTER formData is available
  const initialAddressValueRef = useRef({
    city: formData.city || '',
    country: formData.country || '',
    street: formData.street || '',
    zip: formData.zip || '',
  });
  
  // Note: We no longer auto-hide manual fields after autocomplete
  // User can manually toggle via the "Edit fields" button

  // Handle address autocomplete selection - completely stable callback
  const handleAddressSelect = useCallback((address: AddressComponents) => {
    // Call directly - updateFormData is stable (useCallback with empty deps)
    updateFormData({
      city: address.city,
      country: address.country,
      street: address.street,
      zip: address.zip,
    });
    
    // Clear validation errors after auto-fill
    setValidationErrors({});
    // Keep manual fields hidden after autocomplete (user can click "Edit fields" to show them)
  }, [updateFormData]); // Only updateFormData is stable

  // Loading state
  if (!checked || isLoading) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  // Desktop redirect
  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">
          {t('create.location.desktopMessage')}
        </span>
      </div>
    );
  }

  // Authentication check - redirect to login with return URL
  if (!user) {
    const returnUrl = encodeURIComponent('/create/location');
    return (
      <ScrollablePageLayout>
        <PageHeader title={t('create.location.title')} variant="title-only" />

        <PageContent className="flex flex-1 flex-col items-center justify-center">
          <span className="text-center text-lg text-content-heading mb-6">
            {t('create.location.loginRequired')}
          </span>
          <button
            className="w-full max-w-[280px] rounded-xl bg-primary px-6 py-4 font-semibold text-base text-white transition-colors hover:bg-primary-dark"
            onClick={() => router.push(`/login?returnUrl=${returnUrl}`)}
          >
            {t('create.location.goToLogin')}
          </button>
        </PageContent>
      </ScrollablePageLayout>
    );
  }

  const handleSave = () => {
    // Validate and set errors only when clicking the button
    const validation = validateAddress({
      street: formData.street,
      zip: formData.zip,
      city: formData.city,
      country: formData.country,
      isOnlineBusiness: formData.isOnlineBusiness,
    });

    setValidationErrors(validation.errors);
    
    if (validation.isValid || formData.isOnlineBusiness) {
      router.push('/create/contact');
    }
  };

  // Validate form fields
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

  // Validate ZIP code based on country
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

  const isFormValid = () => {
    // If it's an online business, no location is required
    if (formData.isOnlineBusiness) {
      return true;
    }
    
    // Validate all fields
    const validation = validateAddress({
      street: formData.street,
      zip: formData.zip,
      city: formData.city,
      country: formData.country,
      isOnlineBusiness: formData.isOnlineBusiness,
    });

    // DON'T set validation errors here - it causes infinite loop when called during render
    return validation.isValid;
  };

  return (
    <ScrollablePageLayout>
      <PageHeader
        title={t('create.location.title')}
        variant="back-and-title"
        onBack="/create/basics"
      />

      <PageContent hasFooter className="flex flex-col gap-6">
          {/* Step Indicator */}
          <div className="mb-6">
            <StepIndicator currentStep={1} steps={STEPS} />
          </div>

          {/* Subtitle */}
          <div className="flex flex-col items-start px-3 py-0 space-y-3 w-full">
            <p className="font-normal text-base leading-[19px] text-[#7A7A7A] text-left mb-6">
              {t('create.location.description')}
            </p>
          </div>

          {/* Online Business Toggle */}
          <div className="flex items-center justify-between w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3 mb-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#272727]">
                {t('create.location.onlineBusiness')}
              </span>
              <span className="text-xs text-[#7A7A7A]">
                {t('create.location.noPhysicalLocation')}
              </span>
            </div>
            <button
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                formData.isOnlineBusiness ? 'bg-primary' : 'bg-gray-200'
              }`}
              onClick={() => {
                const newIsOnline = !formData.isOnlineBusiness;
                updateFormData({ 
                  isOnlineBusiness: newIsOnline,
                  // If switching to online, clear address fields and set showAddress to false
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

          {/* Form Fields */}
          {!formData.isOnlineBusiness ? (
            <div className="flex flex-col gap-4 w-full">
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
                    <p className="text-xs text-[#7A7A7A]">{t('create.location.addressAutoFill')}</p>
                    {!showManualFields ? (
                      <button
                        className="text-xs text-primary hover:text-primary-dark hover:underline cursor-pointer z-10 relative"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowManualFields(true);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        {t('create.location.editFields')}
                      </button>
                    ) : (
                      <button
                        className="text-xs text-[#7A7A7A] hover:underline cursor-pointer z-10 relative"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowManualFields(false);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        {t('create.location.hideFields')}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Manual Fields - Collapsible */}
              {showManualFields && (
                <div className="flex flex-col gap-4 pt-2 border-t border-gray-100">
                  {/* Street */}
              <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
                <div className="flex w-full flex-col gap-1">
                  <label className="text-xs leading-[15px] text-[#999999]">
                    {t('create.location.street')}
                  </label>
                  <input
                    className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
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
                  <label className="text-xs leading-[15px] text-[#999999]">
                    {t('create.location.zip')}
                  </label>
                  <input
                    className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
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
                  <label className="text-xs leading-[15px] text-[#999999]">
                    {t('create.location.city')}
                  </label>
                  <input
                    required
                    className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
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
                  <label className="text-xs leading-[15px] text-[#999999]">
                    {t('create.location.country')}
                  </label>
                  <input
                    required
                    className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                    placeholder={t('create.location.enterCountry')}
                    type="text"
                    value={formData.country}
                    onChange={(e) => {
                      updateFormData({ country: e.target.value });
                      validateField('country');
                      // Re-validate ZIP when country changes
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
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl border border-[#D4D4D4] bg-white">
              <Icon className="h-12 w-12 text-primary mb-3" icon="mdi:web" />
              <p className="text-sm font-medium text-[#272727] text-center mb-1">
                {t('create.location.onlineBusiness')}
              </p>
              <p className="text-xs text-[#7A7A7A] text-center">
                {t('create.location.onlineBusinessDisplay')}
              </p>
            </div>
          )}
      </PageContent>

      <FooterAction
        actionButton={{
          label: t('common.next'),
          trailingIcon: 'lucide:chevron-right',
          onClick: handleSave,
          disabled: !isFormValid(),
          variant: 'primary',
        }}
      />
    </ScrollablePageLayout>
  );
}

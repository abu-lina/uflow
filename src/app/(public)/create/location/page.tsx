'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/AddressAutocomplete';
import { validateAddress, validateZipCode } from '@/utils/addressValidation';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { useAuth } from '@/providers/auth-provider';
import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';

export default function LocationPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const [validationErrors, setValidationErrors] = useState<{
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
  }>({});
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
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


  // Scroll detection for sticky header with iOS boundary handling
  useEffect(() => {
    // Use setTimeout to ensure DOM is ready (fixes iOS initial scroll issue)
    const timer = setTimeout(() => {
      scrollContainerRef.current = document.querySelector('.content-scroll-container');
      const contentContainer = scrollContainerRef.current;
      
      if (!contentContainer) return;
      
      const SCROLL_THRESHOLD = 10; // Min px at top before header can hide
      const MIN_SCROLL_DELTA = 8; // Increased for iOS sensitivity
      const BOUNDARY_BUFFER = 50; // Buffer zone for bottom boundary (iOS rubber band)
      
      let ticking = false; // Throttle using requestAnimationFrame
      
      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const currentScrollY = contentContainer?.scrollTop || 0;
            const scrollDifference = currentScrollY - lastScrollY.current;
            
            // Calculate if we're near the bottom (iOS rubber band protection)
            const scrollHeight = contentContainer.scrollHeight;
            const clientHeight = contentContainer.clientHeight;
            const distanceFromBottom = scrollHeight - clientHeight - currentScrollY;
            const isNearBottom = distanceFromBottom < BOUNDARY_BUFFER;
            
            // Ignore tiny scroll movements to prevent jitter
            if (Math.abs(scrollDifference) < MIN_SCROLL_DELTA) {
              ticking = false;
              return;
            }
            
            // Ignore scroll changes when near bottom (iOS rubber band effect)
            if (isNearBottom) {
              ticking = false;
              return;
            }
            
            // Always show header when at the top
            if (currentScrollY <= SCROLL_THRESHOLD) {
              setIsHeaderSticky(true);
            }
            // Hide when scrolling down (past threshold)
            else if (scrollDifference > 0) {
              setIsHeaderSticky(false);
            }
            // Show when scrolling up (past threshold)
            else if (scrollDifference < 0) {
              setIsHeaderSticky(true);
            }
            
            lastScrollY.current = currentScrollY;
            ticking = false;
          });
          
          ticking = true;
        }
      };

      contentContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        contentContainer.removeEventListener('scroll', handleScroll);
      };
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
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
      <div className="relative flex w-full flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
        <PageHeader isVisible={true} title={t('create.location.title')} />
        <HeaderSpacer isVisible={true} />

        {/* Main Content */}
        <div className="flex flex-1 flex-col items-center justify-center px-safe-24 pt-20 mobile-nav-spacing">
          <span className="text-center text-lg text-content-title mb-6">
            {t('create.location.loginRequired')}
          </span>
          <button
            className="w-full max-w-[280px] rounded-xl bg-primary px-6 py-4 font-semibold text-base text-white transition-colors hover:bg-primary-dark"
            onClick={() => router.push(`/login?returnUrl=${returnUrl}`)}
          >
            {t('create.location.goToLogin')}
          </button>
        </div>
      </div>
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
    <div className="relative flex h-screen w-full flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
      <PageHeader
        isVisible={isHeaderSticky}
        title={t('create.location.title')}
        variant="back-and-title"
        onBack="/create/basics"
      />
      <HeaderSpacer isVisible={isHeaderSticky} />

      {/* Content */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-safe-24 pt-8 mobile-nav-spacing overflow-y-auto">
        <div className="flex w-full flex-1 flex-col gap-6">
          {/* Step Indicator */}
          <div className="mb-6">
            <StepIndicator currentStep={1} steps={STEPS} />
          </div>

          {/* Subtitle */}
          <div className="flex flex-col items-start px-3 py-0 space-y-3 w-full">
            <p className="font-normal text-base leading-[19px] text-[#7A7A7A] text-left">
              {t('create.location.description')}
            </p>
          </div>

          {/* Online Business Toggle */}
          <div className="flex items-center justify-between w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#272727]">
                {t('create.location.onlineBusiness')}
              </span>
              <span className="text-xs text-[#7A7A7A]">
                {t('create.location.noPhysicalLocation')}
              </span>
            </div>
            <button
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#589D96] focus:ring-offset-2 ${
                formData.isOnlineBusiness ? 'bg-[#589D96]' : 'bg-gray-200'
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
                        className="text-xs text-[#589D96] hover:underline cursor-pointer z-10 relative"
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
              <Icon className="h-12 w-12 text-[#589D96] mb-3" icon="mdi:web" />
              <p className="text-sm font-medium text-[#272727] text-center mb-1">
                {t('create.location.onlineBusiness')}
              </p>
              <p className="text-xs text-[#7A7A7A] text-center">
                {t('create.location.onlineBusinessDisplay')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navbar */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-[80px] w-full items-center justify-center px-safe-24 pb-4">
          <button
            className={`flex h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-opacity ${
              !isFormValid() 
                ? 'bg-[#589D96] opacity-30 cursor-not-allowed' 
                : 'bg-[#589D96] opacity-100'
            }`}
            disabled={!isFormValid()}
            onClick={handleSave}
          >
            <span className="text-base font-medium text-white leading-[19px]">
              {t('common.next')}
            </span>
            <Icon className="h-6 w-6 text-white" icon="lucide:chevron-right" />
          </button>
        </div>
      </div>
    </div>
  );
}

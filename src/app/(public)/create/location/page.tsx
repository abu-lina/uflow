'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { useAuth } from '@/providers/auth-provider';
import { useFormData } from '@/providers/form-provider';

const STEPS = [
  {
    title: 'Basics',
    icon: 'mdi:information',
  },
  {
    title: 'Location',
    icon: 'mdi:map-marker',
  },
  {
    title: 'Contact',
    icon: 'mdi:account-group',
  },
  {
    title: 'Media',
    icon: 'mdi:image-multiple',
  },
];

export default function LocationPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { formData, updateFormData } = useFormData();

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

  // Loading state
  if (!checked || isLoading) {
    return <div className="p-8 text-center">Lädt...</div>;
  }

  // Desktop redirect
  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">
          Bitte nutze die Mobile-Ansicht für die Adresseingabe.
        </span>
      </div>
    );
  }

  // Authentication check - redirect to login with return URL
  if (!user) {
    const returnUrl = encodeURIComponent('/create/location');
    return (
      <div className="relative flex w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
        {/* Sticky Header */}
        <div className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-safe-top">
          <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
            {/* Left-aligned Title */}
            <h1 className="text-xl font-semibold text-content-title">
              Standort
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 pt-20 mobile-nav-spacing">
          <span className="text-center text-lg text-content-title mb-6">
            Du musst angemeldet sein, um einen Standort anzugeben.
          </span>
          <button
            className="w-full max-w-[280px] rounded-xl bg-primary px-6 py-4 font-semibold text-base text-white transition-colors hover:bg-primary-dark"
            onClick={() => router.push(`/login?returnUrl=${returnUrl}`)}
          >
            Zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    router.push('/create/contact');
  };

  const isFormValid = () => {
    // If it's an online business, no location is required
    if (formData.isOnlineBusiness) {
      return true;
    }
    // Otherwise, city and country are required
    return formData.city && formData.country;
  };

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
      {/* Single Sticky Header */}
      <div className={`fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-safe-top transition-all duration-500 ease-in-out ${
        isHeaderSticky ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
          {/* Back Button */}
          <button
            className="flex h-8 w-8 items-center justify-center"
            onClick={() => router.push('/create/basics')}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          
          {/* Title */}
          <div className="flex flex-1 items-center justify-start">
            <h1 className="text-xl font-semibold text-content-title leading-[29px]">
              Standort
            </h1>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content jump */}
      <div className={`transition-all duration-300 ${
        isHeaderSticky ? 'h-16' : 'h-0'
      }`} />

      {/* Content */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-8 mobile-nav-spacing overflow-y-auto">
        <div className="flex w-full max-w-[361px] flex-1 flex-col gap-6">
          {/* Step Indicator */}
          <div className="mb-6">
            <StepIndicator currentStep={1} steps={STEPS} />
          </div>

          {/* Subtitle */}
          <div className="flex flex-col items-start px-3 py-0 space-y-3 w-full">
            <p className="font-normal text-base leading-[19px] text-[#7A7A7A] text-left">
              Gib deinen Standort an, damit andere dich finden können.
            </p>
          </div>

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
              {/* Street */}
              <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
                <div className="flex w-full flex-col gap-1">
                  <label className="text-xs leading-[15px] text-[#999999]">
                    Straße
                  </label>
                  <input
                    className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                    placeholder="Straße eingeben"
                    type="text"
                    value={formData.street}
                    onChange={(e) => updateFormData({ street: e.target.value })}
                  />
                </div>
              </div>

              {/* ZIP */}
              <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
                <div className="flex w-full flex-col gap-1">
                  <label className="text-xs leading-[15px] text-[#999999]">
                    PLZ
                  </label>
                  <input
                    className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                    placeholder="PLZ eingeben"
                    type="text"
                    value={formData.zip}
                    onChange={(e) => updateFormData({ zip: e.target.value })}
                  />
                </div>
              </div>

              {/* City */}
              <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
                <div className="flex w-full flex-col gap-1">
                  <label className="text-xs leading-[15px] text-[#999999]">
                    Stadt *
                  </label>
                  <input
                    required
                    className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                    placeholder="Stadt eingeben"
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateFormData({ city: e.target.value })}
                  />
                </div>
              </div>

              {/* Country */}
              <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
                <div className="flex w-full flex-col gap-1">
                  <label className="text-xs leading-[15px] text-[#999999]">
                    Land *
                  </label>
                  <input
                    required
                    className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                    placeholder="Land eingeben"
                    type="text"
                    value={formData.country}
                    onChange={(e) => updateFormData({ country: e.target.value })}
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
                  onClick={() => updateFormData({ showAddress: !formData.showAddress })}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.showAddress ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          ) : (
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
      </div>

      {/* Navbar */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-[80px] w-full items-center justify-center px-4 pb-4">
          <button
            className={`flex h-[48px] w-full max-w-[345px] items-center justify-center gap-2 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-opacity ${
              !isFormValid() 
                ? 'bg-[#589D96] opacity-30 cursor-not-allowed' 
                : 'bg-[#589D96] opacity-100'
            }`}
            disabled={!isFormValid()}
            onClick={handleSave}
          >
            <span className="text-base font-medium text-white leading-[19px]">
              Weiter
            </span>
            <Icon className="h-6 w-6 text-white" icon="lucide:chevron-right" />
          </button>
        </div>
      </div>
    </div>
  );
}

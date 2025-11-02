'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { useAuth } from '@/providers/auth-provider';
import { useFormData } from '@/providers/form-provider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { useLanguage } from '@/providers/LanguageProvider';

export default function ContactPage() {
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();

  // Use centralized mobile detection
  const isMobile = useIsSmallMobile();

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
  if (isLoading) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  // Desktop redirect
  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">
          {t('create.contact.desktopMessage')}
        </span>
      </div>
    );
  }

  // Authentication check - redirect to login with return URL
  if (!user) {
    const returnUrl = encodeURIComponent('/create/contact');
    return (
      <div className="relative flex w-full flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
        <PageHeader isVisible={true} title={t('create.contact.title')} />
        <HeaderSpacer isVisible={true} />

        {/* Main Content */}
        <div className="flex flex-1 flex-col items-center justify-center px-safe-24 pt-20 mobile-nav-spacing">
          <span className="text-center text-lg text-content-title mb-6">
            {t('create.contact.loginRequired')}
          </span>
          <button
            className="w-full max-w-[280px] rounded-xl bg-primary px-6 py-4 font-semibold text-base text-white transition-colors hover:bg-primary-dark"
            onClick={() => router.push(`/login?returnUrl=${returnUrl}`)}
          >
            {t('create.contact.goToLogin')}
          </button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    router.push('/create/media');
  };

  return (
    <div className="relative flex h-screen w-full flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
      <PageHeader
        isVisible={isHeaderSticky}
        title={t('create.contact.title')}
        variant="back-and-title"
        onBack="/create/location"
      />
      <HeaderSpacer isVisible={isHeaderSticky} />

      {/* Content */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-safe-24 pt-8 mobile-nav-spacing overflow-y-auto">
        <div className="flex w-full flex-1 flex-col gap-6">
          {/* Step Indicator */}
          <div className="mb-6">
            <StepIndicator currentStep={2} steps={STEPS} />
          </div>

          {/* Subtitle */}
          <div className="flex flex-col items-start px-3 py-0 space-y-3 w-full">
            <p className="font-normal text-base leading-[19px] text-[#7A7A7A] text-left">
              {t('create.contact.description')}
            </p>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-4 w-full">
            {/* Website */}
            <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
              <div className="flex w-full flex-col gap-1">
                <label className="text-xs leading-[15px] text-[#999999]">
                  {t('create.contact.website')}
                </label>
                <input
                  className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
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
                <label className="text-xs leading-[15px] text-[#999999]">
                  {t('create.contact.instagram')}
                </label>
                <input
                  className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
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
                <label className="text-xs leading-[15px] text-[#999999]">
                  {t('create.contact.phone')}
                </label>
                <input
                  className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
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
                <label className="text-xs leading-[15px] text-[#999999]">
                  {t('create.contact.email')}
                </label>
                <input
                  className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                  placeholder={t('create.contact.emailPlaceholder')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData({ email: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-[80px] w-full items-center justify-center px-safe-24 pb-4">
          <button
            className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 bg-[#589D96] shadow-[0px_8px_24px_rgba(88,157,150,0.25)]"
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

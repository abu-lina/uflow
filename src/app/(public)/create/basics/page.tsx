'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { ProviderCreateForm } from '@/features/providers/ProviderCreateForm';
import { useAuth } from '@/providers/auth-provider';

export default function CreateBasicsPage() {
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);
  const lastScrollY = useRef(0);
  const router = useRouter();
  const { user, isLoading } = useAuth();

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

  // Scroll detection for sticky header
  useEffect(() => {
    const handleScroll = () => {
      const contentContainer = document.querySelector('.content-scroll-container');
      if (!contentContainer) return;
      
      const currentScrollY = contentContainer.scrollTop || 0;
      const scrollDifference = currentScrollY - lastScrollY.current;
      
      // Always show if at top
      if (currentScrollY <= 100) {
        setIsHeaderSticky(true);
      }
      // Show when scrolling up past 100px
      else if (currentScrollY > 100 && scrollDifference < 0) {
        setIsHeaderSticky(true);
      }
      // Hide when scrolling down past 100px
      else if (currentScrollY > 100 && scrollDifference > 0) {
        setIsHeaderSticky(false);
      }
      
      lastScrollY.current = currentScrollY;
    };
    
    const contentContainer = document.querySelector('.content-scroll-container');
    if (contentContainer) {
      contentContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => contentContainer.removeEventListener('scroll', handleScroll);
    }
  }, [isHeaderSticky]);

  // Loading state
  if (!checked || isLoading) {
    return <div className="p-8 text-center">Lädt...</div>;
  }

  // Desktop redirect
  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">
          Bitte nutze die Mobile-Ansicht für die Angebotserstellung.
        </span>
      </div>
    );
  }

  // Authentication check - redirect to login with return URL
  if (!user) {
    const returnUrl = encodeURIComponent('/create/basics');
    return (
      <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
        {/* Sticky Header */}
        <div className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl">
          <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
            {/* Left-aligned Title */}
            <h1 className="text-xl font-semibold text-content-title">
              Angebot erstellen
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 pt-20 pb-mobile-nav-md">
          <span className="text-center text-lg text-content-title mb-6">
            Du musst angemeldet sein, um ein Angebot zu erstellen.
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

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Single Sticky Header */}
      <div className={`fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl transition-transform duration-300 ${
        isHeaderSticky ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
          {/* Back Button */}
          <button
            className="flex h-8 w-8 items-center justify-center"
            onClick={() => router.push('/create')}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          
          {/* Title */}
          <div className="flex flex-1 items-center justify-start">
            <h1 className="text-xl font-semibold text-content-title leading-[29px]">
              Angebot erstellen
            </h1>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content jump */}
      <div className={`transition-all duration-300 ${
        isHeaderSticky ? 'h-16' : 'h-0'
      }`} />

      {/* Content */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-8 pb-8 overflow-y-auto">
        <div className="flex w-full max-w-[361px] flex-1 flex-col">
          <ProviderCreateForm 
            onNextStep={() => {
              // Navigate to location page
              router.push('/create/location');
            }}
          />
        </div>
      </div>

    </div>
  );
}
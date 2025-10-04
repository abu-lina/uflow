'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { Icon } from '@iconify/react';

import { ProviderCreateForm } from '@/features/providers/ProviderCreateForm';
import { useAuth } from '@/providers/auth-provider';

export default function CreateProviderPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const lastScrollY = useRef(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 640);
      setChecked(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Clear localStorage when starting a fresh provider creation (no URL params)
  useEffect(() => {
    const hasUrlParams = searchParams && Array.from(searchParams.keys()).length > 0;
    if (!hasUrlParams) {
      // Clear any previous provider images when starting fresh
      localStorage.removeItem('providerImages');
    }
  }, [searchParams]);

  useEffect(() => {
    if (checked && !isMobile) {
      // Optionally redirect to profile creation tab on desktop
      router.replace('/profile');
    }
  }, [isMobile, checked, router]);

  // Scroll detection for sticky header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
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

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHeaderSticky]);

  if (!checked || isLoading) {
    return <div className="p-8 text-center">Lädt...</div>;
  }

  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">
          Bitte nutze die Desktop-Ansicht für die Erstellung.
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
        {/* Sticky Header */}
        <div className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl">
          <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
            {/* Left-aligned Title */}
            <h1 className="text-xl font-semibold text-content-title">
              Erstellen
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 pt-20 pb-mobile-nav-md">
          <span className="text-center text-lg text-content-title mb-6">
            Du musst angemeldet sein, um Inhalte zu erstellen.
          </span>
          <button
            className="w-full max-w-[280px] rounded-xl bg-primary px-6 py-4 font-semibold text-base text-white transition-colors hover:bg-primary-dark"
            onClick={() => router.push('/login')}
          >
            Zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Single Sticky Header */}
      <div className={`fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl transition-transform duration-300 ${
        isHeaderSticky ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
          {/* Left side: Chevron + Title */}
          <div className="flex items-center">
            <button
              className="flex h-8 w-8 items-center justify-center"
              onClick={() => router.push('/providers')}
            >
              <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
            </button>
            <h1 className="ml-2 text-xl font-semibold text-content-title">
              Anbieter erstellen
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content - Always starts below header */}
      <div className="flex flex-1 flex-col items-center px-4 pt-20 pb-mobile-nav-md overflow-y-auto">
        <ProviderCreateForm searchParams={searchParams} />
      </div>
    </div>
  );
}

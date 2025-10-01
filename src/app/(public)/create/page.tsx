'use client';

import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { Icon } from '@iconify/react';

import { MobileLoginScreen } from '@/components/common/MobileLoginScreen';
import { ProviderCreateForm } from '@/features/providers/ProviderCreateForm';
import { useAuth } from '@/providers/auth-provider';

export default function CreateProviderPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 640);
      setChecked(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (checked && !isMobile) {
      // Optionally redirect to profile creation tab on desktop
      router.replace('/profile');
    }
  }, [isMobile, checked, router]);

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
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-4">
        <span className="text-center text-lg text-gray-500">
          Du musst angemeldet sein, um einen Provider zu erstellen.
        </span>
        <button
          className="rounded-xl bg-mint px-4 py-2 font-semibold text-white"
          onClick={() => setShowLoginModal(true)}
        >
          Zur Anmeldung
        </button>
        {showLoginModal && <MobileLoginScreen onClose={() => setShowLoginModal(false)} />}
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Header */}
      <div className="mb-6 flex h-12 w-full items-center px-4 pt-4">
        {/* Left side: Chevron + Title */}
        <div className="flex items-center">
          <button
            className="flex h-8 w-8 items-center justify-center"
            onClick={() => router.back()}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          <h1 className="ml-2 font-inter-tight text-xl font-bold text-[#232323]">
            CreateSouk
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center justify-between px-4 py-12">
        <ProviderCreateForm searchParams={searchParams} />
      </div>
    </div>
  );
}

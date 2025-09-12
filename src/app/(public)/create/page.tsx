'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { MobileLoginScreen } from '@/components/common/MobileLoginScreen';
import { ProviderCreateForm } from '@/features/providers/ProviderCreateForm';
import { useAuth } from '@/providers/auth-provider';

export default function CreateProviderPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);
  const router = useRouter();
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
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <h1 className="mb-4 w-full text-left text-2xl font-bold">Provider erstellen</h1>
      <ProviderCreateForm />
    </div>
  );
}

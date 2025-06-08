'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { SoukCreateForm } from '@/features/souks/SoukCreateForm';

export default function CreateSoukPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);
  const router = useRouter();

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

  if (!checked) {
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

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <h1 className="mb-4 w-full text-left text-2xl font-bold">Souk erstellen</h1>
      <SoukCreateForm />
    </div>
  );
}

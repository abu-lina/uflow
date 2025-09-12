'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { ProviderCardModal } from '@/components/providers/ProviderCardModal';
import { ProviderDetailModal } from '@/components/providers/ProviderDetailModal';
import type { Provider } from '@/services/providers';

interface ProviderModalWrapperProps {
  provider: Provider;
}

export default function ProviderModalWrapper({ provider }: ProviderModalWrapperProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleClose = () => {
    router.push('/providers');
  };

  return isMobile ? (
    <ProviderCardModal open={true} provider={provider} onClose={handleClose} />
  ) : (
    <ProviderDetailModal provider={provider} onClose={handleClose} />
  );
}

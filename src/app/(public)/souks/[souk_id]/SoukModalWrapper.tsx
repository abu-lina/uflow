'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { SoukCardModal } from '@/components/souks/SoukCardModal';
import { SoukDetailModal } from '@/components/souks/SoukDetailModal';
import type { Souk } from '@/services/souks';

interface SoukModalWrapperProps {
  souk: Souk;
}

export default function SoukModalWrapper({ souk }: SoukModalWrapperProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleClose = () => {
    router.push('/souks');
  };

  return isMobile ? (
    <SoukCardModal open={true} souk={souk} onClose={handleClose} />
  ) : (
    <SoukDetailModal souk={souk} onClose={handleClose} />
  );
}

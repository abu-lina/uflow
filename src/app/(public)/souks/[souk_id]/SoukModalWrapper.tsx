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
    <SoukCardModal
      address_city={souk.address_city || ''}
      address_street={souk.address_street || ''}
      address_zip={souk.address_zip || ''}
      barakah_effects={souk.barakah_effects || []}
      category={souk.category?.name_de || ''}
      contact_phone={souk.contact_phone || undefined}
      description={souk.souk_description || ''}
      imageUrl={(() => {
        try {
          if (!souk.souk_images) return '/images/placeholder.jpg';
          let imagesData: { urls?: string[] } = {};
          if (typeof souk.souk_images === 'string') {
            imagesData = JSON.parse(souk.souk_images);
          } else if (Array.isArray(souk.souk_images)) {
            imagesData.urls = souk.souk_images;
          } else if (
            typeof souk.souk_images === 'object' &&
            souk.souk_images !== null &&
            'urls' in souk.souk_images &&
            Array.isArray((souk.souk_images as { urls?: unknown }).urls)
          ) {
            imagesData = souk.souk_images as { urls?: string[] };
          }
          if (imagesData.urls && imagesData.urls.length > 0) {
            return imagesData.urls[0];
          }
          return '/images/placeholder.jpg';
        } catch {
          return '/images/placeholder.jpg';
        }
      })()}
      open={true}
      social_website={souk.social_website || undefined}
      souk_id={souk.souk_id}
      title={souk.souk_name}
      onClose={handleClose}
    />
  ) : (
    <SoukDetailModal souk={souk} onClose={handleClose} />
  );
}

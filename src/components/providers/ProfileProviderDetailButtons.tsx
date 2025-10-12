'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useIsMobile } from '@/hooks/useIsMobile';

interface ProfileProviderDetailButtonsProps {
  providerId: string;
}

export function ProfileProviderDetailButtons({ providerId }: ProfileProviderDetailButtonsProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

  const handleEditAction = () => {
    router.push(`/profile/providers/${providerId}/edit`);
  };

  const handleMoreActions = () => {
    // Open more actions menu or modal
    console.log('More actions clicked');
  };

  if (isMobile) {
    return (
      <>
        {/* Mobile Edit Button */}
        <button
          aria-label="Provider bearbeiten"
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#589D96] text-base font-medium text-white shadow transition hover:bg-[#4a8a84]"
          onClick={handleEditAction}
        >
          <Icon className="h-5 w-5" icon="material-symbols:edit" />
          Bearbeiten
        </button>

        {/* Mobile More Actions Button */}
        <button
          aria-label="Weitere Aktionen"
          className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#CDCDCD] bg-white/70 backdrop-blur-sm"
          onClick={handleMoreActions}
        >
          <Icon className="h-5 w-5 text-gray-700" icon="material-symbols:more-horiz" />
        </button>
      </>
    );
  }

  return (
    <>
      {/* Desktop Edit Button */}
      <button
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#589D96] py-3 px-6 font-inter-tight font-medium text-white hover:bg-[#4a8a84] transition-colors"
        onClick={handleEditAction}
      >
        <Icon className="h-5 w-5" icon="material-symbols:edit" />
        Bearbeiten
      </button>

      {/* Desktop More Actions Button */}
      <button
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 px-6 font-inter-tight font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        onClick={handleMoreActions}
      >
        <Icon className="h-5 w-5" icon="material-symbols:more-horiz" />
        ...
      </button>
    </>
  );
}

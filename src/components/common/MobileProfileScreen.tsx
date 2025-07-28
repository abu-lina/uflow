import { useRef, useState } from 'react';

import { Icon } from '@iconify/react';

import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/providers/auth-provider';

interface MobileProfileScreenProps {
  onClose: () => void;
}

const SWIPE_AREA_HEIGHT = 48; // px

export const MobileProfileScreen: React.FC<MobileProfileScreenProps> = ({ onClose }) => {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';
  const email = user?.email || '';
  const displayName = user?.user_metadata?.display_name || `${firstName} ${lastName}` || email;

  // Swipe-to-close logic (mobile UX)
  const [dragY, setDragY] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const allowSwipe = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);

  function handleTouchStart(e: React.TouchEvent) {
    if ((e.currentTarget as HTMLElement).scrollTop > 0) return;
    const modal = modalRef.current;
    if (modal) {
      const rect = modal.getBoundingClientRect();
      const touchY = e.touches[0].clientY - rect.top;
      if (touchY < SWIPE_AREA_HEIGHT) {
        // Only allow swipe-to-close if touch starts in top SWIPE_AREA_HEIGHT px
        allowSwipe.current = true;
        touchStartY.current = e.touches[0].clientY;
        setDragY(0);
      } else {
        allowSwipe.current = false;
        touchStartY.current = null;
      }
    }
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (!allowSwipe.current || touchStartY.current === null) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    }
    if (deltaY > 150) {
      onClose();
      touchStartY.current = null;
      setDragY(0);
      allowSwipe.current = false;
    }
  }
  function handleTouchEnd() {
    setDragY(0);
    touchStartY.current = null;
    allowSwipe.current = false;
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[99] bg-black/40" onClick={onClose} />
      {/* Modal container */}
      <div
        ref={modalRef}
        className="fixed inset-x-0 bottom-0 top-6 z-[100] flex items-start justify-center"
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY === 0 ? 'transform 0.2s cubic-bezier(0.4,0,0.2,1)' : undefined,
        }}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
      >
        <div className="hide-scrollbar animate-fadeInUp relative h-full w-full max-w-[393px] overflow-y-auto rounded-t-[29.4px] bg-white pb-6 sm:rounded-[29.4px]">
          {/* Drag handle for swipe-to-close */}
          <div className="mx-auto mb-1 mt-2 h-1.5 w-12 rounded-full bg-zinc-300 opacity-70" />
          {/* Close Button */}
          <button
            aria-label="Schließen"
            className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/80 shadow"
            onClick={onClose}
          >
            <Icon className="h-5 w-5 text-gray-700" icon="material-symbols:close-rounded" />
          </button>
          {/* Header */}
          <div className="flex h-[90px] w-full flex-col items-center">
            <div className="h-[40px] w-full" />
            <div className="flex h-[50px] w-full flex-row items-center justify-between px-4">
              <div className="flex h-[50px] w-[50px] items-center justify-center">
                <Logo height={48} width={48} />
              </div>
            </div>
          </div>
          {/* Content */}
          <div className="z-10 flex w-full flex-col items-center gap-6 px-4">
            <div className="flex h-[155px] w-full flex-col items-center gap-2">
              <div className="flex w-full flex-col items-center gap-2">
                <span className="bg-gradient-to-b from-[#D2B581] via-[#DCC391] to-[#AF8650] bg-clip-text font-baskerville text-[16px] leading-[18px] text-transparent">
                  As-Salamu-Aleikum
                </span>
                <span className="font-inter-tight text-[32px] font-semibold leading-[39px] text-[#232323]">
                  {displayName}
                </span>
              </div>
              <div className="mt-4 flex h-[80px] w-[80px] items-center justify-center rounded-full bg-[#589D96]">
                <Icon
                  className="text-white"
                  height={68}
                  icon="fluent:person-16-regular"
                  width={68}
                />
              </div>
            </div>
            {/* Personal Data */}
            <div className="flex w-full flex-col items-end gap-4">
              <span className="w-full text-center font-inter text-[20px] text-[#555]">
                Persönliche Daten
              </span>
              {/* First Name */}
              <div className="flex w-full flex-col gap-2">
                <span className="font-inter text-[16px] text-[#999]">VORNAME</span>
                <div className="flex h-10 w-full flex-row items-center justify-between rounded-xl border border-[#D4D4D4] bg-white px-4">
                  <span className="font-inter text-[15px] font-medium text-[#272727]">
                    {firstName}
                  </span>
                </div>
              </div>
              {/* Last Name */}
              <div className="flex w-full flex-col gap-2">
                <span className="font-inter text-[16px] text-[#999]">NACHNAME</span>
                <div className="flex h-10 w-full flex-row items-center justify-between rounded-xl border border-[#D4D4D4] bg-white px-4">
                  <span className="font-inter text-[15px] font-medium text-[#272727]">
                    {lastName}
                  </span>
                </div>
              </div>
              {/* Email */}
              <div className="flex w-full flex-col gap-2">
                <span className="font-inter text-[16px] text-[#999]">EMAIL</span>
                <div className="flex h-10 w-full flex-row items-center justify-between rounded-xl border border-[#D4D4D4] bg-white px-4">
                  <span className="truncate font-inter text-[15px] font-medium text-[#272727]">
                    {email}
                  </span>
                  <Icon className="text-[#000]" height={24} icon="ic:baseline-edit" width={24} />
                </div>
              </div>
              {/* Password */}
              <div className="flex w-full flex-col gap-2">
                <span className="font-inter text-[16px] text-[#999]">PASSWORT</span>
                <div className="flex h-10 w-full flex-row items-center justify-between rounded-xl border border-[#D4D4D4] bg-white px-4">
                  <span className="font-inter text-[15px] font-medium text-[#272727]">•••</span>
                  <Icon className="text-[#000]" height={24} icon="ic:baseline-edit" width={24} />
                </div>
              </div>
            </div>
            {/* Deactivate/Delete (disabled) */}
            <div className="pointer-events-none flex w-full flex-col items-end gap-4 opacity-20">
              <span className="w-full text-center font-inter text-[20px] text-[#555]">
                Deaktivieren und Löschen
              </span>
              <div className="flex w-full flex-col gap-4">
                <span className="font-inter text-[16px] text-[#999]">
                  DU BRAUCHST EINE AUSZEIT?
                </span>
                <button className="flex h-8 w-full flex-row items-center justify-center gap-2 rounded-lg bg-[#CDCDCD]">
                  <Icon height={16} icon="mynaui:save" width={16} />
                  <span className="font-inter-tight text-[16px] text-[#272727]">Bismillah</span>
                </button>
              </div>
            </div>
          </div>
          {/* Delete Account Button (fixed at bottom) */}
          <div className="absolute bottom-0 left-0 z-20 flex w-full flex-col items-center bg-white py-4">
            <span className="mb-2 font-inter text-[16px] text-[#999]">
              DU WILLST UNS VERLASSEN?
            </span>
            <button className="flex h-8 w-[345px] flex-row items-center justify-center gap-2 rounded-lg bg-[#CDCDCD]">
              <Icon height={16} icon="mynaui:save" width={16} />
              <span className="font-inter-tight text-[16px] text-[#272727]">Konto löschen</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

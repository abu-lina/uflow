'use client';

import { Icon } from '@iconify/react';
import { BrokenHeartIcon } from '@/components/ui/BrokenHeartIcon';

interface AccountDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeepAccount: () => void;
  onDeleteAccount: () => void;
  isDeleting?: boolean;
}

export function AccountDeletionModal({ 
  isOpen, 
  onClose, 
  onKeepAccount, 
  onDeleteAccount,
  isDeleting = false
}: AccountDeletionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black bg-opacity-50 pt-10">
      {/* Modal Container */}
      <div className="flex w-[392px] flex-col items-center rounded-t-[32px] bg-white p-4" style={{ gap: '12.25px' }}>
        
        {/* Close Button */}
        <div className="flex w-[360px] h-8 justify-end">
          <button
            className="flex h-8 w-8 items-center justify-center"
            onClick={onClose}
          >
            <Icon className="h-8 w-8 text-[#232323]" icon="material-symbols:close-rounded" />
          </button>
        </div>

        {/* Content Container */}
        <div className="flex w-[360px] flex-col justify-between gap-3">
          
          {/* Main Content */}
          <div className="flex w-[360px] flex-col items-center gap-8">
            
            {/* Text Content */}
            <div className="flex w-[360px] flex-col justify-center items-start gap-[10px] py-4">
              {/* Title */}
              <h2 className="w-[305px] h-[78px] font-inter-tight text-[32px] font-medium leading-[39px] text-black">
                Deine Daten. Deine Entscheidung.
              </h2>
              
              {/* Description */}
              <p className="w-[360px] font-inter text-[16px] font-light leading-[19px] text-black">
                Schade, dass du dein Konto löschen möchtest. Bitte beachte: Die Löschung ist dauerhaft – alle deine Daten werden vollständig und sicher entfernt und können nicht wiederhergestellt werden. Dein Konto ist für andere nie sichtbar, und deine Privatsphäre bleibt geschützt.
              </p>
            </div>

            {/* Broken Heart Icon */}
            <div className="flex h-[144px] w-[144px] items-center justify-center">
              <BrokenHeartIcon size={144} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mx-auto flex w-[360px] h-[92px] flex-col gap-3">
            
            {/* Keep Account Button */}
            <button
              className="flex h-10 w-[360px] min-w-[123.08px] min-h-[23.4px] items-center justify-center gap-2 rounded-[15px] bg-primary hover:bg-primary-dark active:bg-primary-darker px-0"
              style={{
                boxShadow: '0px 6.15385px 12.3077px 4.61538px rgba(0, 0, 0, 0.15), 0px 1.53846px 4.61538px rgba(0, 0, 0, 0.3)'
              }}
              onClick={onKeepAccount}
            >
              <div className="relative h-6 w-[23px]">
                <Icon className="h-6 w-[23px] text-white" icon="solar:heart-bold" />
              </div>
              <span 
                className="w-[176px] h-[31px] font-roboto text-[17.54px] font-medium leading-[31px] tracking-[0.153846px] flex items-center text-center"
                style={{
                  background: 'linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Konto geöffnet lassen
              </span>
            </button>

            {/* Delete Account Button */}
            <button
              className="flex h-10 w-[360px] min-w-[123.08px] min-h-[23.4px] items-center justify-center gap-2 rounded-[15px] bg-[#EEEEEE] px-0 disabled:opacity-50"
              disabled={isDeleting}
              style={{
                boxShadow: '0px 6.15385px 12.3077px 4.61538px rgba(0, 0, 0, 0.15), 0px 1.53846px 4.61538px rgba(0, 0, 0, 0.3)'
              }}
              onClick={onDeleteAccount}
            >
              <div className="flex h-[31px] w-[360px] items-center justify-center gap-2">
                <div className="relative h-6 w-6">
                  {isDeleting ? (
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#CDCDCD] border-t-transparent" />
                  ) : (
                    <Icon className="h-6 w-6 text-[#CDCDCD]" icon="lucide:trash-2" />
                  )}
                </div>
                <span className="w-[114px] h-[31px] font-roboto text-[17.54px] font-medium leading-[31px] text-[#CDCDCD] tracking-[0.153846px] flex items-center text-center">
                  {isDeleting ? 'Lösche...' : 'Konto löschen'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

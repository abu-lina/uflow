'use client';

import { useState } from 'react';

import { MobileFooterBar } from '@/components/shared/MobileFooterBar';
import { AuthModal } from '@/features/auth/components/AuthModal';

export function MobileLanding() {
  const [showSheet, setShowSheet] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="relative mx-auto h-[852px] w-full max-w-[393px] bg-white">
      {/* Upper Screen with Floating Images */}
      <div className="absolute left-0 top-[-85px] flex h-[657px] w-full flex-row items-end justify-center gap-2.5 p-[193px_150px_90px]">
        {/* Floating Images Grid */}
        <div className="absolute left-0 top-0 z-0 flex h-[665px] w-full flex-row items-center gap-1">
          {/* Column 1 */}
          <div className="flex h-[665px] w-1/3 flex-col items-center justify-center gap-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={`col1-${i}`}
                className="h-[219px] w-full rounded-[29.2px] border-[1.46px] border-white bg-[#D9D9D9]"
              />
            ))}
          </div>
          {/* Column 2 */}
          <div className="flex h-[665px] w-1/3 flex-col items-center justify-center gap-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={`col2-${i}`}
                className="h-[219px] w-full rounded-[29.2px] border-[1.46px] border-white bg-[#D9D9D9]"
              />
            ))}
          </div>
          {/* Column 3 */}
          <div className="flex h-[665px] w-1/3 flex-col items-center justify-center gap-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={`col3-${i}`}
                className="h-[219px] w-full rounded-[29.2px] border-[1.46px] border-white bg-[#D9D9D9]"
              />
            ))}
          </div>
        </div>

        {/* Logo */}
        <div className="z-1 relative flex h-[92px] w-[92px] items-center justify-center rounded-[92px] bg-[#589D96]">
          {/* Logo Icon */}
          <div className="absolute left-[calc(50%-24.01px)] top-[25.2px] h-[41.78px] w-[48.02px]">
            {/* Vector 22 */}
            <div className="absolute left-[21.53px] top-[28.43px] h-[12.55px] w-[17.65px] bg-[#DBF7F4] shadow-[inset_0px_0.736px_0.552px_rgba(0,0,0,0.4)]" />
            {/* Rectangle 31 */}
            <div className="absolute left-[21.53px] top-0 h-[27.29px] w-[33.55px] rounded-[24.8492px] bg-white shadow-[inset_0px_0.736px_0.736px_rgba(0,0,0,0.25)]" />
            {/* Rectangle 34 */}
            <div className="absolute left-0 top-[40.9px] h-[26.4px] w-[40.9px] rotate-[-90deg] rounded-[24.8492px] bg-gradient-to-r from-[#F1F2F2] from-[11.52%] to-[#DBF7F4] to-[99.96%] shadow-[inset_0px_0.736px_0.736px_rgba(0,0,0,0.25)]" />
            {/* Rectangle 32 */}
            <div className="absolute left-[21.53px] top-[15.7px] h-[26.08px] w-[26.51px] rounded-[24.8492px] bg-[#F1FFFF] shadow-[inset_0px_0.736px_0.736px_rgba(0,0,0,0.25)]" />
            {/* Vector 25 */}
            <div className="absolute left-[91.79px] top-[51.15px] h-[32.68px] w-[46.32px] rotate-[180deg] bg-gradient-to-r from-[#DBF7F4] from-[28.91%] to-[#589D96] to-[59.54%]" />
            {/* Vector 26 */}
            <div className="absolute left-[53.64px] top-[62.38px] h-[30.27px] w-[36.03px] bg-white/25" />
            {/* Vector 27 */}
            <div className="bg-white/17 absolute left-[61.82px] top-[54.1px] h-[30.27px] w-[36.03px] rotate-90" />
          </div>
        </div>
      </div>

      {/* Bottom Screen */}
      {showSheet && (
        <div className="absolute left-1/2 top-[502px] flex h-[350px] w-full -translate-x-1/2 flex-col items-start p-10">
          {/* Overlay */}
          <div className="absolute left-0 top-0 flex h-[350px] w-full flex-row items-start justify-end rounded-[25px] border-[1.46px] border-white bg-white p-[15px_13px]">
            {/* Close Button */}
            <button
              aria-label="Schließen"
              className="flex h-6 w-6 items-center justify-center"
              onClick={() => setShowSheet(false)}
            >
              <div className="h-[14.4px] w-[14.4px] bg-[#232323]" />
            </button>

            {/* Body Content */}
            <div className="absolute left-0 top-0 flex h-[180px] w-full max-w-[262px] flex-col items-center gap-7 p-0">
              {/* Title Section */}
              <div className="flex w-full flex-col items-center gap-[19px]">
                <h1 className="w-full max-w-[237px] text-center font-inter text-[32px] font-bold leading-[39px] text-[#232323]">
                  Von Muslimen für Muslime.
                </h1>
                <p className="w-full text-center font-inter text-sm leading-[17px] text-[#7A7A7A]">
                  Finde Angebote aus deiner Ummah und investiere in deine Ummah.
                </p>
              </div>

              {/* Sign In/Up Button */}
              <button
                className="flex h-[39px] w-full min-w-[80px] max-w-[210px] flex-row items-center justify-center rounded-2xl bg-[#BFDBD8] px-4 py-4 text-sm font-medium text-[#232323] shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_rgba(0,0,0,0.3)]"
                onClick={() => {
                  setShowSheet(false);
                  setShowAuthModal(true);
                }}
              >
                Anmelden oder Registrieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Footer Bar */}
      <div className="absolute bottom-0 left-0 right-0">
        <MobileFooterBar />
      </div>
    </div>
  );
}

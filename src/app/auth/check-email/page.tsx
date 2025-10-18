'use client';

import { useRouter } from 'next/navigation';
import { Mail, MailOpen } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';

export default function CheckEmailPage() {
  const router = useRouter();

  return (
    <div className="relative flex h-screen w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl mx-auto flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      <PageHeader 
        title="E-Mail bestätigen"
        variant="title-only"
      />

      <HeaderSpacer />

      <main className="flex flex-1 flex-col items-center justify-between px-4 mobile-nav-spacing">
        <div className="flex w-full max-w-xs sm:max-w-md md:max-w-lg flex-1 flex-col items-center gap-6 overflow-y-auto mobile-nav-spacing">
          {/* Success Message */}
          <div className="flex flex-1 flex-col items-center justify-center gap-8">
            <Mail className="w-icon-3xl h-icon-3xl text-content-title mb-4" />
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-center text-2xl font-semibold text-content-title">
                Überprüfe deine E-Mail
              </h2>
              <p className="text-center text-base text-[#7A7A7A] mb-4">
                Wir haben dir eine Bestätigungs-E-Mail gesendet. Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex w-full flex-col gap-3">
            {/* Resend Button - Secondary style, right after info message */}
            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#EEEEEE] text-sm font-medium text-content-title transition-colors hover:bg-gray-300"
              onClick={() => {
                // TODO: Implement resend functionality
                alert('Resend functionality can be implemented here');
              }}
            >
              <MailOpen className="w-icon-sm h-icon-sm" />
              E-Mail erneut senden
            </button>

            {/* Primary Login Button */}
            <button
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#589D96] text-base font-medium leading-[24px] text-white transition-colors hover:bg-[#4a8a84]"
              onClick={() => router.push('/login')}
            >
              Nach Bestätigung anmelden
            </button>

            {/* Change Email - Text Link */}
            <button
              className="text-center text-sm font-medium leading-[19px] text-content hover:text-content-title"
              onClick={() => router.push('/signup')}
            >
              Andere E-Mail verwenden
            </button>
        </div>
        </div>
      </main>
    </div>
  );
}

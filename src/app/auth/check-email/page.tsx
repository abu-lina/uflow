'use client';

import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';

export default function CheckEmailPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB] px-4">
      {/* Header */}
      <div className="flex w-full max-w-[361px] flex-col items-center py-6">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-xl font-semibold text-content-title">E-Mail bestätigen</h1>
          <div className="h-12 w-12">
            <Logo className="h-12 w-12" height={48} width={48} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex w-full max-w-[361px] flex-1 flex-col items-center gap-6 overflow-y-auto mobile-nav-spacing">
        {/* Success Message */}
        <div className="flex flex-col items-center gap-8">
          <div className="text-success text-6xl mb-4">📧</div>
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-center text-lg font-semibold leading-[39px] text-content-title">
              Überprüfe deine E-Mail
            </h2>
            <p className="text-center text-sm leading-[19px] text-[#7A7A7A] mb-4">
              Wir haben dir eine Bestätigungs-E-Mail gesendet. Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
            </p>
            
            {/* Important Notice */}
            <div className="w-full rounded-lg border border-info bg-blue-50 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-info" fill="currentColor" viewBox="0 0 20 20">
                    <path clipRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" fillRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm leading-[19px] text-info font-medium">
                    Wichtig: Du musst deine E-Mail bestätigen, bevor du dich anmelden kannst.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-4">
          <button
            className="flex h-[56px] w-full items-center justify-center rounded-[16.8px] bg-[#589D96] text-base font-medium leading-[24px] text-white transition-colors hover:bg-[#4a8a84]"
            onClick={() => router.push('/login')}
          >
            Nach Bestätigung anmelden
          </button>

          <button
            className="text-center text-sm font-medium leading-[19px] text-[#589D96] hover:text-[#4a8a84]"
            onClick={() => router.push('/signup')}
          >
            Andere E-Mail verwenden
          </button>
          
          <button
            className="text-center text-sm font-medium leading-[19px] text-info hover:text-blue-700"
            onClick={() => {
              // You could implement resend functionality here
              alert('Resend functionality can be implemented here');
            }}
          >
            Bestätigungs-E-Mail erneut senden
          </button>
        </div>
      </div>
    </div>
  );
}

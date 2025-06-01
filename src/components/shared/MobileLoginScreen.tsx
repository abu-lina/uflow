import { useState } from 'react';

import { Icon } from '@iconify/react';
import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'sonner';

import { Logo } from '@/components/ui/Logo';
import { supabase } from '@/lib/supabase/client';

interface MobileLoginScreenProps {
  onClose: () => void;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

type AuthMode = 'login' | 'signup';

export function MobileLoginScreen({ onClose }: MobileLoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'signup' && formData.password !== formData.confirmPassword) {
      toast.error('Die Passwörter stimmen nicht überein.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success('Registrierung erfolgreich. Bitte bestätige deine Email-Adresse.');
        onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success('Erfolgreich angemeldet.');
        onClose();
      }
    } catch (error) {
      const supabaseError = error as PostgrestError;
      toast.error(
        mode === 'signup'
          ? `Registrierung fehlgeschlagen: ${supabaseError.message}`
          : `Anmeldung fehlgeschlagen: ${supabaseError.message}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signup' ? 'login' : 'signup');
    setFormData({ email: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header - Fixed */}
      <div className="flex w-full flex-row items-center justify-between px-4 py-2">
        <Logo className="size-[50px]" height={50} width={50} />
        <button
          aria-label="Schließen"
          className="flex size-[50px] items-center justify-center"
          onClick={onClose}
        >
          <Icon className="size-6 text-[#232323]" icon="material-symbols:close-rounded" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-4 pb-8">
          {/* Title Section */}
          <div className="mt-8 flex w-[262px] flex-col items-center gap-2.5">
            <h1 className="text-center font-inter text-[32px] font-bold leading-[39px] text-[#232323]">
              {mode === 'signup' ? 'Willkommen bei Ummah Flow' : 'Anmelden'}
            </h1>
            <div className="flex h-[17.24px] w-[35px] items-center justify-center">
              <div className="h-[17.24px] w-[35px] rotate-180 rounded-[0.3px] border border-[#BFDBD8] bg-[#BFDBD8]" />
            </div>
            <p className="text-center font-inter text-sm leading-[17px] text-[#7A7A7A]">
              {mode === 'signup'
                ? 'Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.'
                : 'Melde dich an, um fortzufahren.'}
            </p>
          </div>

          {/* Form Section */}
          <div className="mt-[51px] flex w-[263px] flex-col items-start gap-7">
            {/* Email Input */}
            <div className="flex w-full flex-col items-center gap-1.5">
              <div className="flex w-[238px] flex-row items-center gap-5">
                <Icon
                  className="size-6 text-[#232323]"
                  icon="material-symbols-light:mail-outline"
                />
                <input
                  className="w-[194px] border-0 border-b border-[#5B5B5B] bg-transparent px-0 py-1 text-sm text-[#232323] placeholder:text-[#232323] focus:border-[#589D96] focus:ring-0"
                  placeholder="Email-Adresse"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="h-[0.5px] w-full border border-[#5B5B5B]" />
            </div>

            {/* Password Input */}
            <div className="flex w-full flex-col items-center gap-1.5">
              <div className="flex w-[238px] flex-row items-center gap-5">
                <Icon className="size-6 text-[#232323]" icon="si:lock-muted-line" />
                <input
                  className="w-[194px] border-0 border-b border-[#5B5B5B] bg-transparent px-0 py-1 text-sm text-[#232323] placeholder:text-[#232323] focus:border-[#589D96] focus:ring-0"
                  placeholder="Passwort"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="h-[0.5px] w-full border border-[#5B5B5B]" />
            </div>

            {/* Confirm Password Input - Only shown in signup mode */}
            {mode === 'signup' && (
              <div className="flex w-full flex-col items-center gap-1.5">
                <div className="flex w-[238px] flex-row items-center gap-5">
                  <Icon className="size-6 text-[#232323]" icon="si:lock-muted-line" />
                  <input
                    className="w-[194px] border-0 border-b border-[#5B5B5B] bg-transparent px-0 py-1 text-sm text-[#232323] placeholder:text-[#232323] focus:border-[#589D96] focus:ring-0"
                    placeholder="Passwort wiederholen"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
                <div className="h-[0.5px] w-full border border-[#5B5B5B]" />
              </div>
            )}

            {/* Buttons Section */}
            <div className="flex w-full flex-col items-start gap-4">
              {/* Continue Button */}
              <button
                className="flex h-10 w-full items-center justify-center rounded-[15px] bg-[#589D96] text-[17.54px] font-medium text-white shadow-[0px_6.15px_12.31px_4.62px_rgba(0,0,0,0.15),0px_1.54px_4.62px_rgba(0,0,0,0.3)]"
                disabled={isLoading}
                onClick={handleSubmit}
              >
                {isLoading
                  ? mode === 'signup'
                    ? 'Wird registriert...'
                    : 'Wird angemeldet...'
                  : mode === 'signup'
                    ? 'Registrieren'
                    : 'Anmelden'}
              </button>

              {/* Toggle Mode */}
              <button
                className="w-full text-center font-inter text-sm text-[#589D96]"
                onClick={toggleMode}
              >
                {mode === 'signup'
                  ? 'Bereits registriert? Hier anmelden'
                  : 'Noch kein Konto? Hier registrieren'}
              </button>

              {/* Or Divider */}
              <div className="w-full text-center font-inter text-[10px] font-light leading-[12px] text-[#232323]">
                oder
              </div>

              {/* SSO Buttons */}
              <div className="flex w-full flex-col gap-4">
                {/* Apple Button */}
                <button className="relative flex h-10 w-full items-center justify-center rounded-[15px] border border-[#D4D4D4]">
                  <Icon
                    className="absolute left-[21px] size-6 text-[#232323]"
                    icon="ic:baseline-apple"
                  />
                  <span className="text-[17.54px] font-medium text-[#232323]">
                    Mit Apple fortfahren
                  </span>
                </button>

                {/* Google Button */}
                <button className="relative flex h-10 w-full items-center justify-center rounded-[15px] border border-[#D4D4D4]">
                  <Icon
                    className="absolute left-[21px] size-6 text-[#232323]"
                    icon="flowbite:google-solid"
                  />
                  <span className="text-[17.54px] font-medium text-[#232323]">
                    Mit Google fortfahren
                  </span>
                </button>
              </div>

              {/* Terms - Only shown in signup mode */}
              {mode === 'signup' && (
                <p className="w-full text-center font-inter text-[8px] font-light leading-[10px] text-[#7A7A7A]">
                  Mit der Registrierung akzeptierst du unsere AGBs
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

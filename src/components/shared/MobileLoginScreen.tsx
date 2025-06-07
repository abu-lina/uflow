import { useState } from 'react';

import { Icon } from '@iconify/react';
import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'sonner';

import { Logo } from '@/components/ui/Logo';
import { Ornament } from '@/components/ui/Ornament';
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
  // Default to login mode!
  const [mode, setMode] = useState<AuthMode>('login');
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
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        if (data.session) {
          await fetch('/api/auth/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            }),
          });
        }
        toast.success('Registrierung erfolgreich. Bitte bestätige deine Email-Adresse.');
        onClose();
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        if (data.session) {
          await fetch('/api/auth/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            }),
          });
        }
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{
        background: 'linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%)',
      }}
    >
      {/* Modal */}
      <div
        className="absolute inset-x-0 bottom-0 mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[393px] flex-col rounded-t-[25px] border border-white bg-white shadow-lg sm:rounded-[25px]"
        style={{ top: 'max(env(safe-area-inset-top), 2rem)' }}
      >
        {/* Logo and Close */}
        <div className="absolute left-[19px] top-[15px] z-10 flex items-center">
          <Logo height={33} width={33} />
        </div>
        <button
          aria-label="Schließen"
          className="absolute right-[18px] top-[15px] z-10 flex h-6 w-6 items-center justify-center"
          onClick={onClose}
        >
          <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:close-rounded" />
        </button>

        {/* Content */}
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-8 pt-[92px]">
          {/* Header */}
          <div className="flex w-full max-w-[262px] flex-col items-center gap-[10px]">
            <h1 className="text-center font-inter text-[32px] font-bold leading-[39px] text-[#232323]">
              {mode === 'signup' ? 'Registriere Dich bei Ummah Flow' : 'Willkommen bei Ummah Flow'}
            </h1>
            <Ornament className="h-[17.24px] w-[35px]" variant="vector" />
            <p className="text-center font-inter text-sm leading-[17px] text-[#7A7A7A]">
              Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.
            </p>
          </div>

          {/* Form Section */}
          <form
            autoComplete="off"
            className="mt-[51px] flex w-full max-w-[263px] flex-col items-center gap-7"
            onSubmit={handleSubmit}
          >
            {/* Email Input */}
            <div className="flex w-full flex-row items-center gap-5 border-b border-[#5B5B5B] pb-1">
              <Icon className="size-6 text-[#232323]" icon="material-symbols-light:mail-outline" />
              <input
                required
                className="w-[194px] border-0 bg-transparent px-0 py-1 text-sm text-[#232323] placeholder:text-[#232323] focus:ring-0"
                placeholder="Email-Adresse"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Password Input */}
            <div className="flex w-full flex-row items-center gap-5 border-b border-[#5B5B5B] pb-1">
              <Icon className="size-6 text-[#232323]" icon="si:lock-muted-line" />
              <input
                required
                className="w-[194px] border-0 bg-transparent px-0 py-1 text-sm text-[#232323] placeholder:text-[#232323] focus:ring-0"
                placeholder="Passwort"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            {/* Confirm Password Input - Only shown in signup mode */}
            {mode === 'signup' && (
              <div className="flex w-full flex-row items-center gap-5 border-b border-[#5B5B5B] pb-1">
                <Icon className="size-6 text-[#232323]" icon="si:lock-muted-line" />
                <input
                  required
                  className="w-[194px] border-0 bg-transparent px-0 py-1 text-sm text-[#232323] placeholder:text-[#232323] focus:ring-0"
                  placeholder="Passwort wiederholen"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            )}

            {/* Buttons Section */}
            <div className="flex w-full flex-col items-start gap-4">
              {/* Continue Button */}
              <button
                className="flex h-10 w-full items-center justify-center rounded-[15px] bg-[#589D96] text-[17.54px] font-medium text-white shadow-[0px_6.15px_12.31px_4.62px_rgba(0,0,0,0.15),0px_1.54px_4.62px_rgba(0,0,0,0.3)]"
                disabled={isLoading}
                type="submit"
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
                type="button"
                onClick={toggleMode}
              >
                {mode === 'signup'
                  ? 'Bereits registriert? Hier anmelden'
                  : 'Noch kein Konto? Jetzt registrieren.'}
              </button>

              {/* Or Divider */}
              {/* <div className="w-full text-center font-inter text-[10px] font-light leading-[12px] text-[#232323]">
                oder
              </div> */}

              {/* SSO Buttons (hidden for now) */}
              {/*
              <div className="flex w-full flex-col gap-4">
                <button type="button" className="relative flex h-10 w-full items-center justify-center rounded-[15px] border border-[#D4D4D4]">
                  <Icon
                    className="absolute left-[21px] size-6 text-[#232323]"
                    icon="ic:baseline-apple"
                  />
                  <span className="text-[17.54px] font-medium text-[#232323]">
                    Mit Apple fortfahren
                  </span>
                </button>
                <button type="button" className="relative flex h-10 w-full items-center justify-center rounded-[15px] border border-[#D4D4D4]">
                  <Icon
                    className="absolute left-[21px] size-6 text-[#232323]"
                    icon="flowbite:google-solid"
                  />
                  <span className="text-[17.54px] font-medium text-[#232323]">
                    Mit Google fortfahren
                  </span>
                </button>
              </div>
              */}

              {/* Terms - Only shown in signup mode */}
              {mode === 'signup' && (
                <p className="w-full text-center font-inter text-[8px] font-light leading-[10px] text-[#7A7A7A]">
                  Mit der Registrierung akzeptierst du unsere AGBs
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

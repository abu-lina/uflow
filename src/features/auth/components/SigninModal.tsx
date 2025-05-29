'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { Logo } from '@/components/ui/Logo';
import { supabase } from '@/lib/supabase/client';

interface SigninModalProps {
  onClose: () => void;
  onSwitchMode?: () => void;
}

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

export function SigninModal({ onClose, onSwitchMode }: SigninModalProps) {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email ist erforderlich';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = 'Ungültige Email-Adresse';
    }

    if (!formData.password) {
      newErrors.password = 'Passwort ist erforderlich';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Passwort muss mindestens 6 Zeichen lang sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) {
        throw error;
      }
      // SSR session sync: set cookies
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
      toast.success('Erfolgreich angemeldet');
      onClose();
    } catch (error) {
      toast.error('Anmeldung fehlgeschlagen. Bitte überprüfe deine Eingaben.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        aria-label="Modal background, click or press Escape to close"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity"
        role="button"
        tabIndex={0}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onClose();
          }
        }}
      >
        <div
          aria-describedby="signin-description"
          aria-labelledby="signin-title"
          aria-modal="true"
          className="relative flex w-[1142px] overflow-hidden rounded-[48px] bg-white shadow-2xl transition-all"
          role="dialog"
        >
          {/* Left Section */}
          <div
            aria-hidden="true"
            className="flex h-[694px] w-1/2 flex-col items-center justify-center self-stretch rounded-l-[48px] bg-gradient-to-b from-neutral-100 to-neutral-50 p-12"
          >
            <Logo className="size-96" height={384} width={384} />
          </div>

          {/* Right Section */}
          <div className="flex h-[694px] w-1/2 flex-col justify-center rounded-tr-[48px] bg-white p-16">
            <div className="mb-8">
              <h1 className="font-inter-tight text-[40px] font-semibold leading-[1.1] text-[#232323]">
                Willkommen zurück bei
                <br />
                Ummah Flow
              </h1>
              <p className="mt-4 font-inter text-xl text-[#8C8C8C]">
                Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.
              </p>
            </div>
            <form noValidate className="flex flex-col gap-8" onSubmit={handleSubmit}>
              <input
                required
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={!!errors.email}
                className="w-full border-0 border-b border-[#E5E5E5] bg-transparent px-0 py-4 text-xl text-[#232323] placeholder:text-[#B0B0B0] focus:border-[#589D96] focus:ring-0"
                disabled={isLoading}
                id="email"
                placeholder="Email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) {
                    setErrors({ ...errors, email: undefined });
                  }
                }}
              />
              <input
                required
                aria-describedby={errors.password ? 'password-error' : undefined}
                aria-invalid={!!errors.password}
                autoComplete="current-password"
                className="w-full border-0 border-b border-[#E5E5E5] bg-transparent px-0 py-4 text-xl text-[#232323] placeholder:text-[#B0B0B0] focus:border-[#589D96] focus:ring-0"
                disabled={isLoading}
                id="password"
                placeholder="Passwort"
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) {
                    setErrors({ ...errors, password: undefined });
                  }
                }}
              />
              <button
                className="mt-4 w-full rounded-2xl bg-mint py-4 text-xl font-medium text-white"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
              </button>
            </form>
            <div className="mt-8 flex w-full items-center justify-between">
              <a
                className="font-inter-tight text-base font-light text-black underline"
                href="/forgot-password"
              >
                Passwort vergessen?
              </a>
              {onSwitchMode && (
                <button
                  className="font-inter-tight text-base font-light text-black underline"
                  onClick={onSwitchMode}
                  type="button"
                >
                  Noch kein Konto? Registrieren
                </button>
              )}
            </div>
          </div>

          {/* Close Button */}
          <button
            aria-label="Modal schließen"
            className="focus:ring-uFlowAccent absolute right-8 top-8 flex size-8 items-center justify-center rounded-full transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-offset-2"
            onClick={onClose}
          >
            <div className="bg-uFlowText size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

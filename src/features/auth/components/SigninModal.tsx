import { useState } from 'react';

import { toast } from 'sonner';

import { Logo } from '@/components/ui/Logo';
import { supabase } from '@/lib/supabase/client';

interface SigninModalProps {
  onClose: () => void;
  isAuthenticated?: boolean;
}

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

export function SigninModal({ onClose, isAuthenticated = false }: SigninModalProps) {
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
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) {
        throw error;
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
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
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
          <div className="flex h-[694px] w-1/2 flex-col items-start justify-center gap-10 self-stretch rounded-r-[48px] bg-white px-12 py-20">
            {isAuthenticated ? (
              <div className="flex w-full flex-col items-start justify-start gap-8">
                <div className="flex w-full flex-col items-center justify-center gap-2.5">
                  <div className="text-uFlowText w-full text-left font-['Inter_Tight'] text-3xl font-semibold">
                    Willkommen zurück bei Ummah Flow
                  </div>
                  <div className="text-uFlowText2 w-full text-left font-['Inter'] text-base font-normal">
                    Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.
                  </div>
                </div>

                {/* Icons for authenticated users */}
                <div className="flex w-full items-center justify-end gap-4">
                  <button
                    aria-label="Favoriten"
                    className="focus:ring-uFlowAccent flex size-10 items-center justify-center rounded-full bg-neutral-100 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                    type="button"
                  >
                    <svg
                      className="text-uFlowText size-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  </button>
                  <button
                    aria-label="Profil"
                    className="focus:ring-uFlowAccent flex size-10 items-center justify-center rounded-full bg-neutral-100 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                    type="button"
                  >
                    <svg
                      className="text-uFlowText size-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex w-full flex-col items-start justify-start gap-8">
                  <div className="flex w-full flex-col items-center justify-center gap-2.5">
                    <div className="text-uFlowText w-full text-left font-['Inter_Tight'] text-3xl font-semibold">
                      Willkommen zurück bei Ummah Flow
                    </div>
                    <div className="text-uFlowText2 w-full text-left font-['Inter'] text-base font-normal">
                      Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.
                    </div>
                  </div>
                </div>

                <form noValidate className="flex w-full flex-col gap-10" onSubmit={handleSubmit}>
                  {/* Email Field */}
                  <div className="flex w-full flex-col items-start justify-start gap-2">
                    <div className="text-uFlowDarkGrey w-full text-left font-['Inter'] text-base font-normal">
                      Email
                    </div>
                    <div className="relative w-full">
                      <input
                        required
                        aria-describedby={errors.email ? 'email-error' : undefined}
                        aria-invalid={!!errors.email}
                        className="outline-uFlowDarkGrey h-0 w-full bg-transparent outline outline-[0.5px] outline-offset-[-0.25px]"
                        disabled={isLoading}
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (errors.email) {
                            setErrors({ ...errors, email: undefined });
                          }
                        }}
                      />
                      {errors.email && (
                        <span
                          className="absolute -bottom-6 left-0 text-sm text-red-500"
                          id="email-error"
                          role="alert"
                        >
                          {errors.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="inline-flex w-full items-start justify-start gap-10">
                    <div className="inline-flex flex-1 flex-col items-start justify-start gap-2">
                      <div className="text-uFlowDarkGrey w-full text-left font-['Inter'] text-base font-normal">
                        Passwort
                      </div>
                      <div className="relative w-full">
                        <input
                          required
                          aria-describedby={errors.password ? 'password-error' : undefined}
                          aria-invalid={!!errors.password}
                          className="outline-uFlowDarkGrey h-0 w-full bg-transparent outline outline-[0.5px] outline-offset-[-0.25px]"
                          disabled={isLoading}
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => {
                            setFormData({ ...formData, password: e.target.value });
                            if (errors.password) {
                              setErrors({ ...errors, password: undefined });
                            }
                          }}
                        />
                        {errors.password && (
                          <span
                            className="absolute -bottom-6 left-0 text-sm text-red-500"
                            id="password-error"
                            role="alert"
                          >
                            {errors.password}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="bg-uFlowAccent flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl px-5">
                    <button
                      aria-busy={isLoading}
                      className="text-uFlowWhite w-full text-center font-['Inter_Tight'] text-xl font-medium"
                      disabled={isLoading}
                      type="submit"
                    >
                      {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
                    </button>
                  </div>

                  {/* Footer */}
                  <div className="w-full text-right">
                    <a
                      className="font-['Inter_Tight'] text-base font-light text-black underline"
                      href="/forgot-password"
                    >
                      Passwort vergessen?
                    </a>
                  </div>
                </form>
              </>
            )}
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

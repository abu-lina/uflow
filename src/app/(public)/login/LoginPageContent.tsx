'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { Logo } from '@/components/ui/Logo';
import EmailVerificationAlert from '@/components/ui/EmailVerificationAlert';
import { useAuth } from '@/hooks/useAuth';
import { signInWithEmailConfirmation } from '@/lib/auth';

interface FormData {
  email: string;
  password: string;
}

export function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailConfirmationError, setIsEmailConfirmationError] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl) {
        router.replace(decodeURIComponent(returnUrl));
      } else {
        router.replace('/profile');
      }
    }
  }, [user, router, searchParams]);

  // Don't render if already logged in (to prevent flash)
  if (user) {
    return null;
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signInWithEmailConfirmation(formData.email, formData.password);
      
      if (error) {
        // Handle specific error cases
        if (error.message === 'EMAIL_NOT_CONFIRMED') {
          // User exists but email is not confirmed
          setError('Bitte überprüfe deine E-Mail und bestätige deine Registrierung vor der Anmeldung.');
          setIsEmailConfirmationError(true);
          // Toast removed - inline EmailVerificationAlert provides clear feedback
        } else if (error.message === 'EMAIL_NOT_FOUND') {
          // Email doesn't exist in database
          setError('Diese E-Mail-Adresse ist nicht registriert. Bitte erstelle zuerst ein Konto.');
          setIsEmailConfirmationError(false);
          
          // Show registration prompt toast
          toast.error('Konto nicht gefunden', {
            description: 'Diese E-Mail-Adresse ist nicht registriert. Bitte registriere dich zuerst.',
            duration: 5000,
            action: {
              label: 'Registrieren',
              onClick: () => handleSignupClick()
            }
          });
        } else {
          // Invalid credentials or other errors
          setError('Ungültige E-Mail oder Passwort. Bitte versuche es erneut.');
          setIsEmailConfirmationError(false);
          
          // Show generic error toast
          toast.error('Anmeldung fehlgeschlagen', {
            description: 'Bitte überprüfe deine Anmeldedaten und versuche es erneut.',
            duration: 4000,
          });
        }
        return;
      }

      // Success - redirect
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl) {
        router.push(decodeURIComponent(returnUrl));
      } else {
        router.push('/profile');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.');
      setIsEmailConfirmationError(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupClick = () => {
    const returnUrl = searchParams.get('returnUrl');
    if (returnUrl) {
      router.push(`/signup?returnUrl=${encodeURIComponent(returnUrl)}`);
    } else {
      router.push('/signup');
    }
  };

  const handleResendConfirmation = async () => {
    if (!formData.email) {
      setError('Bitte gib zuerst deine E-Mail-Adresse ein.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Send resend confirmation email
      const response = await fetch('/api/send-auth-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formData.email,
          type: 'confirmSignup',
          language: 'en', // You can detect this from browser language
          confirmationUrl: `${window.location.origin}/auth/confirm?token=${formData.email}&type=signup&email=${encodeURIComponent(formData.email)}`,
        }),
      });

      if (response.ok) {
        setError('Bestätigungs-E-Mail gesendet! Bitte überprüfe deinen Posteingang.');
        setIsEmailConfirmationError(false);
        
        // Show success toast
        toast.success('E-Mail gesendet', {
          description: 'Eine neue Bestätigungs-E-Mail wurde an deine E-Mail-Adresse gesendet.',
          duration: 4000,
        });
      } else {
        setError('Bestätigungs-E-Mail konnte nicht gesendet werden. Bitte versuche es erneut.');
        
        // Show error toast
        toast.error('E-Mail konnte nicht gesendet werden', {
          description: 'Bitte versuche es erneut oder kontaktiere den Support.',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Resend confirmation error:', error);
      setError('Bestätigungs-E-Mail konnte nicht gesendet werden. Bitte versuche es erneut.');
      
      // Show error toast
      toast.error('Fehler aufgetreten', {
        description: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.',
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB] px-4">
      {/* Header */}
      <div className="flex w-full max-w-[361px] flex-col items-center py-6">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-xl font-semibold text-content-title">Login</h1>
          <div className="h-12 w-12">
            <Logo className="h-12 w-12" height={48} width={48} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex w-full max-w-[361px] flex-1 flex-col items-center gap-6 overflow-y-auto mobile-nav-spacing">
        {/* Title Section */}
        <div className="flex flex-col items-center gap-8">
          {/* Welcome Title */}
          <div className="flex flex-col items-start pl-3">
            <h2 className="text-left text-lg font-semibold leading-[39px] text-content-title">
              Willkommen bei Ummah Flow
            </h2>
            <p className="text-left text-sm leading-[19px] text-[#7A7A7A]">
              Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.
            </p>
          </div>
        </div>

        {/* Form */}
        <form className="flex w-full flex-col" onSubmit={handleSubmit}>
          {/* Form Fields */}
          <div className="flex w-full flex-col gap-3">
            {/* Email Field */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-[#999999]">
                E-Mail
              </label>
              <input
                required
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                placeholder="Email eingeben"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex h-[56px] w-full items-center justify-between rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-[#999999]">
                Passwort
              </label>
              <input
                required
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                placeholder="Passwort eingeben"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
            </div>
            
            {/* Eye Toggle Icon */}
            <button
              className="flex h-6 w-6 items-center justify-center text-[#232323] hover:text-gray-700"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          </div>

          {/* Error Messages */}
          {error && isEmailConfirmationError && (
            <div className="mt-4">
              <EmailVerificationAlert
                message={error}
                onResend={handleResendConfirmation}
              />
            </div>
          )}
          
          {error && !isEmailConfirmationError && (
            <div className="mt-4 rounded-2xl border border-border bg-red-50 p-4 shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-danger" fill="currentColor" viewBox="0 0 20 20">
                    <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" fillRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="font-inter-tight text-sm leading-[19px] text-danger">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-4 pt-8">
            {/* Login Button */}
            <button
              className="flex h-[56px] w-full items-center justify-center rounded-[16.8px] bg-[#589D96] text-base font-medium leading-[24px] text-white transition-colors hover:bg-[#4a8a84] disabled:opacity-50"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? 'Anmelden...' : 'Anmelden'}
            </button>

            {/* Register Link */}
            <button
              className="text-center text-base font-medium leading-[19px] text-[#589D96] hover:text-[#4a8a84]"
              type="button"
              onClick={handleSignupClick}
            >
              Noch kein Konto? Jetzt registrieren.
            </button>

            {/* Terms */}
            <p className="text-center text-[11px] leading-[13px] text-[#7A7A7A]">
              Wenn du fortfährst, erstellst du ein Konto und stimmst den Allgemeinen Geschäftsbedingungen und Datenschutzrichtlinien zu.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { Logo } from '@/components/ui/Logo';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { AuthTitleSection } from '@/components/layout/AuthTitleSection';
import { AuthFormSection } from '@/components/layout/AuthFormSection';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { signUpWithLanguage } from '@/lib/auth';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

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

  // Don't render if already logged in or redirecting (to prevent flash)
  if (user || isRedirecting) {
    return null;
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.email) {
      return false;
    }
    if (formData.password.length < 6) {
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error(
        language === 'de' 
          ? 'Bitte überprüfen Sie Ihre Eingaben' 
          : 'Please check your inputs'
      );
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUpWithLanguage(formData.email, formData.password, language);
      
      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }
      
      // Set redirecting state immediately to hide content BEFORE showing toast
      setIsRedirecting(true);
      
      // Show success message
      toast.success(
        language === 'de' 
          ? 'Registrierung erfolgreich! Bitte überprüfe deine E-Mail.' 
          : 'Signup successful! Please check your email.'
      );
      
      // Use window.location for instant, guaranteed redirect without Next.js router complexity
      window.location.href = '/auth/check-email';
      // Don't reset isLoading here - we're redirecting
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(
        language === 'de' 
          ? 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.' 
          : 'An error occurred. Please try again.'
      );
      setIsLoading(false);
    }
  };

  const handleLoginClick = () => {
    const returnUrl = searchParams.get('returnUrl');
    if (returnUrl) {
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    } else {
      router.push('/login');
    }
  };

  return (
    <PageLayout>
      {/* Loading Overlay - Prevents flash during redirect */}
      {isRedirecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#589D96]"></div>
            <p className="text-sm text-[#7A7A7A]">Weiterleitung...</p>
          </div>
        </div>
      )}
      
      <PageHeader 
        rightIcon={<Logo className="h-12 w-12" height={48} width={48} />}
        title="Registrieren"
        variant="title-and-icon"
      />

      <HeaderSpacer />

      <PageContentWrapper>
        <AuthTitleSection maxWidth="max-w-[361px]">
          <h2 className="text-left text-lg font-semibold leading-[39px] text-content-title">
            Willkommen bei Ummah Flow
          </h2>
          <p className="text-left text-sm leading-[19px] text-[#7A7A7A]">
            Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.
          </p>
        </AuthTitleSection>

        <AuthFormSection>
          <form className="flex w-full flex-col" onSubmit={handleSubmit}>
          {/* Form Fields */}
          <div className="flex w-full flex-col gap-3">
            {/* Email Field */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white py-2">
            <div className="flex w-full flex-col gap-1 px-3">
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
          <div className="flex h-[56px] w-full items-center justify-between rounded-2xl border border-[#D4D4D4] bg-white py-2">
            <div className="flex w-full flex-col gap-1 px-3">
              <label className="text-xs leading-[15px] text-[#999999]">
                Passwort
              </label>
              <input
                required
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                placeholder="Mindestens 6 Zeichen"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
            </div>
            
            {/* Eye Toggle Icon */}
            <div className="px-3">
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

          {/* Confirm Password Field */}
          <div className="flex h-[56px] w-full items-center justify-between rounded-2xl border border-[#D4D4D4] bg-white py-2">
            <div className="flex w-full flex-col gap-1 px-3">
              <label className="text-xs leading-[15px] text-[#999999]">
                Passwort bestätigen
              </label>
              <input
                required
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                placeholder="Passwort wiederholen"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              />
            </div>
            
            {/* Eye Toggle Icon */}
            <div className="px-3">
              <button
                className="flex h-6 w-6 items-center justify-center text-[#232323] hover:text-gray-700"
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-4 pt-8">
            {/* Register Button */}
            <button
              className="flex h-[56px] w-full items-center justify-center rounded-[16.8px] bg-[#589D96] text-base font-medium leading-[24px] text-white transition-colors hover:bg-[#4a8a84] disabled:opacity-50"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? 'Registrieren...' : 'Registrieren'}
            </button>

            {/* Login Link */}
            <button
              className="text-center text-base font-medium leading-[19px] text-[#589D96] hover:text-[#4a8a84]"
              type="button"
              onClick={handleLoginClick}
            >
              Bereits ein Konto? Jetzt anmelden.
            </button>

            {/* Terms */}
            <p className="text-center text-[11px] leading-[13px] text-[#7A7A7A]">
              Wenn du fortfährst, erstellst du ein Konto und stimmst den Allgemeinen Geschäftsbedingungen und Datenschutzrichtlinien zu.
            </p>
          </div>
          </form>
        </AuthFormSection>
      </PageContentWrapper>
    </PageLayout>
  );
}

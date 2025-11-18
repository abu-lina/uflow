'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

import { Logo } from '@/components/ui/Logo';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { TitleSection } from '@/components/layout/TitleSection';
import { ContentSection } from '@/components/layout/ContentSection';
import { TitleAndText } from '@/components/ui/TitleAndText';
import { FormInput } from '@/components/ui/FormInput';
import { FormInputGroup } from '@/components/ui/FormInputGroup';
import { Button } from '@/components/ui/Button';
import { LinkButton } from '@/components/ui/LinkButton';
import { useAuth } from '@/providers/auth-provider';
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
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

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

  const validateForm = () => {
    if (!formData.email) {
      setError('Bitte gib deine E-Mail-Adresse ein.');
      return false;
    }
    
    // Enhanced password validation
    if (formData.password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return false;
    }
    
    // Check for at least one letter
    if (!/[a-zA-Z]/.test(formData.password)) {
      setError('Das Passwort muss mindestens einen Buchstaben enthalten.');
      return false;
    }
    
    // Check for at least one number
    if (!/\d/.test(formData.password)) {
      setError('Das Passwort muss mindestens eine Zahl enthalten.');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein.');
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get honeypot value from form
      const form = e.target as HTMLFormElement;
      const honeypotInput = form.querySelector('input[name="website"]') as HTMLInputElement;
      const honeypot = honeypotInput?.value || '';
      
      const { data, error } = await signUpWithLanguage(
        formData.email, 
        formData.password, 
        language,
        honeypot
      );
      
      if (error) {
        setError(error.message || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
        setIsLoading(false);
        return;
      }
      
      // Success - redirect only if we have valid data
      if (data) {
        // Set redirecting state immediately to hide content
        setIsRedirecting(true);
        
        // Toast removed - user will see the check-email page with proper messaging
        
        // Redirect to check email page
        window.location.href = '/signup/check-email';
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.');
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
    <ScrollablePageLayout>
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

      <PageContent maxWidth="361px" paddingBottom="pb-12">
        <div className="flex w-full flex-col">
          {/* Title + Paragraph with proper spacing */}
          <TitleSection className="mb-6 sm:mb-8">
            <TitleAndText
              description="Entdecke muslimische Angebote in deiner Nähe insha'Allah."
              title="Willkommen bei Ummah Flow"
            />
          </TitleSection>

          {/* Form Content with exact spacing structure */}
          <ContentSection>
            <form className="flex w-full flex-col" onSubmit={handleSubmit}>
              {/* Honeypot field - hidden from users */}
              <input
                aria-hidden="true"
                autoComplete="off"
                name="website"
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  width: '1px',
                  height: '1px',
                  overflow: 'hidden',
                }}
                tabIndex={-1}
                type="text"
              />
              
              {/* Form Input Fields */}
              <FormInputGroup gap="gap-3">
                <FormInput
                  required
                  label="E-Mail"
                  placeholder="Email eingeben"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
                <FormInput
                  required
                  label="Passwort"
                  placeholder="Mindestens 8 Zeichen, Buchstabe und Zahl"
                  rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  variant="with-icon"
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onRightIconClick={() => setShowPassword(!showPassword)}
                />
                <FormInput
                  required
                  label="Passwort bestätigen"
                  placeholder="Passwort wiederholen"
                  rightIcon={showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  variant="with-icon"
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              </FormInputGroup>

              {/* Error Messages */}
              {error && (
                <div className="mt-4">
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
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
                </div>
              )}

              {/* Button and links with proper spacing (24px gap from form fields) */}
              <div className="mt-6 flex flex-col space-y-3">
                {/* Main Button */}
                <Button
                  fullWidth
                  loading={isLoading}
                  loadingText="Registrieren..."
                  type="submit"
                  variant="auth"
                >
                  Registrieren
                </Button>

                {/* Link Button (12px gap from main button via space-y-3) */}
                <LinkButton
                  type="button"
                  onClick={handleLoginClick}
                >
                  Bereits ein Konto? Jetzt anmelden.
                </LinkButton>

                {/* AGB Text (12px gap from link button via space-y-3) */}
                <p className="text-center text-[11px] leading-[13px] text-[#7A7A7A]">
                  Wenn du fortfährst, erstellst du ein Konto und stimmst den Allgemeinen Geschäftsbedingungen und Datenschutzrichtlinien zu.
                </p>
              </div>
            </form>
          </ContentSection>
        </div>
      </PageContent>
    </ScrollablePageLayout>
  );
}

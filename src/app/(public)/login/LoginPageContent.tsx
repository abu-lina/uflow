'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import EmailVerificationAlert from '@/components/ui/EmailVerificationAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { TitleSection } from '@/components/layout/TitleSection';
import { ContentSection } from '@/components/layout/ContentSection';
import { TitleAndText, FormInput, FormInputGroup, Button, LinkButton } from '@/components/ui';
import { Logo } from '@/components/ui/Logo';
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

  // Don't render if already logged in (to prevent flash)
  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await signInWithEmailConfirmation(formData.email, formData.password);
      
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
          
          // Toast removed - inline error message provides clear feedback
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

      // Success - redirect only if we have valid data
      if (data) {
        const returnUrl = searchParams.get('returnUrl');
        if (returnUrl) {
          router.push(decodeURIComponent(returnUrl));
        } else {
          router.push('/profile');
        }
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
    <PageLayout hasBackground={false}>
      <PageHeader 
        rightIcon={<Logo className="h-12 w-12" height={48} width={48} />}
        title="Login"
        variant="title-and-icon"
      />

      <HeaderSpacer />

      <PageContentWrapper centerVertically={true} contentClassName="gap-10">
        {/* Title + Paragraph with proper spacing */}
        <TitleSection>
          <TitleAndText
            description="Entdecke muslimische Angebote in deiner Nähe insha'Allah."
            title="Willkommen bei Ummah Flow"
          />
        </TitleSection>

        {/* Form Content with exact spacing structure */}
        <div className="flex w-full flex-col">
          <ContentSection>
          <form className="flex w-full flex-col" onSubmit={handleSubmit}>
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
                placeholder="Passwort eingeben"
                rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                variant="with-icon"
                onChange={(e) => handleInputChange('password', e.target.value)}
                onRightIconClick={() => setShowPassword(!showPassword)}
              />
            </FormInputGroup>

            {/* Error Messages */}
            {error && (
              <div className="mt-4">
                {isEmailConfirmationError ? (
                  <EmailVerificationAlert
                    message={error}
                    onResend={handleResendConfirmation}
                  />
                ) : (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-danger" />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="font-inter-tight text-sm leading-[19px] text-danger">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Button and links with proper spacing (24px gap from form fields) */}
            <div className="mt-6 flex flex-col space-y-3">
              {/* Main Button */}
              <Button
                fullWidth
                loading={isLoading}
                loadingText="Anmelden..."
                type="submit"
                variant="auth"
              >
                Anmelden
              </Button>

              {/* Link Button (12px gap from main button via space-y-3) */}
              <LinkButton
                type="button"
                onClick={handleSignupClick}
              >
                Noch kein Konto? Jetzt registrieren.
              </LinkButton>
            </div>
          </form>
          </ContentSection>
        </div>
      </PageContentWrapper>
    </PageLayout>
  );
}

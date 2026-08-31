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
import { TitleAndText } from '@/components/ui/TitleAndText';
import { FormInput } from '@/components/ui/FormInput';
import { FormInputGroup } from '@/components/ui/FormInputGroup';
import { Button } from '@/components/ui/Button';
import { LinkButton } from '@/components/ui/LinkButton';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/providers/auth-provider';
import { signInWithEmailConfirmation } from '@/lib/auth';
import { useLanguage } from '@/providers/LanguageProvider';

interface FormData {
  email: string;
  password: string;
}

export function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();
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

      // Success path intentionally does not navigate here.
      // Navigation is driven by the user-based useEffect after auth state commits.
      if (data) {
        return;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(t('login.unexpectedError'));
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
      setError(t('login.enterEmailFirst'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate a secure confirmation token on the server
      const tokenResponse = await fetch('/api/generate-confirmation-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          type: 'signup',
        }),
      });

      if (!tokenResponse.ok) {
        setError(t('login.confirmationEmailFailed'));
        toast.error(t('login.emailFailedToast'), {
          description: t('login.emailFailedDescription'),
          duration: 4000,
        });
        return;
      }

      const { token } = await tokenResponse.json();
      const siteUrl = (typeof window !== 'undefined' ? window.location.origin : '') || process.env.NEXT_PUBLIC_SITE_URL || '';
      const confirmationUrl = `${siteUrl}/auth/confirm?token=${token}&email=${encodeURIComponent(formData.email)}`;

      // Send confirmation email via server (keeps keys server-side)
      const emailResponse = await fetch('/api/send-auth-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formData.email,
          type: 'confirmSignup',
          language: 'en', // You can detect this from browser language
          confirmationUrl,
        }),
      });

      if (emailResponse.ok) {
        setError(t('login.confirmationEmailSent'));
        setIsEmailConfirmationError(false);
        
        // Show success toast
        toast.success(t('login.emailSentToast'), {
          description: t('login.emailSentDescription'),
          duration: 4000,
        });
      } else {
        setError(t('login.confirmationEmailFailed'));
        
        // Show error toast
        toast.error(t('login.emailFailedToast'), {
          description: t('login.emailFailedDescription'),
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Resend confirmation error:', error);
      setError(t('login.confirmationEmailFailed'));
      
      // Show error toast
      toast.error(t('login.errorOccurredToast'), {
        description: t('login.errorOccurredDescription'),
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
        title={t('login.title')}
        variant="title-and-icon"
      />

      <HeaderSpacer />

      <PageContentWrapper centerVertically={true} contentClassName="gap-10">
        {/* Title + Paragraph with proper spacing */}
        <TitleSection>
          <TitleAndText
            description={t('login.welcomeDescription')}
            title={t('login.welcomeTitle')}
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
                label={t('login.emailLabel')}
                placeholder={t('login.emailPlaceholder')}
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
              <FormInput
                required
                label={t('login.passwordLabel')}
                placeholder={t('login.passwordPlaceholder')}
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
                loadingText={t('login.loginButtonLoading')}
                type="submit"
                variant="auth"
              >
                {t('login.loginButton')}
              </Button>

              {/* Forgot Password Link */}
              <div className="text-center">
                <LinkButton
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                >
                  {t('login.forgotPassword')}
                </LinkButton>
              </div>

              {/* Link Button (12px gap from main button via space-y-3) */}
              <LinkButton
                type="button"
                onClick={handleSignupClick}
              >
                {t('login.noAccount')}
              </LinkButton>
            </div>
          </form>
          </ContentSection>
        </div>
      </PageContentWrapper>
    </PageLayout>
  );
}

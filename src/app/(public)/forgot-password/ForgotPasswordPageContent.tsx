'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { TitleSection } from '@/components/layout/TitleSection';
import { ContentSection } from '@/components/layout/ContentSection';
import { TitleAndText, FormInput, Button, LinkButton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { resetPasswordWithLanguage } from '@/lib/auth';

export function ForgotPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    
    if (!email) {
      setError(language === 'de' ? 'Bitte gib deine E-Mail-Adresse ein.' : 'Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await resetPasswordWithLanguage(email, language);
      
      if (error) {
        setError(error.message || (language === 'de' ? 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.' : 'An error occurred. Please try again.'));
        setIsLoading(false);
        return;
      }
      
      // Success
      setIsSuccess(true);
      setIsLoading(false);
      
      // Show success toast
      toast.success(
        language === 'de' ? 'E-Mail gesendet' : 'Email sent',
        {
          description: language === 'de' 
            ? 'Eine Passwort-Zurücksetzungs-E-Mail wurde an deine E-Mail-Adresse gesendet.'
            : 'A password reset email has been sent to your email address.',
          duration: 5000,
        }
      );
    } catch (error) {
      console.error('Password reset error:', error);
      setError(language === 'de' ? 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.' : 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    const returnUrl = searchParams.get('returnUrl');
    if (returnUrl) {
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    } else {
      router.push('/login');
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      setError(language === 'de' ? 'Bitte gib deine E-Mail-Adresse ein.' : 'Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await resetPasswordWithLanguage(email, language);
      
      if (error) {
        setError(error.message || (language === 'de' ? 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.' : 'An error occurred. Please try again.'));
        setIsLoading(false);
        return;
      }
      
      // Show success toast
      toast.success(
        language === 'de' ? 'E-Mail erneut gesendet' : 'Email resent',
        {
          description: language === 'de' 
            ? 'Eine neue Passwort-Zurücksetzungs-E-Mail wurde gesendet.'
            : 'A new password reset email has been sent.',
          duration: 4000,
        }
      );
    } catch (error) {
      console.error('Resend password reset error:', error);
      setError(language === 'de' ? 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.' : 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <PageLayout hasBackground={false}>
      <PageHeader
        title={language === 'de' ? 'Passwort vergessen' : 'Forgot password'}
        variant="back-and-title"
        onBack={handleBackToLogin}
      />
      
      <HeaderSpacer />
      
      <PageContentWrapper centerVertically={true} contentClassName="gap-10" includeMobileNavSpacing={true}>
        {/* Title + Paragraph with proper spacing */}
        <TitleSection>
          <TitleAndText
            description={language === 'de' 
              ? 'Kein Problem! Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen deines Passworts.'
              : 'No problem! Enter your email address and we\'ll send you a link to reset your password.'
            }
            title={language === 'de' ? 'Passwort vergessen?' : 'Forgot your password?'}
          />
        </TitleSection>

        {/* Form Content with exact spacing structure */}
        <div className="flex w-full flex-col">
          <ContentSection>
            {!isSuccess ? (
              <form className="flex w-full flex-col" onSubmit={handleSubmit}>
                {/* Email Input */}
                <div className="mb-6">
                  <FormInput
                    required
                    label={language === 'de' ? 'E-Mail-Adresse' : 'Email Address'}
                    placeholder={language === 'de' ? 'deine@email.com' : 'your@email.com'}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Error Messages */}
                {error && (
                  <div className="mb-6">
                    <div className="rounded-2xl border border-danger/20 bg-danger/10 p-4 shadow-sm">
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
                  </div>
                )}

                {/* Submit Button */}
                <div className="mb-4">
                  <Button
                    fullWidth
                    loading={isLoading}
                    loadingText={language === 'de' ? 'E-Mail wird gesendet...' : 'Sending email...'}
                    type="submit"
                    variant="auth"
                  >
                    {language === 'de' ? 'Passwort zurücksetzen' : 'Reset password'}
                  </Button>
                </div>

                {/* Back to Login Link */}
                <div className="text-center">
                  <LinkButton
                    type="button"
                    onClick={handleBackToLogin}
                  >
                    {language === 'de' ? 'Zurück zur Anmeldung' : 'Back to login'}
                  </LinkButton>
                </div>
              </form>
            ) : (
              <div className="flex w-full flex-col items-center text-center">
                {/* Success Icon */}
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>

                {/* Success Message */}
                <div className="mb-8">
                  <h2 className="mb-3 text-xl font-semibold text-content-title">
                    {language === 'de' ? 'E-Mail gesendet!' : 'Email sent!'}
                  </h2>
                  <p className="text-content text-base leading-6">
                    {language === 'de' 
                      ? 'Wir haben dir eine E-Mail mit einem Link zum Zurücksetzen deines Passworts gesendet. Bitte überprüfe deinen Posteingang und folge den Anweisungen.'
                      : 'We\'ve sent you an email with a link to reset your password. Please check your inbox and follow the instructions.'
                    }
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex w-full flex-col gap-3">
                  <Button
                    fullWidth
                    loading={isLoading}
                    loadingText={language === 'de' ? 'Wird gesendet...' : 'Sending...'}
                    variant="auth"
                    onClick={handleResendEmail}
                  >
                    <Mail className="h-5 w-5" />
                    {language === 'de' ? 'E-Mail erneut senden' : 'Resend email'}
                  </Button>

                  <LinkButton
                    type="button"
                    onClick={handleBackToLogin}
                  >
                    {language === 'de' ? 'Zurück zur Anmeldung' : 'Back to login'}
                  </LinkButton>
                </div>

                {/* Help Text */}
                <div className="mt-6 rounded-2xl border border-border bg-grey-light/50 p-4">
                  <p className="text-sm text-content">
                    {language === 'de' 
                      ? 'E-Mail nicht erhalten? Überprüfe auch deinen Spam-Ordner oder versuche es in ein paar Minuten erneut.'
                      : 'Didn\'t receive the email? Check your spam folder or try again in a few minutes.'
                    }
                  </p>
                </div>
              </div>
            )}
          </ContentSection>
        </div>
      </PageContentWrapper>
    </PageLayout>
  );
}

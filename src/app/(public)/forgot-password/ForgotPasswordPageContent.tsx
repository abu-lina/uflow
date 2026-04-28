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
import { TitleAndText } from '@/components/ui/TitleAndText';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';
import { LinkButton } from '@/components/ui/LinkButton';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { resetPasswordWithLanguage } from '@/lib/auth';

export function ForgotPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapForgotPasswordError = (errorMessage?: string | null) => {
    if (errorMessage === 'EMAIL_NOT_FOUND') {
      return t('forgotPassword.emailNotFound');
    }

    return t('forgotPassword.genericError');
  };

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

  useEffect(() => {
    const prefillEmail = searchParams.get('email');
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
  }, [searchParams]);

  // Don't render if already logged in (to prevent flash)
  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError(t('forgotPassword.emailRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await resetPasswordWithLanguage(email, language);
      
      if (error) {
        setError(mapForgotPasswordError(error.message));
        setIsLoading(false);
        return;
      }
      
      // Success
      setIsSuccess(true);
      setIsLoading(false);
      
      // Show success toast
      toast.success(
        t('forgotPassword.emailSentToastTitle'),
        {
          description: t('forgotPassword.emailSentToastDescription'),
          duration: 5000,
        }
      );
    } catch (error) {
      console.error('Password reset error:', error);
      setError(t('forgotPassword.genericError'));
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
      setError(t('forgotPassword.emailRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await resetPasswordWithLanguage(email, language);
      
      if (error) {
        setError(mapForgotPasswordError(error.message));
        setIsLoading(false);
        return;
      }
      
      // Show success toast
      toast.success(
        t('forgotPassword.emailResentToastTitle'),
        {
          description: t('forgotPassword.emailResentToastDescription'),
          duration: 4000,
        }
      );
    } catch (error) {
      console.error('Resend password reset error:', error);
      setError(t('forgotPassword.genericError'));
      setIsLoading(false);
    }
  };

  return (
    <PageLayout hasBackground={false}>
      <PageHeader
        title={t('forgotPassword.pageTitle')}
        variant="back-and-title"
        onBack={handleBackToLogin}
      />
      
      <HeaderSpacer />
      
      <PageContentWrapper centerVertically={true} contentClassName="gap-10" includeMobileNavSpacing={true}>
        {/* Title + Paragraph with proper spacing */}
        <TitleSection>
          <TitleAndText
            description={t('forgotPassword.heroDescription')}
            title={t('forgotPassword.heroTitle')}
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
                    label={t('forgotPassword.emailLabel')}
                    placeholder={t('forgotPassword.emailPlaceholder')}
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
                    loadingText={t('forgotPassword.submitLoading')}
                    type="submit"
                    variant="auth"
                  >
                    {t('forgotPassword.submit')}
                  </Button>
                </div>

                {/* Back to Login Link */}
                <div className="text-center">
                  <LinkButton
                    type="button"
                    onClick={handleBackToLogin}
                  >
                    {t('forgotPassword.backToLogin')}
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
                  <h2 className="mb-3 text-xl font-semibold text-content-heading">
                    {t('forgotPassword.successTitle')}
                  </h2>
                  <p className="text-content text-base leading-6">
                    {t('forgotPassword.successDescription')}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex w-full flex-col gap-3">
                  <Button
                    fullWidth
                    loading={isLoading}
                    loadingText={t('forgotPassword.resendLoading')}
                    variant="auth"
                    onClick={handleResendEmail}
                  >
                    <Mail className="h-5 w-5" />
                    {t('forgotPassword.resend')}
                  </Button>

                  <LinkButton
                    type="button"
                    onClick={handleBackToLogin}
                  >
                    {t('forgotPassword.backToLogin')}
                  </LinkButton>
                </div>

                {/* Help Text */}
                <div className="mt-6 rounded-2xl border border-border bg-neutral-light/50 p-4">
                  <p className="text-sm text-content">
                    {t('forgotPassword.helpText')}
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
